//kepler.js
//require core.js, time.js
Math.cosh = Math.cosh || function(x) {
  var y = Math.exp(x);
  return (y + 1 / y) / 2;
};

Math.sinh = Math.sinh || function(x) {
  var y = Math.exp(x);
  return (y - 1 / y) / 2;
};

Math.tanh = Math.tanh || function(x) {
  if (x === Infinity) {
    return 1;
  } else if (x === -Infinity) {
    return -1;
  } else {
    var y = Math.exp(2 * x);
    return (y - 1) / (y + 1);
  }
}

Math.atanh = Math.atanh || function(x) {
  return Math.log((1+x)/(1-x)) / 2;
};

Orb.Kepler = Orb.Kepler || function(orbital_elements,date){
   this.orbital_elements = orbital_elements;
   if(orbital_elements.gm){
     var gm = Number(orbital_elements.gm);
   }else{
     var gm = Orb.Const.GM;
   }
   this.gm = gm;
   if(orbital_elements.time_of_periapsis){
     var epoch = orbital_elements.time_of_periapsis;
   }else{
     var epoch = orbital_elements.epoch;
   }
   this.epoch = epoch;

}

Orb.Kepler.prototype = {

  EllipticalOrbit: function(time){
    var rad = Orb.Const.RAD;
    var gm = this.gm;
    var epoch = this.epoch;
    var orbital_elements = this.orbital_elements;
    var eccentricity = Number(orbital_elements.eccentricity);
    if(orbital_elements.semi_major_axis){
     var semi_major_axis = orbital_elements.semi_major_axis;
    }else if(orbital_elements.perihelion_distance){
     var semi_major_axis = (orbital_elements.perihelion_distance)/(1-eccentricity)
    }
    var mean_motion = Math.sqrt(gm/(semi_major_axis*semi_major_axis*semi_major_axis))/rad;
    var elapsed_time = Number(time.jd())-Number(epoch);
    if(orbital_elements.mean_anomaly && orbital_elements.epoch){
     var mean_anomaly = Number(orbital_elements.mean_anomaly);
     var l=(mean_motion*elapsed_time)+mean_anomaly;
    }else if(orbital_elements.time_of_periapsis){
     var mean_anomaly = mean_motion*elapsed_time;
     var l=mean_anomaly;
    }
    if(l>360){l=l%360}
    l = l*rad
    var u=l
    var i = 0;
    do{
     var ut=u;
     var delta_u=(l-u+(eccentricity*Math.sin(u)))/(1- (eccentricity*Math.cos(u)));
     u=u+delta_u;
     if(i>1000000){break;}
     i++
    }while (Math.abs(ut-u)>0.0000001);
    var eccentric_anomaly = u;
    var p = Math.abs(semi_major_axis * (1 - eccentricity*eccentricity))
    var true_anomaly = 2*Math.atan(Math.sqrt((1+eccentricity)/(1-eccentricity))*Math.tan(eccentric_anomaly/2));
    var r = p / (1 + eccentricity * Math.cos(true_anomaly));
    var orbital_plane = {
     r:r,
     x:r* Math.cos(true_anomaly),
     y:r* Math.sin(true_anomaly),
     xdot:-Math.sqrt(gm / p) * Math.sin(true_anomaly),
     ydot:Math.sqrt(gm / p) * (eccentricity + Math.cos(true_anomaly))
    };
    return orbital_plane;
  },

  ParabolicOrbit: function(time){
    var rad = Orb.Const.RAD;
    var gm = this.gm;
    var epoch = this.epoch;
    var orbital_elements = this.orbital_elements;
    var eccentricity = Number(orbital_elements.eccentricity);
    var perihelion_distance = Number(orbital_elements.perihelion_distance);
    var mean_motion = Math.sqrt(gm/(2*(perihelion_distance*perihelion_distance*perihelion_distance)));
    var elapsed_time = Number(time.jd())-Number(epoch);
    if(orbital_elements.mean_anomaly){
     var mean_anomaly = Number(orbital_elements.mean_anomaly);
     var l=mean_motion*elapsed_time+mean_anomaly;
    }else{
     var l = mean_motion*elapsed_time;
    }
    var b= Math.atan2(2,(3*l))/2
    var tanb = Math.tan(b)
    var tang = Math.pow(tanb,(1/3))
    var true_anomary = Math.atan2((1-tang*tang),tang)*2
    var cosf= Math.cos(true_anomary)
    var sinf=Math.sin(true_anomary)
    var r =(2*perihelion_distance)/(1+cosf)
    var x = r*cosf
    var y = r*sinf
    var p = Math.abs(semi_major_axis * (1 - eccentricity*eccentricity))
    var semi_major_axis = (orbital_elements.perihelion_distance)/(1-eccentricity)
    var orbital_plane= {
     x:x,
     y:y,
     r:r,
     xdot:-Math.sqrt(gm / p) * Math.sin(true_anomaly),
     ydot:Math.sqrt(gm / p) * (eccentricity + Math.cos(true_anomaly))
    }
    return orbital_plane;
  },

  HyperbolicOrbit: function(time){
    var rad = Orb.Const.RAD;
    var gm = this.gm;
    var epoch = this.epoch;
    var orbital_elements = this.orbital_elements;
    var eccentricity = Number(orbital_elements.eccentricity);
    if(orbital_elements.semi_major_axis && orbital_elements.semi_major_axis>0){
       var semi_major_axis = orbital_elements.semi_major_axis;
     }else if(orbital_elements.perihelion_distance){
       var semi_major_axis = orbital_elements.perihelion_distance/(eccentricity-1);
     }
     var mean_motion = Math.sqrt(gm/(semi_major_axis*semi_major_axis*semi_major_axis));
     var elapsed_time = Number(time.jd())-Number(epoch);
     var mean_anomaly = mean_motion*elapsed_time;
     var l=mean_anomaly;
     var u=l/(eccentricity-1);
     var i=0;
     do{
       var ut=u;
       var delta_u=(l-(eccentricity*Math.sinh(u))+u)/((eccentricity*Math.cosh(u))-1);
       u=u+delta_u;
    	 if(i++>100000){
    	   break
    	 }
     }while (Math.abs(ut-u)>0.0000001);
     var eccentric_anomaly = u;
     var p = Math.abs(semi_major_axis * (1 - eccentricity*eccentricity))
     var true_anomaly = 2*Math.atan(Math.sqrt((eccentricity+1)/(eccentricity-1))*Math.tanh(eccentric_anomaly/2));
     var orbital_plane= {
       x:semi_major_axis*(eccentricity-Math.cosh(u)),
       y:semi_major_axis*Math.sqrt(Math.pow(eccentricity,2)-1)*Math.sinh(u),
       r:semi_major_axis*(1-(eccentricity*Math.cosh(u))),
       xdot:-Math.sqrt(gm/p)*Math.sin(true_anomaly),
       ydot:Math.sqrt(gm/p)*(eccentricity+Math.cos(true_anomaly))
     }
    return orbital_plane;
  },

  EclipticRectangular: function(orbital_plane,date){
    var rad = Orb.Const.RAD;
    var orbital_elements = this.orbital_elements;
    var time = new Orb.Time(date)
    var lan = Number(orbital_elements.longitude_of_ascending_node)*rad;
    var ap = Number(orbital_elements.argument_of_periapsis)*rad;
    var inc = Number(orbital_elements.inclination)*rad;
    var op2xyz = function(opx,opy,lan,ap,inc){
      return {
        x: opx*(Math.cos(lan)*Math.cos(ap)-Math.sin(lan)*Math.cos(inc)*Math.sin(ap))-opy*(Math.cos(lan)*Math.sin(ap)+Math.sin(lan)*Math.cos(inc)*Math.cos(ap)),
        y: opx*(Math.sin(lan)*Math.cos(ap)+Math.cos(lan)*Math.cos(inc)*Math.sin(ap))-opy*(Math.sin(lan)*Math.sin(ap)-Math.cos(lan)*Math.cos(inc)*Math.cos(ap)),
        z: opx*Math.sin(inc)*Math.sin(ap)+opy*Math.sin(inc)*Math.cos(ap)
      }
    }
    var vec = op2xyz(orbital_plane.x,orbital_plane.y,lan,ap,inc)
    var dotvec = op2xyz(orbital_plane.xdot,orbital_plane.ydot,lan,ap,inc)
    return {
     x:vec.x,
     y:vec.y,
     z:vec.z,
     xdot:dotvec.x,
     ydot:dotvec.y,
     zdot:dotvec.z,
     orbital_plane:orbital_plane
    };
  },

  OrbitalPlane: function(date){
     var eccentricity = Number(this.orbital_elements.eccentricity);
     var time = new Orb.Time(date)
     if(eccentricity<1.0){
       return this.EllipticalOrbit(time);
     }else if(eccentricity>1.0){
       return  this.HyperbolicOrbit(time);
     }else if(eccentricity == 1.0){
       return  this.ParabolicOrbit(time);
     }
  },

  radec: function(date){
    var op = this.OrbitalPlane(date)
    var xyz = this.EclipticRectangular(op,date);
    var rectangular = Orb.EclipticToEquatorial({ecliptic:xyz,date:date})
    var spherical = Orb.XYZtoRadec(rectangular)
    return {
      'ra':spherical.ra,
      'dec':spherical.dec,
      'distance':spherical.distance,
      "date":date,
      "coordinate_keywords":"equatorial spherical",
      "unit_keywords":"hour degree au"
    }
  },

  xyz: function(date){
    var op = this.OrbitalPlane(date)
    var position = this.EclipticRectangular(op,date);
    return {
      'x':position.x,
      'y':position.y,
      'z':position.z,
      'xdot':position.xdot,
      'ydot':position.ydot,
      'zdot':position.zdot,
      'orbital_plane':op,
     "date":date,
     "coordinate_keywords":"ecliptic rectangular",
     "unit_keywords":"au au/d"
    };
  }
}

