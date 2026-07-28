// Shared-vocabulary test suite. Run with: node test/v4/vocab.mjs
//
// vocab.js is the single source of truth for the tokens that label every
// quantity, unit, frame, center, correction and source in the library.
// These tests keep it internally consistent AND enforce that the rest of
// the code never uses a word the vocabulary does not know — the same
// no-drift discipline the generated data files get.
import assert from 'assert';

import * as V from '../../src/vocab.js';
import { GRAPH_FRAMES } from '../../src/frames/frames.js';

let failures = 0;
const test = (name, fn) => {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
};

test('every list is frozen and free of duplicates', () => {
  for (const key of ['QUANTITIES', 'UNITS', 'FRAMES', 'CENTERS', 'CORRECTIONS', 'EFFECTS', 'SOURCES']) {
    const arr = V[key];
    assert.ok(Object.isFrozen(arr), key + ' frozen');
    assert.strictEqual(new Set(arr).size, arr.length, key + ' unique');
    assert.ok(arr.every((t) => /^[a-z][a-z0-9-]*$/.test(t)), key + ' kebab-case');
  }
});

test('every unit has a declared physical dimension', () => {
  for (const u of V.UNITS) {
    assert.ok(V.UNIT_DIMENSION[u], 'dimension for ' + u);
  }
  // and no stray dimensions for units that do not exist
  for (const u of Object.keys(V.UNIT_DIMENSION)) {
    assert.ok(V.UNITS.includes(u), u + ' in UNITS');
  }
});

test('corrections are a subset of effects; precession/nutation are not corrections', () => {
  for (const c of V.CORRECTIONS) assert.ok(V.EFFECTS.includes(c), c + ' in EFFECTS');
  // precession and nutation are FRAME changes, never corrections/effects
  for (const bad of ['precession', 'nutation']) {
    assert.ok(!V.CORRECTIONS.includes(bad) && !V.EFFECTS.includes(bad), bad + ' excluded');
  }
});

test('membership tests and requireToken agree with the lists', () => {
  assert.ok(V.isFrame('equatorial-of-date') && !V.isFrame('nonsense'));
  assert.ok(V.isUnit('kilometer') && !V.isUnit('km')); // full spelling only
  assert.ok(V.isCenter('observer') && V.isCorrection('parallax-diurnal'));
  assert.strictEqual(V.requireToken('unit', 'degree'), 'degree');
  assert.throws(() => V.requireToken('unit', 'km'), RangeError);
  assert.throws(() => V.requireToken('bogus', 'x'), /unknown dimension/);
});

test('no drift: every frame the transformation graph uses is registered', () => {
  for (const f of GRAPH_FRAMES) {
    assert.ok(V.isFrame(f), `graph frame '${f}' missing from vocab.FRAMES`);
  }
});

test('no drift: the centers and corrections the pipeline uses are registered', () => {
  // centers that appear in makeState() calls across the source
  for (const c of ['sun', 'earth', 'observer', 'star']) {
    assert.ok(V.isCenter(c), `center '${c}' missing`);
  }
  // corrections the observer pipeline actually applies
  for (const c of ['light-time', 'aberration-annual', 'parallax-diurnal', 'refraction', 'proper-motion']) {
    assert.ok(V.isCorrection(c), `correction '${c}' missing`);
  }
  // sources behind the shipped models
  for (const s of ['vsop87a', 'erfa-epv00', 'meeus-moon', 'sgp4', 'bright-star-catalogue']) {
    assert.ok(V.isSource(s), `source '${s}' missing`);
  }
});

if (failures > 0) { console.error(failures + ' vocab test(s) failed'); process.exit(1); }
console.log('all vocab tests passed');
