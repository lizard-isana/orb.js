//earth.js
//require core.js, time.js
import {Time} from './orb-time.js'
import {resolveVSOP87ACoefficients} from './orb-vsop87a-registry.js';

export class Earth {
  constructor(options = {}){
    this.vsop_options = options;
    this.vsop_target = resolveVSOP87ACoefficients('Earth', options);
  }
  xyz = (date) => {
    const time = new Time(date)
    const jd = time.jd();
    const t = ((jd - 2451545.0) / 365250);
    const v = [0, 0, 0];
    const target_data = this.vsop_target;
    for (let i = 0, ln = target_data.length; i < ln; i++) {
      const tmp_data = target_data[i];
      const n = tmp_data[0];
      if(Array.isArray(tmp_data[2])){
        const order_factor = Math.pow(t, Number(tmp_data[1]));
        const grouped_terms = tmp_data[2];
        for(let j = 0, terms_ln = grouped_terms.length; j < terms_ln; j = j + 3){
          v[n] = v[n] + order_factor * Number(grouped_terms[j]) * Math.cos(Number(grouped_terms[j + 1]) + Number(grouped_terms[j + 2]) * t);
        }
      }else{
        const sum = Math.pow(t, Number(tmp_data[1])) * Number(tmp_data[2]) * Math.cos(Number(tmp_data[3]) + Number(tmp_data[4]) * t);
        v[n] = v[n] + sum;
      }
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
