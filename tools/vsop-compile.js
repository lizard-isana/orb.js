#!/usr/bin/env node
// vsop-compile.js — compile ephemeris coefficient tables into per-body
// Float64Array modules under src/bodies/data/.
//
// Sources:
//  - VSOP87A (Bretagnon & Francou 1988): the original distribution
//    files from CDS catalogue VI/81, vendored gzipped under
//    tools/data/vsop87/ so the build is reproducible from primary data.
//  - The Meeus ch. 47 lunar tables: extracted from src/orb-luna.js,
//    which reproduces Meeus example 47.a exactly.
//
// For each planet the emitted module is a TRUNCATED series: terms are
// dropped smallest-first while the accumulated angular error seen from
// Earth stays below TARGET_ARCSEC. The truncation is SELF-VALIDATED at
// compile time by evaluating truncated vs full coordinates across
// 1500-2500 AD — the compiler refuses to write data that violates its
// own tolerance. Run with --full to also emit vsop87a-<planet>.full.js
// (not committed; for consumers who want the complete series).
//
// The Earth is deliberately absent: bodies/earth.js uses the ERFA epv00
// series (DE405 fit, milliarcsecond class).
//
// Usage: node tools/vsop-compile.js [--full]

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(__dirname, 'data', 'vsop87');
const OUT_DIR = path.join(ROOT, 'src', 'bodies', 'data');

const TARGET_ARCSEC = 0.1;
const ARCSEC_RAD = Math.PI / 180 / 3600;

const PLANETS = {
  mercury: 'mer', venus: 'ven', mars: 'mar', jupiter: 'jup',
  saturn: 'sat', uranus: 'ura', neptune: 'nep'
};

// Minimum geocentric distance (au): converts an in-space displacement
// into the worst-case angle an Earth observer could see.
const MIN_GEO_DIST = {
  mercury: 0.52, venus: 0.26, mars: 0.37,
  jupiter: 3.9, saturn: 8.0, uranus: 17.3, neptune: 28.8
};

// t-span used for truncation weighting and validation:
// |t| <= 0.5 thousand Julian years covers 1500-2500 AD.
const T_MAX = 0.5;

// Parse an original VSOP87A distribution file into
// comp[variable 0..2][power 0..5] = [[A, B, C], ...].
const parseVsop87 = (gzPath) => {
  const text = zlib.gunzipSync(fs.readFileSync(gzPath)).toString('latin1');
  const comp = [[], [], []];
  let block = null;
  for (const line of text.split('\n')) {
    const header = line.match(/VSOP87 VERSION A\d+\s+\S+\s+VARIABLE (\d) \(XYZ\)\s+\*T\*\*(\d)\s+(\d+) TERMS/);
    if (header) {
      const variable = Number(header[1]) - 1;
      const power = Number(header[2]);
      block = [];
      comp[variable][power] = block;
      continue;
    }
    if (!block || line.trim() === '') continue;
    // record: integer arguments followed by S, K, A, B, C — take the
    // last three floats (amplitude au, phase rad, frequency rad/millennium)
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 5) continue;
    const a = Number(tokens[tokens.length - 3]);
    const b = Number(tokens[tokens.length - 2]);
    const c = Number(tokens[tokens.length - 1]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) {
      throw new Error('unparsable record in ' + gzPath + ': ' + line);
    }
    block.push([a, b, c]);
  }
  // sanity: X and Y must exist with a T^0 block of hundreds of terms
  if (!comp[0][0] || !comp[1][0] || comp[0][0].length < 100) {
    throw new Error('parse failure for ' + gzPath);
  }
  for (const axis of comp) {
    for (const blk of axis) {
      if (blk) blk.sort((u, v) => Math.abs(v[0]) - Math.abs(u[0]));
    }
  }
  return comp;
};

// Truncate: drop the smallest effective amplitudes (|A| * T_MAX^power)
// while the sum of everything dropped stays below the tolerance in au.
const truncate = (comp, tolAu) => {
  const all = [];
  comp.forEach((axis, n) => axis.forEach((block, p) => {
    if (block) block.forEach((term, i) => {
      all.push({ n, p, i, eff: Math.abs(term[0]) * Math.pow(T_MAX, p) });
    });
  }));
  all.sort((a, b) => a.eff - b.eff);
  const dropped = new Set();
  let budget = tolAu;
  for (const item of all) {
    if (item.eff > budget) break;
    budget -= item.eff;
    dropped.add(item.n + ':' + item.p + ':' + item.i);
  }
  return comp.map((axis, n) => axis.map((block, p) =>
    block ? block.filter((_, i) => !dropped.has(n + ':' + p + ':' + i)) : block
  ));
};

const countTerms = (comp) =>
  comp.reduce((s, axis) => s + axis.reduce((t, b) => t + (b ? b.length : 0), 0), 0);

