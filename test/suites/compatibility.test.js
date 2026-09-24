'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Orb = require('../../dist/orb.js');
const Preflight = require('../../dist/orb-compat.js');
const { test } = require('../helpers/harness.js');

const ROOT = path.join(__dirname, '..', '..');

function environmentWith(overrides) {
  const environment = Object.create(globalThis);
  for (const [key, value] of Object.entries(overrides)) environment[key] = value;
  return environment;
}

test('compatibility: current runtime passes the documented built-in checks', () => {
  const report = Preflight.checkCompatibility();
  assert.strictEqual(report.supported, true);
  assert.strictEqual(report.scope, 'runtime-builtins');
  assert.strictEqual(report.syntaxChecked, false);
  assert.deepStrictEqual(report.missing, []);
  assert.deepStrictEqual(report.failed, []);
  assert.ok(report.checked.includes('Array.prototype.at'));
  assert.ok(report.checked.includes('Math.atanh'));
  assert.strictEqual(Orb.BROWSER_BASELINE, Preflight.BROWSER_BASELINE);
  assert.strictEqual(Orb.checkCompatibility().supported, true);
});

test('compatibility: missing and broken built-ins are reported without throwing', () => {
  const mathWithoutHypot = Object.create(Math);
  mathWithoutHypot.hypot = undefined;
  const missing = Preflight.checkCompatibility(environmentWith({ Math: mathWithoutHypot }));
  assert.strictEqual(missing.supported, false);
  assert.ok(missing.missing.includes('Math.hypot'));
  assert.deepStrictEqual(missing.failed, []);

  function BrokenMap() {
    throw new Error('Map is present but unusable');
  }
  const broken = Preflight.checkCompatibility(environmentWith({ Map: BrokenMap }));
  assert.strictEqual(broken.supported, false);
  assert.ok(broken.failed.includes('Map'));
  assert.ok(broken.message.includes('Map'));
});

test('compatibility: standalone preflight uses classic syntax and runs before Orb', () => {
  for (const basename of ['orb-compat.js', 'orb-compat.min.js']) {
    const filename = path.join(ROOT, 'dist', basename);
    const source = fs.readFileSync(filename, 'utf8');
    assert.ok(!/\b(?:const|let|class)\b|=>|\?\?|\?\./.test(source), basename);

    const browserContext = {};
    vm.runInNewContext(source, browserContext, { filename });
    assert.strictEqual(typeof browserContext.OrbCompatibility.checkCompatibility, 'function');
    assert.strictEqual(browserContext.Orb, undefined);
    assert.strictEqual(browserContext.OrbCompatibility.checkCompatibility().supported, true);
  }
});
