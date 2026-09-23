import assert from 'assert';
import { createRequire } from 'module';

import {
  findCrossings,
  findMaximum,
  HORIZON_CONSTANTS,
  lunarAge,
  principalPhases,
  riseSetTransit,
  satellitePasses
} from '../../src/events/index.js';
import {
  adaptLegacyMoon,
  adaptLegacySatellite,
  DEG
} from '../../src/frames/index.js';
import { sunEpv00 } from '../../src/models/earth-epv00/index.js';
import { createObserver } from '../../src/observer/index.js';
import { Instant } from '../../src/time/index.js';

const require = createRequire(import.meta.url);
const Orb = require('../../dist/orb.js');
const { loadReferenceFixture } = require('../helpers/reference-fixture.js');
const phaseFixture = loadReferenceFixture('usno-moon-phases-2026-07.json');
const passFixture = loadReferenceFixture('orb-v3-iss-passes-tokyo-2020.json');
const moon = adaptLegacyMoon(new Orb.Luna());
const tokyo = createObserver({
  latitude: passFixture.site.latitudeDeg * DEG,
  longitude: passFixture.site.longitudeDeg * DEG,
  height: passFixture.site.heightKm
});
const satellite = adaptLegacySatellite(new Orb.SGP4({
  first_line: passFixture.tle.line1,
  second_line: passFixture.tle.line2
}), { name: 'iss' });
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function secondsBetween(left, right) {
  return Math.abs(left.utcMs - Date.parse(right)) / 1000;
}

test('bounded search refines crossings and maxima without Date arithmetic', () => {
  const from = Instant.fromUnixMs(0);
  const to = from.addSeconds(10);
  const roots = findCrossings(
    (instant) => instant.differenceSeconds(from) - 5,
    from,
    to,
    { stepSeconds: 2, toleranceSeconds: 0.001 }
  );
  assert.strictEqual(roots.length, 1);
  assert.strictEqual(roots[0].direction, 1);
  assert.ok(Math.abs(roots[0].instant.differenceSeconds(from) - 5) < 0.001);
  const maximum = findMaximum(
    (instant) => -((instant.differenceSeconds(from) - 4) ** 2),
    from,
    to,
    { stepSeconds: 2, toleranceSeconds: 0.001 }
  );
  assert.ok(Math.abs(maximum.instant.differenceSeconds(from) - 4) < 0.001);
  assert.throws(
    () => findCrossings(() => 1, from, to, {
      stepSeconds: 0.001,
      toleranceSeconds: 0.0001,
      maxEvaluations: 10
    }),
    /maxEvaluations/
  );
  assert.throws(
    () => findCrossings(() => 1, from, to, { stepSeconds: 2, toleranceSeconds: 2 }),
    /smaller/
  );
});

test('rise, transit, and set default to geometric center events', () => {
  const events = riseSetTransit(
    tokyo,
    sunEpv00,
    Instant.fromISO('2026-07-17T15:00:00Z'),
    Instant.fromISO('2026-07-18T15:00:00Z')
  );
  assert.deepStrictEqual(events.map((event) => event.type), ['rise', 'transit', 'set']);
  assert.strictEqual(HORIZON_CONSTANTS.geometricCenter, 0);
  for (const event of events) {
    assert.strictEqual(event.elevationType, 'geometric');
    assert.strictEqual(event.limb, 'center');
  }
  for (const event of events.filter((event) => event.type !== 'transit')) {
    assert.ok(Math.abs(event.residual) < 1e-6, `${event.type} residual=${event.residual}`);
    assert.ok(Math.abs(tokyo.observe(sunEpv00, event.instant).elevation) < 1e-6);
  }
  assert.ok(events[0].instant.utcMs < events[1].instant.utcMs);
  assert.ok(events[1].instant.utcMs < events[2].instant.utcMs);
});

test('semidiameter and atmospheric refraction remain explicit conventions', () => {
  const from = Instant.fromISO('2026-07-17T15:00:00Z');
  const to = Instant.fromISO('2026-07-18T15:00:00Z');
  const upperLimb = riseSetTransit(tokyo, sunEpv00, from, to, {
    semidiameter: HORIZON_CONSTANTS.meanSolarSemidiameter
  });
  const refracted = riseSetTransit(tokyo, sunEpv00, from, to, {
    semidiameter: HORIZON_CONSTANTS.meanSolarSemidiameter,
    observation: { refraction: { pressure: 1010, temperature: 10 } }
  });
  assert.strictEqual(upperLimb[0].limb, 'upper');
  assert.strictEqual(upperLimb[0].elevationType, 'geometric');
  assert.strictEqual(refracted[0].elevationType, 'refracted');
  assert.ok(refracted[0].instant.utcMs < upperLimb[0].instant.utcMs);
});

