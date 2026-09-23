import {Constant} from './orb-core.js';
import {ttMinusUtc} from './time/scales.js';

const JulianDateTt = (date) => {
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const time_in_day = date.getUTCHours() / 24
    + date.getUTCMinutes() / 1440
    + date.getUTCSeconds() / 86400
    + date.getUTCMilliseconds() / 86400000;
  if (month <= 2) {
    year = year - 1;
    month = month + 12;
  }
  const julian_day = Math.trunc(365.25 * (year + 4716))
    + Math.trunc(30.6001 * (month + 1)) + day - 1524.5;
  let transition_offset;
  if (julian_day < 2299160.5) {
    transition_offset = 0;
  } else {
    const tmp = Math.trunc(year / 100);
    transition_offset = 2 - tmp + Math.trunc(tmp / 4);
  }
  const jd = julian_day + transition_offset + time_in_day;
  return jd + ttMinusUtc(date.getTime()) / 86400;
}

const ObliquityCoef =  (date) => {
  const jd = JulianDateTt(date);
  const t = (jd - 2451545.0) / 36525;
  const omega = 125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t / 450000);
  const L0 = 280.4665 + 36000.7698 * t;
  const L1 = 218.3165 + 481267.8813 * t;
  return {
    t: t,
    omega: omega,
    L0: L0,
    L1: L1
  }
}

export const MeanObliquity = (date) => {
  const coef = ObliquityCoef(date);
  return 23 + 26.0 / 60 + 21.448 / 3600 -
    (46.8150 / 3600) * coef.t -
    (0.00059 / 3600) * coef.t * coef.t +
    (0.001813 / 3600) * coef.t * coef.t * coef.t;
}

export const Obliquity = (date) => {
  const rad = Constant.RAD;
  const coef = ObliquityCoef(date);
  const mean_obliquity = MeanObliquity(date);
  const obliquity_delta = (9.20 / 3600) * Math.cos(coef.omega * rad) + (0.57 / 3600) * Math.cos(2 * coef.L0 * rad) + (0.10 / 3600) * Math.cos(2 * coef.L1 * rad) - (0.09 / 3600) * Math.cos(2 * coef.omega * rad);
  const obliquity = mean_obliquity + obliquity_delta;
  return obliquity;
}

export const Nutation = (date) => {
  const rad = Constant.RAD;
  const coef = ObliquityCoef(date)
  const nutation = (-17.20 / 3600) * Math.sin(coef.omega * rad) - (-1.32 / 3600) * Math.sin(2 * coef.L0 * rad) - (0.23 / 3600) * Math.sin(2 * coef.L1 * rad) + (0.21 / 3600) * Math.sin(2 * coef.omega * rad);
  return nutation;
}
