// v4 satellite + events test suite. Run with: node test/v4/satellite-events.mjs
import assert from 'assert';
import { createRequire } from 'module';

import { Instant } from '../../src/time/instant.js';
import { observer } from '../../src/observer/observer.js';
import { satellite } from '../../src/sgp4/satellite.js';
import { parseTle } from '../../src/sgp4/tle.js';
import { riseSet } from '../../src/events/riseset.js';
import { moonPhases, moonAge } from '../../src/events/phases.js';
import { passes } from '../../src/events/passes.js';
import { sun } from '../../src/bodies/sun.js';
import { DEG } from '../../src/math/angles.js';

const require = createRequire(import.meta.url);
const Orb = require('../../dist/orb.js'); // frozen v3 build

let failed = 0;
const test = (name, fn) => {
  try {
    fn();
    console.log('ok - ' + name);
  } catch (e) {
    failed++;
    console.error('NG - ' + name + ': ' + e.message);
  }
};

const ISS_TLE = {
  line1: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  line2: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
};
const TOKYO = observer({ latitude: 35.658, longitude: 139.741, height: 25 });

test('parseTle: fields, implied decimals, millisecond epoch', () => {
  const el = parseTle(ISS_TLE);
  assert.strictEqual(el.catalogNumber, 25544);
  assert.strictEqual(el.classification, 'U');
  assert.ok(Math.abs(el.eccentricity - 0.0004871) < 1e-10);
  assert.ok(Math.abs(el.bstar - 1.027e-4) < 1e-9);
  // epoch 20014.52632156 = 2020-01-14 12:37:54.182784 UTC — the sub-second
  // part must survive (v3 lost it twice)
  const iso = el.epoch.toDate().toISOString();
  assert.ok(iso.startsWith('2020-01-14T12:37:54.18'), iso);
});

test('satellite.state matches frozen v3 up to the epoch-precision fix', () => {
  // Same propagation engine; v4 keeps the epoch to ~microseconds where v3
  // rounds to milliseconds, so the states differ by the ~0.8 ms of
  // along-track motion (~6 m) and no more.
  const iss = satellite(ISS_TLE);
  const t = Instant.fromISO('2020-01-14T12:40:00Z');
  const s = iss.state(t);
  assert.strictEqual(s.frame, 'teme');
  const v3 = new Orb.SGP4({ first_line: ISS_TLE.line1, second_line: ISS_TLE.line2 })
    .xyz(t.toDate());
  const d = Math.hypot(s.r[0] - v3.x, s.r[1] - v3.y, s.r[2] - v3.z);
  assert.ok(d < 0.01, 'diff km=' + d);
  assert.ok(iss.orbitalPeriod > 92 && iss.orbitalPeriod < 93, 'period ' + iss.orbitalPeriod);
  assert.ok(iss.perigee > 400 && iss.apogee < 440, 'altitudes');
});

test('deep space: GEO reference vector from python-sgp4 still holds', () => {
  const geo = satellite({
    line1: '1 90001U 20001A   20014.50000000  .00000000  00000-0  00000-0 0  9995',
    line2: '2 90001   1.0000  90.0000 0001000  50.0000 310.0000  1.00270000  8031'
  });
  assert.strictEqual(geo.satrec.method, 'd');
  const t = Instant.fromUnixMs(geo.elements.epoch.utcMs + 360 * 60000);
  const s = geo.state(t);
  const ref = [-42154.26042654016, -197.88391977789678, 749.0506370984336];
  const d = Math.hypot(s.r[0] - ref[0], s.r[1] - ref[1], s.r[2] - ref[2]);
  assert.ok(d < 1e-6, 'diff km=' + d);
});