test('principal lunar phases agree with the independent USNO fixture', () => {
  const events = principalPhases(
    moon,
    sunEpv00,
    Instant.fromISO('2026-07-01T00:00:00Z'),
    Instant.fromISO('2026-08-01T00:00:00Z')
  );
  assert.deepStrictEqual(events.map((event) => event.phase), phaseFixture.events.map((event) => event.phase));
  for (let index = 0; index < events.length; index += 1) {
    assert.ok(
      secondsBetween(events[index].instant, phaseFixture.events[index].utc)
        < phaseFixture.tolerance.phaseTimeSeconds,
      `${events[index].phase} ${events[index].instant.toISOString()}`
    );
    assert.ok(Math.abs(events[index].residual) < 1e-6);
    assert.deepStrictEqual(events[index].corrections, []);
  }
  const newMoon = events.find((event) => event.phase === 'new');
  const age = lunarAge(moon, sunEpv00, newMoon.instant.addDays(1));
  assert.ok(age > 0.999 && age < 1.001, `age=${age}`);
});

test('fixed ISS/Tokyo passes retain ordering, thresholds, and the legacy fixture', () => {
  const passes = satellitePasses(
    tokyo,
    satellite,
    Instant.fromISO(passFixture.instant.split(' through ')[0]),
    Instant.fromISO(passFixture.instant.split(' through ')[1]),
    { minimumElevation: passFixture.minimumElevationDeg * DEG }
  );
  assert.strictEqual(passes.length, passFixture.events.length);
  for (let index = 0; index < passes.length; index += 1) {
    const actual = passes[index];
    const expected = passFixture.events[index];
    assert.ok(actual.rise.instant.utcMs < actual.culmination.instant.utcMs);
    assert.ok(actual.culmination.instant.utcMs < actual.set.instant.utcMs);
    assert.ok(Math.abs(actual.riseResidual) < 1e-5);
    assert.ok(Math.abs(actual.setResidual) < 1e-5);
    assert.strictEqual(actual.elevationType, 'geometric');
    assert.strictEqual(actual.opticalVisibility, 'not-computed');
    assert.strictEqual(actual.sunlight, 'not-computed');
    assert.ok(secondsBetween(actual.rise.instant, expected.rise) < passFixture.tolerance.eventTimeSeconds);
    assert.ok(secondsBetween(actual.culmination.instant, expected.culmination) < passFixture.tolerance.eventTimeSeconds);
    assert.ok(secondsBetween(actual.set.instant, expected.set) < passFixture.tolerance.eventTimeSeconds);
    assert.ok(
      Math.abs(actual.culmination.elevation / DEG - expected.maximumElevationDeg)
        < passFixture.tolerance.maximumElevationDeg
    );
  }
});

test('pass defaults are airless horizon crossings and invalid search knobs fail', () => {
  const from = Instant.fromISO('2020-01-14T09:00:00Z');
  const to = Instant.fromISO('2020-01-14T10:00:00Z');
  const passes = satellitePasses(tokyo, satellite, from, to);
  assert.strictEqual(passes.length, 1);
  assert.strictEqual(passes[0].minimumElevation, 0);
  assert.strictEqual(passes[0].elevationType, 'geometric');
  assert.ok(Math.abs(passes[0].rise.elevation) < 1e-5);
  assert.ok(Math.abs(passes[0].set.elevation) < 1e-5);
  assert.throws(
    () => satellitePasses(tokyo, satellite, from, to, { stepSeconds: 301 }),
    /must not exceed/
  );
  assert.throws(
    () => riseSetTransit(tokyo, sunEpv00, from, to, { stepSeconds: 21601 }),
    /must not exceed/
  );
});

let failures = 0;
for (const { name, run } of tests) {
  try {
    await run();
    console.log(`ok - M4 ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`NG - M4 ${name}: ${error.stack ?? error.message}`);
  }
}

if (failures > 0) {
  console.error(`${failures} of ${tests.length} M4 test(s) failed`);
  process.exitCode = 1;
} else {
  console.log('all M4 tests passed');
}
