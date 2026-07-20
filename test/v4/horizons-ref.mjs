// JPL Horizons reference comparison. Run with: node test/v4/horizons-ref.mjs
//
// Reference data supplied by the project owner from the Horizons API
// (source DE441), observer site Tokyo E139.741 N35.658 h=25m,
// airless apparent quantities 2 (RA/Dec of date, topocentric),
// 4 (azimuth/elevation) and 20 (range), 2026-07-18 00:00..24:00 UTC.
//
// Tolerances state each body's SERIES accuracy class, not the pipeline's:
// the residual must look like the documented truncation error of the
// underlying theory (a smooth offset shared by the equatorial and
// horizontal coordinates), and anything beyond it fails the build.
//   moon: Meeus 60-term series, ~10" in longitude, tens of km in range.
//         Measured on capture: RA -8", Dec +1", Az/El within 8",
//         range -30 km — consistent with the series class.
import assert from 'assert';

import { Instant } from '../../src/time/instant.js';
import { DEG } from '../../src/math/angles.js';
import { observer } from '../../src/observer/observer.js';
import { moon } from '../../src/bodies/moon.js';

const AU_KM = 149597870.7;

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

const TOKYO = observer({ latitude: 35.658, longitude: 139.741, height: 25 });

// rows: [iso, RA deg, Dec deg, Az deg, El deg, delta au]
const CASES = [
  {
    body: moon, name: 'moon',
    skyTolArcsec: 15, rangeTolKm: 50,
    rows: [
      ['2026-07-18T00:00:00Z', 165.423160268, 4.665362159, 86.287282626, 2.830527623, 0.00251170278392],
      ['2026-07-18T06:00:00Z', 167.688729940, 3.118631144, 176.512941294, 57.414144138, 0.00248826202850],
      ['2026-07-18T12:00:00Z', 169.876940753, 1.492171722, 268.984296789, 3.974817572, 0.00253126073634],
      ['2026-07-18T18:00:00Z', 173.527125098, -0.085041911, 347.705201508, -53.796385069, 0.00257917480388],
      ['2026-07-19T00:00:00Z', 177.328839749, -1.646624904, 85.015043564, -9.710551650, 0.00256196526041]
    ]
  }
  // mars / sun blocks are appended as their Horizons captures arrive.
];

for (const c of CASES) {
  test(`horizons: ${c.name} topocentric apparent place (Tokyo)`, () => {
    for (const [iso, ra, dec, az, el, delta] of c.rows) {
      const o = TOKYO.observe(c.body, Instant.fromISO(iso));
      const dRa = (o.ra - ra) * Math.cos(dec * DEG) * 3600;
      const dDec = (o.dec - dec) * 3600;
      const dAz = (o.azimuth - az) * Math.cos(el * DEG) * 3600;
      const dEl = (o.elevation - el) * 3600;
      const skyEq = Math.hypot(dRa, dDec);
      const skyHor = Math.hypot(dAz, dEl);
      assert.ok(skyEq < c.skyTolArcsec, `${iso} radec off ${skyEq.toFixed(1)}"`);
      assert.ok(skyHor < c.skyTolArcsec, `${iso} azel off ${skyHor.toFixed(1)}"`);
      // the equatorial and horizontal offsets must be the SAME sky error,
      // i.e. the topocentric geometry itself adds nothing
      assert.ok(Math.abs(skyEq - skyHor) < 3, `${iso} geometry residual`);
      assert.ok(Math.abs(o.range - delta * AU_KM) < c.rangeTolKm, `${iso} range`);
    }
  });
}

if (failed > 0) {
  console.error(failed + ' test(s) failed');
  process.exit(1);
}
console.log('all horizons reference tests passed');
