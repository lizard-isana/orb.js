import {Time} from './orb-time.js';

const J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));

const julianCentury = (date) => {
  const time = new Time(date);
  return (time.jd() - 2451545.0) / 36525;
}

export const Precession = (parameter) => {
  const from = parameter.from || J2000;
  const to = parameter.to || parameter.date;
  const ra = parameter.ra * 15;
  const dec = parameter.dec;
  const rad = Math.PI / 180;

  const T = julianCentury(from);
  const t = julianCentury(to) - T;

  const zeta = (
    (2306.2181 + 1.39656 * T - 0.000139 * T * T) * t +
    (0.30188 - 0.000344 * T) * t * t +
    0.017998 * t * t * t
  ) / 3600;

  const z = (
    (2306.2181 + 1.39656 * T - 0.000139 * T * T) * t +
    (1.09468 + 0.000066 * T) * t * t +
    0.018203 * t * t * t
  ) / 3600;

  const theta = (
    (2004.3109 - 0.85330 * T - 0.000217 * T * T) * t -
    (0.42665 + 0.000217 * T) * t * t -
    0.041833 * t * t * t
  ) / 3600;

  const A = Math.cos(dec * rad) * Math.sin((ra + zeta) * rad);
  const B = (
    Math.cos(theta * rad) * Math.cos(dec * rad) * Math.cos((ra + zeta) * rad) -
    Math.sin(theta * rad) * Math.sin(dec * rad)
  );
  const C = (
    Math.sin(theta * rad) * Math.cos(dec * rad) * Math.cos((ra + zeta) * rad) +
    Math.cos(theta * rad) * Math.sin(dec * rad)
  );

  let precessedRa = Math.atan2(A, B) / rad + z;
  if (precessedRa < 0) {
    precessedRa = precessedRa % 360 + 360;
  }
  if (precessedRa > 360) {
    precessedRa = precessedRa % 360;
  }

  return {
    ra: precessedRa / 15,
    dec: Math.asin(C) / rad,
    distance: parameter.distance,
    date: to,
    coordinate_keywords: "equatorial spherical",
    unit_keywords: "hours degree"
  }
}

export const J2000Epoch = J2000;
