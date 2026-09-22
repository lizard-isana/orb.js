'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const path = require('path');
const { test } = require('../helpers/harness.js');

const ROOT = path.join(__dirname, '..', '..');

test('VSOP87A full modules are reproducible from checksummed primary data', () => {
  const result = childProcess.spawnSync(
    process.execPath,
    ['tools/vsop-compile.mjs', '--check'],
    { cwd: ROOT, encoding: 'utf8' }
  );
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /generated modules verified/);
});
