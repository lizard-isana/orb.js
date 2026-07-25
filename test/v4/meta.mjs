// observe() self-description (meta) test suite. Run: node test/v4/meta.mjs
//
// The result of observe() carries a `meta` block so that any value kept
// apart from the call still identifies itself. These tests enforce the
// two things that make that trustworthy: every token in meta is a
// registered vocabulary word (nothing ad-hoc can ship), and the
// corrections listed are the ones actually applied for that body/options.
import assert from 'assert';

import { Instant } from '../../src/time/instant.js';
import { observer } from '../../src/observer/observer.js';
import { moon } from '../../src/bodies/moon.js';
import { mars } from '../../src/bodies/mars.js';
import { star } from '../../src/bodies/star.js';
import { starBody, findStar } from '../../src/catalog/stars.js';
import * as V from '../../src/vocab.js';

let failures = 0;
const test = (name, fn) => {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
};

const T = Instant.fromISO('2026-07-24T16:45:13Z');
const SITE = observer({ latitude: 35.681, longitude: 139.767, height: 40 });
const vega = star({ ra: 18.61565556, dec: 38.78369444, pmRA: 0.201, pmDE: 0.286 });

test('meta is present by default and suppressible with meta:false', () => {
  assert.ok(SITE.observe(moon, T).meta, 'default on');
  assert.strictEqual(SITE.observe(moon, T, { meta: false }).meta, undefined, 'opt-out');
});

test('every token emitted in meta is registered in the vocabulary', () => {
  for (const body of [moon, mars, vega]) {
    for (const opts of [{}, { lightTime: false }, { refraction: {} }]) {
      const { meta } = SITE.observe(body, T, opts);
      for (const [field, q] of Object.entries(meta.quantities)) {
        assert.ok(V.isQuantity(q.quantity), `${field}.quantity '${q.quantity}'`);
        assert.ok(V.isUnit(q.unit), `${field}.unit '${q.unit}'`);
        if (q.frame) assert.ok(V.isFrame(q.frame), `${field}.frame '${q.frame}'`);
        if (q.center) assert.ok(V.isCenter(q.center), `${field}.center '${q.center}'`);
        for (const c of q.corrections || []) {
          assert.ok(V.isCorrection(c), `${field}.correction '${c}'`);
        }
      }
      for (const e of meta.ignored) assert.ok(V.isEffect(e), `ignored '${e}'`);
      for (const s of meta.source) assert.ok(V.isSource(s), `source '${s}'`);
      if (meta.accuracy) {
        assert.ok(V.isUnit(meta.accuracy.unit), `accuracy.unit '${meta.accuracy.unit}'`);
        if (meta.accuracy.basis) assert.ok(V.isSource(meta.accuracy.basis), `accuracy.basis`);
      }
    }
  }
});

test('provenance: pipeline + body sources are folded in, with an accuracy', () => {
  const m = SITE.observe(moon, T).meta;
  // the frame/model sources the pipeline always uses
  for (const s of ['iau2006-precession', 'iau2000b-nutation', 'iau1982-gmst', 'wgs84']) {
    assert.ok(m.source.includes(s), 'pipeline source ' + s);
  }
  // the body's own theory, and its accuracy as the leading term
  assert.ok(m.source.includes('meeus-moon'), 'body source');
  assert.deepStrictEqual(m.accuracy, { value: 15, unit: 'arcsecond', basis: 'meeus-moon' });
  // mars carries vsop87a
  assert.ok(SITE.observe(mars, T).meta.source.includes('vsop87a'));
  // a catalogue star carries the catalogue as its source + accuracy
  const cat = SITE.observe(starBody(findStar('Vega')), T).meta;
  assert.ok(cat.source.includes('bright-star-catalogue'), 'catalogue source');
  assert.strictEqual(cat.accuracy.basis, 'bright-star-catalogue');
  // a bare star() has no provenance -> pipeline-only source, no accuracy
  const bare = SITE.observe(vega, T).meta;
  assert.ok(!bare.source.includes('bright-star-catalogue') && bare.accuracy === undefined);
});

