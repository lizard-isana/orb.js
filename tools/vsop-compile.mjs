#!/usr/bin/env node
// Compile and verify v3 optional-full VSOP87A modules from the original
// CDS VI/81 distribution files. The legacy short tables are measured against
// the full series, but are deliberately not rewritten by this M0 tool.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(TOOL_DIR);
const INPUT_DIR = path.join(TOOL_DIR, 'data', 'vsop87');
const OUTPUT_DIR = path.join(ROOT, 'src', 'vsop87a');
const LEGACY_SHORT_PATH = path.join(ROOT, 'src', 'orb-vsop87a.js');
const AU_KM = 149597870.7;
const T_MIN = -0.5;
const T_MAX = 0.5;
const SAMPLE_COUNT = 101;

const BODIES = [
  ['earth', 'ear', 3538, 'edd7cc0a3d5360a0caa2f745fb900d4a30890e877ab4af7d0ecb44364c293b99'],
  ['mercury', 'mer', 6359, 'c059fd9b971e3a520f6e3b2c5e0cde12a78051db83f0194df615e6011ffdef68'],
  ['venus', 'ven', 2357, 'deb4585c8aa7f2e5febfdad9979bd829b3d37edfd72439cde55202f444b39958'],
  ['mars', 'mar', 7073, 'c7a486654ea2522a739e96efd7840e75557c32302e11135d0a6b1d12a2004252'],
  ['jupiter', 'jup', 4434, '2b78c2f6866a69cb985ea671a14624be983794797d7e786212194e9fa3add44e'],
  ['saturn', 'sat', 7512, '025add41f14303b503212801a63c304dcdd27b4467cec8022981d5b26e8236f1'],
  ['uranus', 'ura', 5289, '541cc0e38ad7c670b4bbd38964af79b1a07cd36346c8de86a690ed6037cc8e2e'],
  ['neptune', 'nep', 2636, 'aa7e008b262d3670b14503a3dd9678ee03b560e448c0cdd24a10783b79bbcbab']
];

function parseArguments(args) {
  if (args.length === 0 || (args.length === 1 && args[0] === '--check')) return 'check';
  if (args.length === 1 && args[0] === '--write') return 'write';
  throw new Error('usage: node tools/vsop-compile.mjs [--check|--write]');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Return v3's grouped representation: [axis, power, [A, B, C, ...]].
function parseVsop87(inputPath) {
  const compressed = fs.readFileSync(inputPath);
  const text = zlib.gunzipSync(compressed).toString('latin1');
  const groups = [];
  let current = null;

  for (const line of text.split('\n')) {
    const header = line.match(
      /VSOP87 VERSION A\d+\s+\S+\s+VARIABLE (\d) \(XYZ\)\s+\*T\*\*(\d)\s+(\d+) TERMS/
    );
    if (header) {
      current = [Number(header[1]) - 1, Number(header[2]), []];
      groups.push(current);
      continue;
    }
    if (!current || line.trim() === '') continue;

    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 5) continue;
    const term = tokens.slice(-3).map(Number);
    if (!term.every(Number.isFinite)) {
      throw new Error(`unparsable coefficient in ${inputPath}: ${line}`);
    }
    current[2].push(...term);
  }

  if (groups.length < 3 || groups.some((group) => group[2].length === 0)) {
    throw new Error(`no complete VSOP87A groups found in ${inputPath}`);
  }
  for (const group of groups) {
    const terms = [];
    for (let index = 0; index < group[2].length; index += 3) {
      terms.push(group[2].slice(index, index + 3));
    }
    terms.sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]));
    group[2] = terms.flat();
  }
  return { compressed, groups };
}

function countTerms(groups) {
  return groups.reduce((total, group) => total + group[2].length / 3, 0);
}

function renderModule(name, groups) {
  const symbol = name.toUpperCase() + '_FULL_COEF';
  return `export const ${symbol}=${JSON.stringify(groups)};export default ${symbol};\n`;
}

function parseLegacyShortTables() {
  const source = fs.readFileSync(LEGACY_SHORT_PATH, 'utf8');
  const tables = new Map();
  const pattern = /export const ([A-Z]+)_COEF = (\[[\s\S]*?\])(?=\n\n\/\/|$)/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    tables.set(match[1].toLowerCase(), JSON.parse(match[2]));
  }
  if (tables.size !== BODIES.length) {
    throw new Error(`expected ${BODIES.length} legacy short tables, found ${tables.size}`);
  }
  return tables;
}

function fullTermGroups(groups) {
  const terms = new Map();
  for (const [axis, power, values] of groups) {
    const key = `${axis}:${power}`;
    const block = [];
    for (let index = 0; index < values.length; index += 3) {
      block.push([values[index], values[index + 1], values[index + 2]]);
    }
    terms.set(key, block);
  }
  return terms;
}

