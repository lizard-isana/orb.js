// bench.mjs — throughput of the core operations, current code vs the
// frozen previous build (dist/orb.js) where an equivalent exists.
//
// Method: warm up, then run each operation in timed batches for ~0.4 s
// and report calls per second. Numbers are indicative (single process,
// no isolation) — meant to catch order-of-magnitude regressions and to
// document the cost of the higher-grade models, not for micro-tuning.
//
// Usage: node tools/bench.mjs  (or: npm run bench)

import { createRequire } from 'module';

import { Instant } from '../src/time/instant.js';
import { transform } from '../src/frames/frames.js';
import { moon } from '../src/bodies/moon.js';
import { sun } from '../src/bodies/sun.js';
import { mars } from '../src/bodies/mars.js';
import { apparentGeocentric } from '../src/observer/apparent.js';
import { observer } from '../src/observer/observer.js';
import { satellite } from '../src/sgp4/satellite.js';
import { propagateKepler, GM } from '../src/math/kepler.js';
import { riseSet } from '../src/events/riseset.js';
import { passes } from '../src/events/passes.js';

const require = createRequire(import.meta.url);
const Orb = require('../dist/orb.js');

const DATE = new Date('2026-07-18T12:00:00Z');
const T = Instant.fromDate(DATE);
const TOKYO = observer({ latitude: 35.658, longitude: 139.741, height: 25 });
const V3_TOKYO = { latitude: 35.658, longitude: 139.741, altitude: 0.025 };

const ISS = {
  line1: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  line2: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
};
const SGP4_DATE = new Date('2020-01-14T14:00:00Z');
const SGP4_T = Instant.fromDate(SGP4_DATE);

let sink = 0; // consumed results, so nothing gets optimized away

const measure = (fn) => {
  for (let i = 0; i < 50; i++) sink += fn(); // warmup
  const target = 400; // ms
  let calls = 0;
  const start = performance.now();
  let now = start;
  while (now - start < target) {
    for (let i = 0; i < 25; i++) sink += fn();
    calls += 25;
    now = performance.now();
  }
  return calls / ((now - start) / 1000);
};

const fmt = (ops) => {
  if (ops >= 1e6) return (ops / 1e6).toFixed(2) + 'M';
  if (ops >= 1e3) return (ops / 1e3).toFixed(1) + 'k';
  return ops.toFixed(1);
};

// [name, current fn, previous fn | null]
const v3Luna = new Orb.Luna();
const v3Sun = new Orb.Sun();
const v3Mars = new Orb.Mars();
const v3Sgp4 = new Orb.SGP4({ first_line: ISS.line1, second_line: ISS.line2 });
const v3Obs = new Orb.Observation({ observer: V3_TOKYO, target: v3Luna });
const iss = satellite({ ...ISS });
const marsState = transform(mars.state(T), { frame: 'ecliptic-j2000' });
const KR = [marsState.r[0], marsState.r[1], marsState.r[2]];
const KV = [marsState.v[0], marsState.v[1], marsState.v[2]];

const CASES = [
  ['moon geocentric position',
    () => moon.latlng(T).distance,
    () => v3Luna.latlng(DATE).distance],
  ['sun apparent place',
    () => apparentGeocentric(sun, T).r[0],
    () => v3Sun.radec(DATE).ra],
  ['mars heliocentric position',
    () => mars.state(T).r[0],
    () => v3Mars.xyz(DATE).x],
  ['frame transform (ecl-J2000 -> ecef)',
    () => transform(marsState, { frame: 'ecef' }).r[0],
    null],
  ['observe moon (topocentric az/el)',
    () => TOKYO.observe(moon, T).elevation,
    () => v3Obs.azel(DATE).elevation],
  ['sgp4 propagate + teme state',
    () => iss.state(SGP4_T).r[0],
    () => v3Sgp4.xyz(SGP4_DATE).x],
  ['kepler propagate (universal, 1 day)',
    () => propagateKepler(KR, KV, 86400, GM.sun).r[0],
    null],
  ['sun rise/set (one day searched)',
    () => riseSet(TOKYO, sun, T, T.addDays(1)).length,
    null],
  ['satellite passes (24 h searched)',
    () => passes(TOKYO, iss, SGP4_T, SGP4_T.addDays(1)).length,
    null]
];

console.log('operation                              current      previous   ratio');
console.log('------------------------------------  ----------  ----------  ------');
for (const [name, current, previous] of CASES) {
  const a = measure(current);
  const b = previous ? measure(previous) : null;
  const ratio = b ? (a / b).toFixed(2) + 'x' : '-';
  console.log(
    name.padEnd(38) +
    (fmt(a) + '/s').padStart(10) +
    (b ? (fmt(b) + '/s').padStart(12) : '-'.padStart(12)) +
    ratio.padStart(8));
}
if (!Number.isFinite(sink)) console.log(sink); // keep the sink alive
