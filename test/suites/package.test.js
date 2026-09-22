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
});

test('package: exact tarball supports CJS, ESM, UMD, and full VSOP subpaths', () => {
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
    assert.ok(files.has('dist/orb.js'));
    assert.ok(files.has('dist/orb.min.js'));
    assert.ok(files.has('dist/orb.esm.js'));
    assert.ok(files.has('dist/orb.esm.mjs'));
    assert.ok(files.has('src/vsop87a/package.json'));
    assert.ok(![...files].some((filename) => filename.startsWith('test/')));
    assert.ok(![...files].some((filename) => filename.startsWith('.ai/')));
    assert.ok(![...files].some((filename) => filename.startsWith('tools/')));
    assert.ok(![...files].some((filename) => filename.startsWith('src/data/')));

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

    const umdPath = path.join(consumer, 'node_modules', '@lizard-isana', 'orb', 'dist', 'orb.min.js');
    const browserContext = {};
    vm.runInNewContext(fs.readFileSync(umdPath, 'utf8'), browserContext, { filename: umdPath });
    assert.strictEqual(typeof browserContext.Orb.Time, 'function');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
