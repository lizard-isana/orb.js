//earth.js
//require core.js, time.js
import {Time} from './orb-time.js'
import {EARTH_COEF} from './orb-coefficients.js';

export class Earth {
  constructor(){}
  xyz = (date) => {
    const time = new Time(date)
    const jd = time.jd();
    const t = ((jd - 2451545.0) / 365250);
    const v = [0, 0, 0];
    const target_data = EARTH_COEF;
    for (let i = 0, ln = target_data.length; i < ln; i++) {
      const tmp_data = target_data[i];
      const n = tmp_data[0];
      const sum = Math.pow(t, Number(tmp_data[1])) * Number(tmp_data[2]) * Math.cos(Number(tmp_data[3]) + Number(tmp_data[4]) * t);
      v[n] = v[n] + sum;
    }
    return {
      x: v[0],
      y: v[1],
      z: v[2],
      "date": date,
      "coordinate_keywords": "ecliptic rectangular",
      "unit_keywords": "au"
    }
  }
  radec = (date) => {
    return null;
  }
}
