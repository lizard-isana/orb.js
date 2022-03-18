//vsop.js
//requre core.js, time.js, earth.js ,coordinates.js

import {Time} from './orb-time.js'
import * as COEF from './orb-vsop87a.js'
import {EclipticToEquatorial, XYZtoRadec} from './orb-coordinates.js'

export class VSOP {
  constructor(target){
    //target = ["Mercury","Venus","Earth","Mars","Jupiter","Saturn","Uranus","Neptune"],
    const COEFFICIENTS = {
      "Mercury":COEF.MERCURY_COEF,
      "Venus":COEF.VENUS_COEF,
      "Earth":COEF.EARTH_COEF,
      "Mars":COEF.MARS_COEF,
      "Jupiter":COEF.JUPITER_COEF,
      "Saturn":COEF.SATURN_COEF,
      "Uranus":COEF.URANUS_COEF,
      "Neptune":COEF.NEPTUNE_COEF
    }
    this.target = target;
    this.vsop_target = COEFFICIENTS[target];
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
      var sum = Math.pow(t, Number(tmp_data[1])) * Number(tmp_data[2]) * Math.cos(Number(tmp_data[3]) + Number(tmp_data[4]) * t);
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
  
}

//Orb.Earth is defined in earth.js
export class Mercury{ 
  constructor(){
    return new VSOP("Mercury")
  }
};
export class Venus{ 
  constructor(){
    return new VSOP("Venus")
  }
};

export class Mars{ 
  constructor(){
    return new VSOP("Mars")
  }
};

export class Jupiter{ 
  constructor(){
    return new VSOP("Jupiter")
  }
};

export class Saturn{ 
  constructor(){
    return new VSOP("Saturn")
  }
};

export class Uranus{ 
  constructor(){
    return new VSOP("Uranus")
  }
};

export class Neptune{ 
  constructor(){
    return new VSOP("Neptune")
  }
};
export const Planet = VSOP;
