// Representative v3 throughput baselines.
//
// These measurements are intentionally informational: machine load, Node.js
// version, and JIT state all affect the result. Use the tool to spot large
// regressions and to compare equivalent paths in the same process, not as a
// strict CI timing gate.

import * as Orb from '../dist/orb.esm.mjs';
import { MARS_FULL_COEF } from '../src/vsop87a/mars.js';

const DEFAULT_DURATION_MS = 300;
const DATE = new Date('2026-07-18T12:00:00Z');
const SGP4_DATE = new Date('2020-01-14T14:00:00Z');
const TOKYO = { latitude: 35.658, longitude: 139.741, altitude: 0.025 };
const ISS_TLE = {
  first_line: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  second_line: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
};

function parseDuration(args) {
  const inline = args.find((argument) => argument.startsWith('--duration='));
  const separateIndex = args.indexOf('--duration');
  const raw = inline
    ? inline.slice('--duration='.length)
    : separateIndex >= 0
      ? args[separateIndex + 1]
      : DEFAULT_DURATION_MS;
  const duration = Number(raw);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new RangeError('--duration must be a positive number of milliseconds');
  }
  return duration;
}

const durationMs = parseDuration(process.argv.slice(2));
let sink = 0;

function measure(operation) {
  for (let index = 0; index < 50; index += 1) {
    sink += operation();
  }

  const batchSize = 25;
  let calls = 0;
  const start = performance.now();
  let now = start;
  while (now - start < durationMs) {
    for (let index = 0; index < batchSize; index += 1) {
      sink += operation();
    }
    calls += batchSize;
    now = performance.now();
  }
  return calls / ((now - start) / 1000);
}

function formatRate(rate) {
  if (rate >= 1e6) return (rate / 1e6).toFixed(2) + 'M/s';
  if (rate >= 1e3) return (rate / 1e3).toFixed(1) + 'k/s';
  return rate.toFixed(1) + '/s';
}

Orb.registerVSOP87A('Mars', MARS_FULL_COEF);

const time = new Orb.Time(DATE);
const luna = new Orb.Luna();
const sun = new Orb.Sun();
const marsShort = new Orb.Mars();
const marsFull = new Orb.Mars({ vsop87a: 'full' });
const moonObservation = new Orb.Observation({ observer: TOKYO, target: luna });
const satellite = new Orb.SGP4(ISS_TLE);
const elliptic = new Orb.Kepler({
  eccentricity: 0.1,
  semi_major_axis: 1.5,
  inclination: 5,
  argument_of_periapsis: 10,
  longitude_of_ascending_node: 20,
  mean_anomaly: 0,
  epoch: 2451545.0
});
const hyperbolic = new Orb.Kepler({
  eccentricity: 1.5,
  periapsis_distance: 0.8,
  inclination: 10,
  argument_of_periapsis: 30,
  longitude_of_ascending_node: 40,
  time_of_periapsis: 2461000
});

const cases = [
  ['time: GMST 1982', () => time.gmst82()],
  ['Moon: geocentric longitude/latitude', () => luna.latlng(DATE).distance],
  ['Sun: apparent RA/Dec', () => sun.radec(DATE).ra],
  ['Mars: short VSOP87A position', () => marsShort.xyz(DATE).x],
  ['Mars: full VSOP87A position', () => marsFull.xyz(DATE).x, 'Mars: short VSOP87A position'],
  ['Kepler: elliptic propagation', () => elliptic.xyz(DATE).x],
  ['Kepler: hyperbolic propagation', () => hyperbolic.xyz(DATE).x],
  ['SGP4: ISS TEME propagation', () => satellite.xyz(SGP4_DATE).x],
  ['observer: Moon azimuth/elevation', () => moonObservation.azel(DATE).elevation]
];

const results = new Map();
for (const [name, operation] of cases) {
  results.set(name, measure(operation));
}

console.log(`orb.js v3 benchmark (Node ${process.versions.node}, ${durationMs} ms/case)`);
console.log('operation                               throughput   relative');
console.log('--------------------------------------  -----------  --------');
for (const [name, , baseline] of cases) {
  const rate = results.get(name);
  const relative = baseline ? (rate / results.get(baseline)).toFixed(2) + 'x' : '-';
  console.log(name.padEnd(40) + formatRate(rate).padStart(11) + relative.padStart(10));
}

// Keep the observed values live and fail if an operation produced non-finite
// output. This is not a numerical correctness test; npm test owns that role.
if (!Number.isFinite(sink)) {
  throw new Error('benchmark operation produced a non-finite result');
}