test('observe(satellite): within arcseconds of frozen v3', () => {
  const iss = satellite(ISS_TLE);
  const t = Instant.fromISO('2020-01-14T12:40:00Z');
  const o4 = TOKYO.observe(iss, t);
  const o3 = new Orb.Observation({
    observer: { latitude: 35.658, longitude: 139.741, altitude: 0.025 },
    target: new Orb.SGP4({ first_line: ISS_TLE.line1, second_line: ISS_TLE.line2 })
  }).azel(t.toDate());
  // remaining differences: satellite light-time (v4 only) + epoch precision
  assert.ok(Math.abs(o4.azimuth - o3.azimuth) * 3600 < 10, 'dAz');
  assert.ok(Math.abs(o4.elevation - o3.elevation) * 3600 < 10, 'dEl');
});

test('riseSet: Tokyo sun events on 2026-07-18 (JST day)', () => {
  const events = riseSet(TOKYO, sun,
    Instant.fromISO('2026-07-17T15:00:00Z'), Instant.fromISO('2026-07-18T15:00:00Z'));
  assert.deepStrictEqual(events.map((e) => e.type), ['rise', 'transit', 'set']);
  const [rise, transit, set] = events;
  // measured on capture: rise 19:38:25Z (04:38 JST), set 09:55:45Z (18:55 JST)
  assert.ok(Math.abs(rise.t.utcMs - Date.parse('2026-07-17T19:38:25Z')) < 60000, 'rise ' + rise.t.toDate());
  assert.ok(Math.abs(set.t.utcMs - Date.parse('2026-07-18T09:55:45Z')) < 60000, 'set ' + set.t.toDate());
  // the event definition holds: re-observing at the found time gives h0
  const check = TOKYO.observe(sun, rise.t).elevation;
  assert.ok(Math.abs(check - (-0.8333)) < 0.01, 'elevation at rise=' + check);
  // transit elevation equals 90 - lat + dec within a degree
  assert.ok(Math.abs(transit.elevation - 75.4) < 1, 'transit el=' + transit.elevation);
});

test('moonPhases: consistent with the independent Meeus phase series', () => {
  const events = moonPhases(
    Instant.fromISO('2026-07-01T00:00:00Z'), Instant.fromISO('2026-07-31T00:00:00Z'));
  assert.deepStrictEqual(events.map((e) => e.phase),
    ['last-quarter', 'new', 'first-quarter', 'full']);
  // v3 computes new-moon times from a completely different algorithm
  // (Meeus ch. 49 series); at our root-found new moon its "days since
  // new moon" must be ~0 (measured: 17 seconds)
  const newMoon = events.find((e) => e.phase === 'new');
  const v3Age = new Orb.Luna().phase(newMoon.t.toDate());
  assert.ok(Math.abs(v3Age) < 0.01, 'v3 age at our new moon: ' + v3Age + ' d');
  // moon age just after the new moon is near zero and increases
  assert.ok(moonAge(newMoon.t.addDays(1)) > 0.9 && moonAge(newMoon.t.addDays(1)) < 1.1);
});

test('passes: ISS over Tokyo, thresholds and ordering hold', () => {
  const iss = satellite(ISS_TLE);
  const list = passes(TOKYO, iss,
    Instant.fromISO('2020-01-14T00:00:00Z'), Instant.fromISO('2020-01-16T00:00:00Z'));
  assert.ok(list.length >= 6 && list.length <= 10, 'passes: ' + list.length); // measured: 8
  for (const p of list) {
    assert.ok(p.rise.t.utcMs < p.culmination.t.utcMs && p.culmination.t.utcMs < p.set.t.utcMs);
    assert.ok(p.culmination.elevation >= 10, 'culmination ' + p.culmination.elevation);
    const atRise = TOKYO.observe(iss, p.rise.t).elevation;
    assert.ok(Math.abs(atRise - 10) < 0.05, 'elevation at rise=' + atRise);
    const duration = (p.set.t.utcMs - p.rise.t.utcMs) / 60000;
    assert.ok(duration > 1 && duration < 12, 'duration min=' + duration);
  }
});

if (failed > 0) {
  console.error(failed + ' test(s) failed');
  process.exit(1);
}
console.log('all v4 satellite/events tests passed');
