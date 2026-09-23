import { elementsToState, propagateKepler } from './index.js';

const AU_KM = 149597870.7;
const SECONDS_PER_DAY = 86400;
const DEG = Math.PI / 180;

function finite(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function solveEllipticAnomaly(meanAnomaly, eccentricity) {
  let anomaly = eccentricity < 0.8 ? meanAnomaly : Math.PI;
  for (let iteration = 0; iteration < 50; iteration++) {
    const delta = (anomaly - eccentricity * Math.sin(anomaly) - meanAnomaly)
      / (1 - eccentricity * Math.cos(anomaly));
    anomaly -= delta;
    if (Math.abs(delta) < 1e-14) return anomaly;
  }
  throw new RangeError('Orb.Kepler: mean-anomaly conversion did not converge');
}

function trueAnomalyAtEpoch(elements, eccentricity) {
  if (!(eccentricity < 1 && finite(elements.mean_anomaly) && finite(elements.epoch))) return 0;
  const meanAnomaly = ((Number(elements.mean_anomaly) % 360) + 360) % 360 * DEG;
  const eccentricAnomaly = solveEllipticAnomaly(meanAnomaly, eccentricity);
  return Math.atan2(
    Math.sqrt(1 - eccentricity ** 2) * Math.sin(eccentricAnomaly),
    Math.cos(eccentricAnomaly) - eccentricity
  );
}

export function legacyOrbitalPlane(elements, targetJd, gmAuDay) {
  const eccentricity = Number(elements.eccentricity);
  if (!Number.isFinite(eccentricity) || eccentricity < 0) {
    throw new RangeError('Orb.Kepler: eccentricity must be a finite non-negative number');
  }
  const periapsisDistance = finite(elements.periapsis_distance)
    ? Number(elements.periapsis_distance)
    : finite(elements.perihelion_distance)
      ? Number(elements.perihelion_distance)
      : null;
  let semiLatusRectumAu;
  if (eccentricity < 1) {
    const semiMajorAxis = finite(elements.semi_major_axis)
      ? Number(elements.semi_major_axis)
      : periapsisDistance / (1 - eccentricity);
    semiLatusRectumAu = semiMajorAxis * (1 - eccentricity ** 2);
  } else if (eccentricity === 1) {
    semiLatusRectumAu = 2 * periapsisDistance;
  } else {
    const semiMajorAxisMagnitude = finite(elements.semi_major_axis) && Number(elements.semi_major_axis) > 0
      ? Number(elements.semi_major_axis)
      : periapsisDistance / (eccentricity - 1);
    semiLatusRectumAu = semiMajorAxisMagnitude * (eccentricity ** 2 - 1);
  }
  if (!Number.isFinite(semiLatusRectumAu) || semiLatusRectumAu <= 0) {
    throw new RangeError('Orb.Kepler: a positive semi-major axis or periapsis distance is required');
  }

  // An epoch/mean-anomaly pair and a periapsis-time/zero-anomaly pair are
  // alternative representations of the same phase.  Orb.Cartesian returns
  // both, so never combine time_of_periapsis with mean_anomaly.
  const hasEpochMeanAnomaly = eccentricity < 1
    && finite(elements.epoch)
    && finite(elements.mean_anomaly);
  const epochJd = hasEpochMeanAnomaly
    ? Number(elements.epoch)
    : finite(elements.time_of_periapsis)
      ? Number(elements.time_of_periapsis)
      : finite(elements.epoch)
        ? Number(elements.epoch)
        : Number(targetJd);
  const trueAnomaly = trueAnomalyAtEpoch(elements, eccentricity);
  const mu = Number(gmAuDay) * AU_KM ** 3 / SECONDS_PER_DAY ** 2;
  if (!Number.isFinite(mu) || mu <= 0) throw new RangeError('Orb.Kepler: gm must be positive and finite');
  const initial = elementsToState({
    eccentricity,
    semiLatusRectum: semiLatusRectumAu * AU_KM,
    inclination: 0,
    raan: 0,
    argumentOfPeriapsis: 0,
    trueAnomaly
  }, mu);
  const propagated = propagateKepler(
    initial.r,
    initial.v,
    (Number(targetJd) - epochJd) * SECONDS_PER_DAY,
    mu
  );
  return {
    r: Math.hypot(...propagated.r) / AU_KM,
    x: propagated.r[0] / AU_KM,
    y: propagated.r[1] / AU_KM,
    xdot: propagated.v[0] / AU_KM * SECONDS_PER_DAY,
    ydot: propagated.v[1] / AU_KM * SECONDS_PER_DAY
  };
}