function verifyLegacySubset(name, short, full) {
  const terms = fullTermGroups(full);
  for (const row of short) {
    if (!Array.isArray(row) || row.length !== 5 || !row.every(Number.isFinite)) {
      throw new Error(`${name}: malformed legacy short coefficient`);
    }
    const [axis, power, amplitude, phase, frequency] = row;
    const closeAmplitude = (a, b) => Math.abs(a - b) <= Math.max(5e-16, Math.abs(b) * 5e-11);
    const closeArgument = (a, b) => Math.abs(a - b) <= Math.max(5e-11, Math.abs(b) * 5e-13);
    const found = (terms.get(`${axis}:${power}`) || []).some(([a, b, c]) =>
      closeAmplitude(amplitude, a) && closeArgument(phase, b) && closeArgument(frequency, c)
    );
    if (!found) {
      throw new Error(`${name}: legacy short coefficient is absent from the official full series`);
    }
  }
}

function evaluateGrouped(groups, t) {
  const position = [0, 0, 0];
  for (const [axis, power, values] of groups) {
    const factor = Math.pow(t, power);
    for (let index = 0; index < values.length; index += 3) {
      position[axis] += factor * values[index]
        * Math.cos(values[index + 1] + values[index + 2] * t);
    }
  }
  return position;
}

function evaluateLegacy(rows, t) {
  const position = [0, 0, 0];
  for (const [axis, power, amplitude, phase, frequency] of rows) {
    position[axis] += Math.pow(t, power) * amplitude * Math.cos(phase + frequency * t);
  }
  return position;
}

function worstSampledDisplacement(short, full) {
  let worstAu = 0;
  let worstT = 0;
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const t = T_MIN + (T_MAX - T_MIN) * index / (SAMPLE_COUNT - 1);
    const a = evaluateLegacy(short, t);
    const b = evaluateGrouped(full, t);
    const distance = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    if (distance > worstAu) {
      worstAu = distance;
      worstT = t;
    }
  }
  return { worstAu, worstT };
}

async function verifyCommittedModule(name, expectedGroups, expectedSource, mode) {
  const outputPath = path.join(OUTPUT_DIR, `${name}.js`);
  if (mode === 'write') {
    fs.writeFileSync(outputPath, expectedSource);
  }

  const actualSource = fs.readFileSync(outputPath, 'utf8');
  if (actualSource !== expectedSource) {
    let index = 0;
    while (index < actualSource.length && actualSource[index] === expectedSource[index]) index += 1;
    const actual = JSON.stringify(actualSource.slice(index, index + 60));
    const expected = JSON.stringify(expectedSource.slice(index, index + 60));
    throw new Error(
      `${name}: ${outputPath} is not the deterministic output at byte ${index}; `
      + `expected ${expected}, found ${actual}; run npm run vsop:write`
    );
  }

  const moduleUrl = pathToFileURL(outputPath);
  moduleUrl.searchParams.set('verify', String(Date.now()));
  const module = await import(moduleUrl.href);
  const symbol = name.toUpperCase() + '_FULL_COEF';
  if (JSON.stringify(module[symbol]) !== JSON.stringify(expectedGroups)) {
    throw new Error(`${name}: generated module export does not match its source data`);
  }
}

async function main() {
  const mode = parseArguments(process.argv.slice(2));
  const legacyTables = parseLegacyShortTables();
  const report = [];

  for (const [name, code, expectedTerms, expectedHash] of BODIES) {
    const inputPath = path.join(INPUT_DIR, `VSOP87A.${code}.gz`);
    const { compressed, groups } = parseVsop87(inputPath);
    const actualHash = sha256(compressed);
    if (actualHash !== expectedHash) {
      throw new Error(`${name}: input checksum ${actualHash} does not match ${expectedHash}`);
    }

    const termCount = countTerms(groups);
    if (termCount !== expectedTerms) {
      throw new Error(`${name}: expected ${expectedTerms} terms, parsed ${termCount}`);
    }

    const short = legacyTables.get(name);
    verifyLegacySubset(name, short, groups);
    await verifyCommittedModule(name, groups, renderModule(name, groups), mode);
    const { worstAu, worstT } = worstSampledDisplacement(short, groups);
    report.push(
      `${name.padEnd(8)} full ${String(termCount).padStart(4)} terms; `
      + `legacy ${String(short.length).padStart(4)}; `
      + `worst sampled delta ${worstAu.toExponential(3)} au `
      + `(${(worstAu * AU_KM).toFixed(1)} km) at t=${worstT.toFixed(2)}`
    );
  }

  console.log(`VSOP87A ${mode}: checksums, term counts, and generated modules verified`);
  console.log('sample interval: 1500–2500, 101 evenly spaced epochs');
  console.log(report.join('\n'));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
