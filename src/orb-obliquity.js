import {Constant} from './orb-core.js';
import {Time} from './orb-time.js';

const ObliquityCoef =  (date) => {
  //var dt = DeltaT()/86400;
  //var dt = 64/86400;
  const time = new Time(date)
  const jd = time.jd();// + dt;
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

export const Obliquity = (date) => {
  const rad = Constant.RAD;
  const coef = ObliquityCoef(date);
  const mean_obliquity = 23 + 26.0 / 60 + 21.448 / 3600 - (46.8150 / 3600) * coef.t - (0.00059 / 3600) * coef.t * coef.t + (0.001813 / 3600) * coef.t * coef.t * coef.t;
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