const evalComp = (comp, t) => comp.map((axis) => {
  let pos = 0;
  axis.forEach((block, p) => {
    if (!block) return;
    let sum = 0;
    for (const [a, b, c] of block) sum += a * Math.cos(b + c * t);
    pos += Math.pow(t, p) * sum;
  });
  return pos;
});

// Compile-time self-check: the truncated series must stay within the
// advertised tolerance of the full one across the validity span.
const validateTruncation = (name, full, short, tolAu) => {
  let worst = 0;
  for (let i = 0; i <= 40; i++) {
    const t = -T_MAX + (2 * T_MAX * i) / 40;
    const a = evalComp(full, t);
    const b = evalComp(short, t);
    const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    if (d > worst) worst = d;
  }
  if (worst > tolAu) {
    throw new Error(`${name}: truncation validation failed: ` +
      `${(worst / ARCSEC_RAD / MIN_GEO_DIST[name]).toFixed(3)}" > ${TARGET_ARCSEC}"`);
  }
  return worst;
};

const renderModule = (name, comp, note) => {
  const axes = ['X', 'Y', 'Z'];
  let out = `// vsop87a data for ${name} — GENERATED by tools/vsop-compile.js; do not edit.\n` +
    `// Source: VSOP87A, Bretagnon & Francou (1988), CDS VI/81 original files.\n` +
    `// ${note}\n` +
    `// Layout per axis: array indexed by power of t, each entry a flat\n` +
    `// Float64Array of [A, B, C] triples for  t^power * A*cos(B + C*t),\n` +
    `// t in thousands of Julian years (TT) from J2000, A in au.\n`;
  comp.forEach((axis, i) => {
    out += `export const ${axes[i]} = [\n`;
    axis.forEach((block) => {
      const flat = block ? block.flat() : [];
      out += `  new Float64Array([${flat.map(String).join(', ')}]),\n`;
    });
    out += '];\n';
  });
  return out;
};

const extractLunaTables = () => {
  const text = fs.readFileSync(path.join(ROOT, 'src', 'orb-luna.js'), 'utf8');
  const grab = (key) => {
    const m = text.match(new RegExp(key + ':\\s*\\[([\\s\\S]*?)\\n  \\]'));
    if (!m) throw new Error('luna table ' + key + ' not found');
    return m[1].match(/\[[^\]]+\]/g).map((row) => JSON.parse(row));
  };
  return { LR: grab('LR'), B: grab('B') };
};

const main = () => {
  const emitFull = process.argv.includes('--full');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = [];
  for (const [name, code] of Object.entries(PLANETS)) {
    const full = parseVsop87(path.join(SRC_DIR, `VSOP87A.${code}.gz`));
    const tolAu = TARGET_ARCSEC * ARCSEC_RAD * MIN_GEO_DIST[name];
    const short = truncate(full, tolAu);
    const worst = validateTruncation(name, full, short, tolAu);
    fs.writeFileSync(path.join(OUT_DIR, `vsop87a-${name}.js`),
      renderModule(name, short,
        `Truncated: ${countTerms(short)}/${countTerms(full)} terms; validated ` +
        `truncation error < ${TARGET_ARCSEC}" seen from Earth (1500-2500 AD).`));
    if (emitFull) {
      fs.writeFileSync(path.join(OUT_DIR, `vsop87a-${name}.full.js`),
        renderModule(name, full, `Full series: ${countTerms(full)} terms.`));
    }
    report.push(`${name}: ${countTerms(short)}/${countTerms(full)} terms, ` +
      `worst truncation ${(worst / ARCSEC_RAD / MIN_GEO_DIST[name]).toFixed(4)}"`);
  }

  const luna = extractLunaTables();
  let lunaOut = `// Meeus ch. 47 lunar periodic terms — GENERATED by tools/vsop-compile.js\n` +
    `// from src/orb-luna.js; do not edit. Reference: Meeus,\n` +
    `// Astronomical Algorithms 2nd ed., tables 47.a / 47.b.\n` +
    `// LR rows: [D, M, M', F, sin-coeff for longitude (1e-6 deg),\n` +
    `//           cos-coeff for distance (1e-3 km)]\n` +
    `// B rows:  [D, M, M', F, sin-coeff for latitude (1e-6 deg)]\n`;
  lunaOut += `export const LR = [\n${luna.LR.map((r) => `  [${r.join(', ')}],`).join('\n')}\n];\n`;
  lunaOut += `export const B = [\n${luna.B.map((r) => `  [${r.join(', ')}],`).join('\n')}\n];\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'moon-meeus.js'), lunaOut);
  report.push(`moon: LR ${luna.LR.length} rows, B ${luna.B.length} rows`);

  console.log(report.join('\n'));
};

try {
  main();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
