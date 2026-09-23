import assert from 'assert';
import childProcess from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACKAGE_NAME = '@lizard-isana/orb';
const DOCS = [
  'readme.md',
  'usage.en.md',
  'usage.ja.md',
  'migration-v2-to-v3.1.en.md',
  'migration-v2-to-v3.1.ja.md'
];
const SUBPATHS = [
  '/time',
  '/frames',
  '/geodesy',
  '/vocab',
  '/kepler',
  '/models/earth-epv00',
  '/observer',
  '/events',
  '/sgp4'
];
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function runNode(consumer, args) {
  const result = childProcess.spawnSync(process.execPath, args, {
    cwd: consumer,
    encoding: 'utf8'
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

test('public Markdown links resolve locally', () => {
  for (const filename of DOCS) {
    const source = fs.readFileSync(path.join(ROOT, filename), 'utf8');
    const links = source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g);
    for (const [, target] of links) {
      if (/^(?:https?:|mailto:|#)/.test(target)) continue;
      const pathname = target.split('#')[0];
      assert.ok(
        fs.existsSync(path.resolve(ROOT, path.dirname(filename), pathname)),
        `${filename}: missing local link ${target}`
      );
    }
  }
});

test('English and Japanese guides publish the same structured surface', () => {
  const english = fs.readFileSync(path.join(ROOT, 'usage.en.md'), 'utf8');
  const japanese = fs.readFileSync(path.join(ROOT, 'usage.ja.md'), 'utf8');
  for (const subpath of SUBPATHS) {
    assert.ok(english.includes(`@lizard-isana/orb${subpath}`), `English guide omits ${subpath}`);
    assert.ok(japanese.includes(`@lizard-isana/orb${subpath}`), `Japanese guide omits ${subpath}`);
  }
  for (const token of [
    "frameModel: 'iau2006-2000b'",
    'lightTime: false',
    'aberration: false',
    'refraction: false',
    'meta: false',
    'WGS-72',
    'WGS-84',
    'B*',
    'not-computed'
  ]) {
    assert.ok(english.includes(token), `English guide omits ${token}`);
    assert.ok(japanese.includes(token), `Japanese guide omits ${token}`);
  }
});

test('v2 migration guides preserve the staged migration contract', () => {
  for (const filename of ['migration-v2-to-v3.1.en.md', 'migration-v2-to-v3.1.ja.md']) {
    const source = fs.readFileSync(path.join(ROOT, filename), 'utf8');
    assert.ok(source.includes('v2.4.1'));
    assert.ok(source.includes("require('@lizard-isana/orb')"));
    assert.ok(source.includes('@lizard-isana/orb/observer'));
    assert.ok(source.includes('NutationAndObliquity'));
    assert.ok(source.includes('validateChecksum'));
  }
});

test('documented examples execute against the exact tarball', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-docs-test-'));
  const npmCache = path.join(temporary, 'npm-cache');
  const npmEnvironment = {
    ...process.env,
    NPM_CONFIG_CACHE: npmCache,
    npm_config_cache: npmCache
  };

  try {
    const packed = JSON.parse(childProcess.execFileSync(
      'npm',
      ['pack', '--json', '--pack-destination', temporary],
      { cwd: ROOT, encoding: 'utf8', env: npmEnvironment }
    ))[0];
    const files = new Set(packed.files.map(({ path: filename }) => filename));
    for (const filename of DOCS) assert.ok(files.has(filename), `${filename} is absent from tarball`);

    const consumer = path.join(temporary, 'consumer');
    fs.mkdirSync(consumer);
    fs.writeFileSync(
      path.join(consumer, 'package.json'),
      JSON.stringify({ private: true, type: 'module' })
    );
    childProcess.execFileSync(
      'npm',
      ['install', path.join(temporary, packed.filename), '--ignore-scripts', '--no-audit', '--no-fund'],
      { cwd: consumer, encoding: 'utf8', env: npmEnvironment }
    );

    assert.strictEqual(runNode(consumer, ['-e', `
      const Orb = require('${PACKAGE_NAME}');
      const date = new Date('2026-07-18T12:00:00Z');
      const mars = new Orb.Mars().radec(date);
      const moon = new Orb.Observation({
        observer: { latitude: 35.658, longitude: 139.741, altitude: 0.025 },
        target: new Orb.Luna()
      }).azel(date);
      if (!Number.isFinite(mars.ra) || !Number.isFinite(moon.elevation)) throw new Error('legacy example failed');
      console.log('legacy-ok');
    `]), 'legacy-ok');

    assert.strictEqual(runNode(consumer, ['--input-type=module', '-e', `
      import { Instant } from '${PACKAGE_NAME}/time';
      import { createObserver, OBSERVER_DEFAULTS } from '${PACKAGE_NAME}/observer';
      import { sunEpv00 } from '${PACKAGE_NAME}/models/earth-epv00';
      import { HORIZON_CONSTANTS, riseSetTransit } from '${PACKAGE_NAME}/events';
      const instant = Instant.fromISO('2026-07-18T12:00:00Z');
      const site = createObserver({
        latitude: 35.658 * Math.PI / 180,
        longitude: 139.741 * Math.PI / 180,
        height: 0.025
      });
      const geometric = site.observe(sunEpv00, instant);
      const corrected = site.observe(sunEpv00, instant, {
        lightTime: true,
        aberration: true,
        refraction: { pressure: 1010, temperature: 10 },
        meta: true
      });
      const events = riseSetTransit(
        site,
        sunEpv00,
        Instant.fromISO('2026-07-17T15:00:00Z'),
        Instant.fromISO('2026-07-18T15:00:00Z'),
        { semidiameter: HORIZON_CONSTANTS.meanSolarSemidiameter }
      );
      if (!Number.isFinite(geometric.azimuth) || !corrected.meta || events.length !== 3) {
        throw new Error('observer/event example failed');
      }
      if (OBSERVER_DEFAULTS.lightTime !== false || OBSERVER_DEFAULTS.refraction !== false) {
        throw new Error('documented observer defaults changed');
      }
      console.log('observer-ok');
    `]), 'observer-ok');

    assert.strictEqual(runNode(consumer, ['--input-type=module', '-e', `
      import { Instant } from '${PACKAGE_NAME}/time';
      import { makeState, transform } from '${PACKAGE_NAME}/frames';
      import { geodeticToEcef } from '${PACKAGE_NAME}/geodesy';
      import { GM, propagateKepler } from '${PACKAGE_NAME}/kepler';
      import { isFrame } from '${PACKAGE_NAME}/vocab';
      const instant = Instant.fromISO('2026-07-18T12:00:00Z');
      const state = makeState({t: instant, frame: 'equatorial-j2000', center: 'earth', r: [7000,0,0], v: [0,7.5,1]});
      const ofDate = transform(state, {frame: 'equatorial-of-date'});
      const next = propagateKepler([7000,0,0], [0,7.5,1], 600, GM.earth);
      if (ofDate.frame !== 'equatorial-of-date' || next.r.length !== 3 || !isFrame('teme')) throw new Error('core example failed');
      if (geodeticToEcef({latitude: 0, longitude: 0})[0] !== 6378.137) throw new Error('geodesy example failed');
      console.log('core-ok');
    `]), 'core-ok');

    assert.strictEqual(runNode(consumer, ['--input-type=module', '-e', `
      import { Instant } from '${PACKAGE_NAME}/time';
      import { createSatellite } from '${PACKAGE_NAME}/sgp4';
      const satellite = createSatellite({
        line1: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
        line2: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
      });
      const instant = Instant.fromISO('2020-01-14T12:37:54Z');
      if (satellite.state(instant).frame !== 'teme' || satellite.geodetic(instant).frame !== 'geodetic-wgs84') {
        throw new Error('SGP4 example failed');
      }
      console.log('sgp4-ok');
    `]), 'sgp4-ok');

    assert.strictEqual(runNode(consumer, ['--input-type=module', '-e', `
      import * as Orb from '${PACKAGE_NAME}';
      import { MARS_FULL_COEF } from '${PACKAGE_NAME}/vsop87a/mars';
      Orb.registerVSOP87A('Mars', MARS_FULL_COEF);
      const position = new Orb.Mars({vsop87a: 'full'}).xyz(new Date('2026-07-18T12:00:00Z'));
      if (!Number.isFinite(position.x)) throw new Error('full VSOP example failed');
      console.log('vsop-ok');
    `]), 'vsop-ok');

    const umdPath = path.join(
      consumer,
      'node_modules',
      '@lizard-isana',
      'orb',
      'dist',
      'orb.js'
    );
    const context = {};
    vm.runInNewContext(fs.readFileSync(umdPath, 'utf8'), context, { filename: umdPath });
    assert.strictEqual(typeof context.Orb.Luna, 'function');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

let failures = 0;
for (const { name, run } of tests) {
  try {
    await run();
    console.log(`ok - M7 docs ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`NG - M7 docs ${name}: ${error.stack ?? error.message}`);
  }
}

if (failures > 0) {
  console.error(`${failures} of ${tests.length} M7 documentation test(s) failed`);
  process.exitCode = 1;
} else {
  console.log('all M7 documentation tests passed');
}