test('refraction adds its model to the source list only when applied', () => {
  assert.ok(!SITE.observe(moon, T).meta.source.includes('saemundsson-refraction'));
  const refr = SITE.observe(moon, T, { refraction: {} }).meta;
  assert.ok(refr.source.includes('saemundsson-refraction'));
});

test('fixed sources report no distance, but keep a valid direction', () => {
  const r = SITE.observe(vega, T);
  assert.strictEqual(r.range, null, 'range null');
  assert.strictEqual(r.distance, null, 'distance null');
  assert.ok(Number.isFinite(r.azimuth) && Number.isFinite(r.elevation), 'direction valid');
  assert.strictEqual(r.meta.quantities.distance.applicable, false);
  assert.strictEqual(r.meta.quantities.range.applicable, false);
  // a non-fixed body keeps its distance
  assert.ok(Number.isFinite(SITE.observe(moon, T).distance));
});

test('meta describes exactly the numeric fields returned', () => {
  const r = SITE.observe(moon, T);
  const numeric = Object.keys(r).filter((k) => k !== 'meta');
  assert.deepStrictEqual(Object.keys(r.meta.quantities).sort(), numeric.sort());
  // the instant is carried in both civil and TT-Julian form
  assert.strictEqual(r.meta.t.utc, '2026-07-24T16:45:13.000Z');
  assert.ok(Math.abs(r.meta.t.jd_tt - T.jd('tt')) < 1e-9);
});

test('topocentric vs geocentric fields carry the right center', () => {
  const q = SITE.observe(moon, T).meta.quantities;
  assert.strictEqual(q.azimuth.center, 'observer');
  assert.strictEqual(q.range.center, 'observer');   // topocentric slant
  assert.strictEqual(q.distance.center, 'earth');   // geocentric true distance
  assert.strictEqual(q.azimuth.frame, 'horizontal');
  assert.strictEqual(q.ra.frame, 'equatorial-of-date');
});

test('corrections match what the pipeline applied per body', () => {
  // Moon (geocentric theory): light time + annual aberration, then parallax
  const m = SITE.observe(moon, T).meta.quantities;
  assert.deepStrictEqual(m.elevation.corrections,
    ['light-time', 'aberration-annual', 'parallax-diurnal']);
  assert.deepStrictEqual(m.distance.corrections, ['light-time', 'aberration-annual']);

  // Mars (heliocentric): same apparent-place corrections
  const mp = SITE.observe(mars, T).meta.quantities;
  assert.ok(mp.azimuth.corrections.includes('light-time'));
  assert.ok(mp.azimuth.corrections.includes('parallax-diurnal'));

  // Star (fixed source): proper motion + aberration, NO light time
  const st = SITE.observe(vega, T).meta.quantities;
  assert.ok(st.azimuth.corrections.includes('proper-motion'));
  assert.ok(st.azimuth.corrections.includes('aberration-annual'));
  assert.ok(!st.azimuth.corrections.includes('light-time'), 'star has no light time');
});

test('lightTime:false and refraction toggle the correction lists honestly', () => {
  const geom = SITE.observe(moon, T, { lightTime: false }).meta.quantities;
  assert.deepStrictEqual(geom.elevation.corrections, ['parallax-diurnal']);

  // without refraction it is listed as NOT modelled; with it, it appears
  const noRefr = SITE.observe(moon, T);
  assert.ok(noRefr.meta.ignored.includes('refraction'));
  assert.ok(!noRefr.meta.quantities.elevation.corrections.includes('refraction'));

  const refr = SITE.observe(moon, T, { refraction: { pressure: 1013, temperature: 26 } });
  assert.ok(!refr.meta.ignored.includes('refraction'));
  assert.ok(refr.meta.quantities.elevation.corrections.includes('refraction'));
  // ... only on elevation, not on azimuth
  assert.ok(!refr.meta.quantities.azimuth.corrections.includes('refraction'));
});

if (failures > 0) { console.error(failures + ' meta test(s) failed'); process.exit(1); }
console.log('all meta tests passed');
