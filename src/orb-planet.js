//vsop.js
//requre core.js, time.js, earth.js ,coordinates.js

import {Time} from './orb-time.js'
import {resolveVSOP87ACoefficients} from './orb-vsop87a-registry.js'
import {EclipticToEquatorial, EclipticToEquatorialOfDate, XYZtoRadec} from './orb-coordinates.js'

export class VSOP {
  constructor(target, options = {}){
    //target = ["Mercury","Venus","Earth","Mars","Jupiter","Saturn","Uranus","Neptune"],
    this.target = target;
    this.vsop_options = options;
    this.vsop_target = resolveVSOP87ACoefficients(target, options);
  }

  exec_vsop = (date) => {
    var target_data = this.vsop_target;
    var time = new Time(date)
    var jd = time.jd();
    var t = ((jd - 2451545.0) / 365250);
    var v = [0, 0, 0];
    for (var i = 0, ln = target_data.length; i < ln; i++) {
      var tmp_data = target_data[i];
      var n = tmp_data[0];
      if(Array.isArray(tmp_data[2])){
        var order_factor = Math.pow(t, Number(tmp_data[1]));
        var grouped_terms = tmp_data[2];
        for(var j = 0, terms_ln = grouped_terms.length; j < terms_ln; j = j + 3){
          v[n] = v[n] + order_factor * Number(grouped_terms[j]) * Math.cos(Number(grouped_terms[j + 1]) + Number(grouped_terms[j + 2]) * t);
        }
      }else{
        var sum = Math.pow(t, Number(tmp_data[1])) * Number(tmp_data[2]) * Math.cos(Number(tmp_data[3]) + Number(tmp_data[4]) * t);
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

  xyz = (date) => {
    var pos = this.exec_vsop(date);
    return pos;
  }

  radec = (date) =>  {
    var target_pos = this.exec_vsop(date);
    var rectangular = EclipticToEquatorial({
      ecliptic: target_pos,
      date: date,
      "coordinate_keywords": "ecliptic rectangular",
      "unit_keywords": "au"
    });
    var spherical = XYZtoRadec(rectangular);
    return spherical;
  }

  radecOfDate = (date) => {
    const target_pos = this.exec_vsop(date);
    const rectangular = EclipticToEquatorialOfDate({
      ecliptic: target_pos,
      date: date,
      "coordinate_keywords": "ecliptic rectangular",
      "unit_keywords": "au"
    });
    return XYZtoRadec(rectangular);
  }

}

//Orb.Earth is defined in earth.js
export class Mercury{ 
  constructor(options = {}){
    return new VSOP("Mercury", options)
  }
};
export class Venus{ 
  constructor(options = {}){
    return new VSOP("Venus", options)
  }
};

export class Mars{ 
  constructor(options = {}){
    return new VSOP("Mars", options)
  }
};

export class Jupiter{ 
  constructor(options = {}){
    return new VSOP("Jupiter", options)
  }
};

export class Saturn{ 
  constructor(options = {}){
    return new VSOP("Saturn", options)
  }
};

export class Uranus{ 
  constructor(options = {}){
    return new VSOP("Uranus", options)
  }
};

export class Neptune{ 
  constructor(options = {}){
    return new VSOP("Neptune", options)
  }
};
export const Planet = VSOP;
