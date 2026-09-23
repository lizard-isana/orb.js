'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { test } = require('../helpers/harness.js');

const ROOT = path.join(__dirname, '..', '..');
const PACKAGE_NAME = '@lizard-isana/orb';
const STRUCTURED_SUBPATHS = [
  './time',
  './frames',
  './geodesy',
  './kepler',
  './events',
  './models/earth-epv00',
  './observer',
  './sgp4',
  './vocab'
];
const VSOP_BODIES = [
  'earth',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune'
];

function runNode(consumer, args) {
  const result = childProcess.spawnSync(process.execPath, args, {
    cwd: consumer,
    encoding: 'utf8'
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

test('package: metadata and local CommonJS entry are stable', () => {
  const metadata = require('../../package.json');
  const Orb = require('../..');
  assert.strictEqual(metadata.name, PACKAGE_NAME);
  assert.strictEqual(metadata.engines.node, '>=18');
  assert.strictEqual(typeof Orb.Time, 'function');
  assert.strictEqual(typeof Orb.Kepler, 'function');
  assert.strictEqual(typeof Orb.SGP4, 'function');
  assert.strictEqual(typeof Orb.Observation, 'function');
  assert.strictEqual(Orb.Instant, undefined);
  assert.strictEqual(Orb.makeState, undefined);
  assert.strictEqual(Orb.createObserver, undefined);
  assert.strictEqual(Orb.createSatellite, undefined);
});

test('package: exact tarball supports legacy entries and optional model subpaths', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-package-test-'));
  const npmCache = path.join(temporary, 'npm-cache');
  const npmEnvironment = {
    ...process.env,
    NPM_CONFIG_CACHE: npmCache,
    npm_config_cache: npmCache
  };

  try {
    const metadata = require('../../package.json');
    const packed = JSON.parse(childProcess.execFileSync(
      'npm',
      ['pack', '--json', '--pack-destination', temporary],
      { cwd: ROOT, encoding: 'utf8', env: npmEnvironment }
    ))[0];
    const files = new Set(packed.files.map(({ path: filename }) => filename));

    assert.strictEqual(packed.id, PACKAGE_NAME + '@' + metadata.version);
    assert.deepStrictEqual(
      STRUCTURED_SUBPATHS.filter((subpath) => metadata.exports[subpath] == undefined),
      [],
      'every structured subpath must be exported'
    );
    assert.ok(files.has('dist/orb.js'));
    assert.ok(files.has('dist/orb.min.js'));
    assert.ok(files.has('dist/orb.esm.js'));
    assert.ok(files.has('dist/orb.esm.mjs'));
    assert.ok(files.has('src/vsop87a/package.json'));
    assert.ok(files.has('src/package.json'));
    assert.ok(files.has('src/time/index.js'));
    assert.ok(files.has('src/frames/index.js'));
    assert.ok(files.has('src/geodesy/index.js'));
    assert.ok(files.has('src/kepler/index.js'));
    assert.ok(files.has('src/events/index.js'));
    assert.ok(files.has('src/models/earth-epv00/index.js'));
    assert.ok(files.has('src/models/earth-epv00/LICENSE-ERFA'));
    assert.ok(files.has('src/observer/index.js'));
    assert.ok(files.has('src/sgp4/index.js'));
    assert.ok(files.has('src/vocab/index.js'));
    assert.ok(files.has('readme.md'));
    assert.ok(files.has('usage.en.md'));
    assert.ok(files.has('usage.ja.md'));
    assert.ok(files.has('migration-v2-to-v3.1.en.md'));
    assert.ok(files.has('migration-v2-to-v3.1.ja.md'));
    assert.ok(![...files].some((filename) => filename.startsWith('test/')));
    assert.ok(![...files].some((filename) => filename.startsWith('.ai/')));
    assert.ok(![...files].some((filename) => filename.startsWith('tools/')));
    assert.ok(![...files].some((filename) => filename.startsWith('src/data/')));
    assert.ok(![...files].some((filename) => filename.startsWith('old/')));
    assert.ok(![...files].some((filename) => filename.startsWith('.github/')));
    assert.ok(![...files].some((filename) => filename.endsWith('.DS_Store')));
    for (const subpath of STRUCTURED_SUBPATHS) {
      assert.ok(
        files.has(metadata.exports[subpath].import.replace(/^\.\//, '')),
        subpath + ' target must be present in the tarball'
      );
    }

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

    assert.strictEqual(
      runNode(consumer, ['-e', `const Orb=require('${PACKAGE_NAME}'); console.log(typeof Orb.Time)`]),
      'function'
    );
    assert.strictEqual(
      runNode(consumer, ['-e', `const metadata=require('${PACKAGE_NAME}/package.json'); console.log(metadata.name)`]),
      PACKAGE_NAME
    );
    assert.strictEqual(
      runNode(consumer, ['-e', `const Orb=require('${PACKAGE_NAME}/dist/orb.min.js'); console.log(typeof Orb.Time)`]),
      'function'
    );
    assert.strictEqual(
      runNode(consumer, ['-e', `Object.freeze(Math); require('${PACKAGE_NAME}'); console.log('ok')`]),
      'ok'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `import * as Orb from '${PACKAGE_NAME}'; console.log(typeof Orb.Time)`
      ]),
      'function'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `import { SATURN_FULL_COEF } from '${PACKAGE_NAME}/vsop87a/saturn'; console.log(Array.isArray(SATURN_FULL_COEF))`
      ]),
      'true'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `const bodies=${JSON.stringify(VSOP_BODIES)}; const modules=await Promise.all(bodies.map((body)=>import('${PACKAGE_NAME}/vsop87a/'+body+'.js'))); console.log(modules.every((module)=>Object.values(module).some(Array.isArray)))`
      ]),
      'true'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `import { Constant } from '${PACKAGE_NAME}/src/orb-core.js'; console.log(Constant.AU)`
      ]),
      '149597870.7'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `import { HORIZON_CONSTANTS, satellitePasses } from '${PACKAGE_NAME}/events'; console.log(HORIZON_CONSTANTS.geometricCenter, typeof satellitePasses)`
      ]),
      '0 function'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `import { GM, propagateKepler } from '${PACKAGE_NAME}/kepler'; console.log(propagateKepler([7000,0,0],[0,7.5,0],0,GM.earth).r[0])`
      ]),
      '7000'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `import { earthEpv00 } from '${PACKAGE_NAME}/models/earth-epv00'; import { Instant } from '${PACKAGE_NAME}/time'; console.log(earthEpv00.state(Instant.fromISO('2026-07-18T00:00:00Z')).frame)`
      ]),
      'equatorial-j2000'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `import { createObserver, OBSERVER_DEFAULTS } from '${PACKAGE_NAME}/observer'; console.log(typeof createObserver, OBSERVER_DEFAULTS.lightTime)`
      ]),
      'function false'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `import { createSatellite, parseTle } from '${PACKAGE_NAME}/sgp4'; console.log(typeof createSatellite, typeof parseTle)`
      ]),
      'function function'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `import { Instant } from '${PACKAGE_NAME}/time'; console.log(Instant.fromISO('2000-01-01T12:00:00Z').jd('utc'))`
      ]),
      '2451545'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `import { makeState } from '${PACKAGE_NAME}/frames'; import { Instant } from '${PACKAGE_NAME}/time'; console.log(makeState({t:Instant.fromUnixMs(0),frame:'ecef',center:'earth',r:[1,2,3]}).r.constructor.name)`
      ]),
      'Float64Array'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `import { geodeticToEcef } from '${PACKAGE_NAME}/geodesy'; console.log(geodeticToEcef({latitude:0,longitude:0})[0])`
      ]),
      '6378.137'
    );
    assert.strictEqual(
      runNode(consumer, [
        '--input-type=module',
        '-e',
        `import { isFrame } from '${PACKAGE_NAME}/vocab'; console.log(isFrame('teme'))`
      ]),
      'true'
    );

    const umdPath = path.join(consumer, 'node_modules', '@lizard-isana', 'orb', 'dist', 'orb.min.js');
    const umdSource = fs.readFileSync(umdPath, 'utf8');
    assert.ok(Buffer.byteLength(umdSource) < 750000, 'default minified bundle unexpectedly enlarged');
    const browserContext = {};
    assert.ok(!umdSource.includes('earthEpv00'));
    assert.ok(!umdSource.includes('erfa-epv00'));
    assert.ok(!umdSource.includes('OBSERVER_DEFAULTS'));
    assert.ok(!umdSource.includes('satellitePasses'));
    vm.runInNewContext(umdSource, browserContext, { filename: umdPath });
    assert.strictEqual(typeof browserContext.Orb.Time, 'function');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