Orb.KeplerianToCartesian = Orb.KeplerianToCartesian || Orb.Kepler

Orb.CartesianToKeplerian = Orb.CartesianToKeplerian ||function(cartesian){
  var rad = Math.PI/180;
  if(cartesian.gm){
    var gm = cartesian.gm
  }else{
    var gm = 2.9591220828559093*Math.pow(10,-4);
  }
  if(cartesian.epoch){
    var epoch = cartesian.epoch
  }else if(cartesian.date){
    var time = new Orb.Time(cartesian.date)
    var epoch = time.jd()
  }else{
    var date = new Date()
    var time = new Orb.Time(date)
    var epoch = time.jd()
  }
  var vector = [cartesian.x,cartesian.y,cartesian.z]
  var vectordot = [cartesian.xdot,cartesian.ydot,cartesian.zdot]

  function normalize(v){
    return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])
  }

  function cross(v1,v2){
    var c = []
    c[0] = v1[1] * v2[2] - v1[2] * v2[1]
    c[1] = v1[2] * v2[0] - v1[0] * v2[2]
    c[2] = v1[0] * v2[1] - v1[1] * v2[0]
     return [c[0],c[1],c[2]]
  }

  function dot(v1,v2){
   return v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2]
  }

  var radius = normalize(vector)
  var velocity = normalize(vectordot)

  var energy =  ((velocity*velocity)/2)-(gm/radius)
  var semi_major_axis = -gm/(2*energy)
  var cv = cross(vector,vectordot)
  var normcv = normalize(cv)
  var eccentricity = Math.sqrt(1-((normcv*normcv)/(semi_major_axis*gm)))
  var normcvxy = Math.sqrt(cv[0]*cv[0]+cv[1]*cv[1])
  var inclination = Math.atan2(normcvxy, cv[2])
  var vz = [0,0,1]
  var tc = cross(vz,cv);
  var omega = Math.atan2(tc[1],tc[0])
  var dotrv = dot(vector,vectordot)
  if(dotrv <0){
    var p = Math.abs(semi_major_axis * (1 - eccentricity*eccentricity))
    //var p = semi_major_axis * (1 - eccentricity*eccentricity)
    var true_anomaly = Math.atan2( Math.sqrt(p/gm)*dotrv, p-radius)
  }else{
    var true_anomaly = Math.acos((semi_major_axis*(1-eccentricity*eccentricity)-radius)/(eccentricity*radius))
  }
  var argument_of_latitude = Math.atan2(vector[2]/Math.sin(inclination),vector[0]*Math.cos(omega)+vector[1]*Math.sin(omega))
  var argument_of_periapsis = argument_of_latitude - true_anomaly;

  if(eccentricity>1.0){
    var eccentric_anomaly = 2*Math.atanh(Math.sqrt((eccentricity-1)/(eccentricity+1))*Math.tan(true_anomaly/2));
    var mean_motion = Math.sqrt(gm/-(semi_major_axis*semi_major_axis*semi_major_axis))
    var mean_anomaly = eccentricity*Math.sinh(eccentric_anomaly) - eccentric_anomaly;
  }else{
    var eccentric_anomaly = 2*Math.atan(Math.sqrt((1-eccentricity)/(1+eccentricity))*Math.tan(true_anomaly/2))
    var mean_motion = Math.sqrt(gm/(semi_major_axis*semi_major_axis*semi_major_axis))
    var mean_anomaly = eccentric_anomaly-eccentricity*Math.sin(eccentric_anomaly);
  }

  var time_of_periapsis = epoch - (mean_anomaly/mean_motion)
  function to_deg(num){
    var rad = Math.PI/180;
    var deg = num/rad
    if(deg<0){deg = deg+360}
    if(deg>360){deg=deg%360}
    return deg
  }
  return{
    epoch:epoch,
    semi_major_axis:semi_major_axis,
    eccentricity:eccentricity,
    inclination:to_deg(inclination),
    longitude_of_ascending_node:to_deg(omega),
    true_anomaly:to_deg(true_anomaly),
    mean_anomaly:to_deg(mean_anomaly),
    mean_motion:to_deg(mean_motion),
    time_of_periapsis:time_of_periapsis,
    argument_of_periapsis:to_deg(argument_of_periapsis)
  }
}
Orb.Cartesian = Orb.Cartesian || Orb.CartesianToKeplerian;
