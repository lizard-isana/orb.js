//kepler.js
//require core.js, time.js, coordinates.js, earth.js

import {Constant} from './orb-core.js'
import {Time} from './orb-time.js'
import {EclipticToEquatorial, XYZtoRadec} from './orb-coordinates.js'
import {legacyOrbitalPlane} from './kepler/legacy.js'

const hasFiniteOrbitalValue = (value) => {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

export class Kepler{
  constructor(orbital_elements){
    this.orbital_elements = orbital_elements;
    if (orbital_elements.gm) {
      var gm = Number(orbital_elements.gm);
    } else {
      var gm = Constant.GM;
    }
    this.gm = gm;
    if (hasFiniteOrbitalValue(orbital_elements.time_of_periapsis)) {
      var epoch = orbital_elements.time_of_periapsis;
    } else {
      var epoch = orbital_elements.epoch;
    }
    this.epoch = epoch;
    if (orbital_elements.perihelion_distance) {
      orbital_elements.periapsis_distance = orbital_elements.perihelion_distance;
    }  
  }

  EllipticalOrbit = (time) => {
    return legacyOrbitalPlane(this.orbital_elements, time.jd(), this.gm);
  }

  HyperbolicOrbit = (time) => {
    return legacyOrbitalPlane(this.orbital_elements, time.jd(), this.gm);
  }

  ParabolicOrbit = (time) => {
    return legacyOrbitalPlane(this.orbital_elements, time.jd(), this.gm);
  }

  EclipticRectangular = (orbital_plane, date) => {
    var rad = Constant.RAD;
    var orbital_elements = this.orbital_elements;
    var time = new Time(date)
    var lan = Number(orbital_elements.longitude_of_ascending_node) * rad;
    var ap = Number(orbital_elements.argument_of_periapsis) * rad;
    var inc = Number(orbital_elements.inclination) * rad;
    var op2xyz = function (opx, opy, lan, ap, inc) {
      return {
        x: opx * (Math.cos(lan) * Math.cos(ap) - Math.sin(lan) * Math.cos(inc) * Math.sin(ap)) - opy * (Math.cos(lan) * Math.sin(ap) + Math.sin(lan) * Math.cos(inc) * Math.cos(ap)),
        y: opx * (Math.sin(lan) * Math.cos(ap) + Math.cos(lan) * Math.cos(inc) * Math.sin(ap)) - opy * (Math.sin(lan) * Math.sin(ap) - Math.cos(lan) * Math.cos(inc) * Math.cos(ap)),
        z: opx * Math.sin(inc) * Math.sin(ap) + opy * Math.sin(inc) * Math.cos(ap)
      }
    }
    var vec = op2xyz(orbital_plane.x, orbital_plane.y, lan, ap, inc)
    var dotvec = op2xyz(orbital_plane.xdot, orbital_plane.ydot, lan, ap, inc)
    return {
      x: vec.x,
      y: vec.y,
      z: vec.z,
      xdot: dotvec.x,
      ydot: dotvec.y,
      zdot: dotvec.z,
      orbital_plane: orbital_plane,
      "coordinate_keywords": "ecliptic rectangular j2000"
    };
  }

  OrbitalPlane = (date) => {
    var eccentricity = Number(this.orbital_elements.eccentricity);
    var time = new Time(date)
    if (eccentricity < 1.0) {
      return this.EllipticalOrbit(time);
    } else if (eccentricity > 1.0) {
      return this.HyperbolicOrbit(time);
    } else if (eccentricity == 1.0) {
      return this.ParabolicOrbit(time);
    }
  }

  radec = (date) => {
    var op = this.OrbitalPlane(date)
    var xyz = this.EclipticRectangular(op, date);
    var rectangular = EclipticToEquatorial({ ecliptic: xyz, date: date })
    var spherical = XYZtoRadec(rectangular)
    return {
      'ra': spherical.ra,
      'dec': spherical.dec,
      'distance': spherical.distance,
      "date": date,
      "coordinate_keywords": "equatorial spherical",
      "unit_keywords": "hour degree au"
    }
  }

  xyz = (date) => {
    var op = this.OrbitalPlane(date)
    var position = this.EclipticRectangular(op, date);
    return {
      'x': position.x,
      'y': position.y,
      'z': position.z,
      'xdot': position.xdot,
      'ydot': position.ydot,
      'zdot': position.zdot,
      'orbital_plane': op,
      "date": date,
      "coordinate_keywords": "ecliptic rectangular j2000",
      "unit_keywords": "au au/d"
    };
  }
}

export class KeplerianToCartesian{ 
  constructor(orbital_elements){
    return new Kepler(orbital_elements)
  }
};

export class CartesianToKeplerian  { 
  constructor(cartesian){
    return new Cartesian(cartesian)
  }
};

export class Cartesian { 
  constructor(cartesian){
    const rad = Constant.RAD;
    if (cartesian.gm) {
      var gm = cartesian.gm
    } else {
      var gm = 2.9591220828559093 * Math.pow(10, -4);
    }
    if (cartesian.epoch) {
      var epoch = cartesian.epoch
    } else if (cartesian.date) {
      var time = new Time(cartesian.date)
      var epoch = time.jd()
    } else {
      var date = new Date()
      var time = new Time(date)
      var epoch = time.jd()
    }
    var vector = [cartesian.x, cartesian.y, cartesian.z]
    var vectordot = [cartesian.xdot, cartesian.ydot, cartesian.zdot]

    function normalize(v) {
      return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    }

    function cross(v1, v2) {
      var c = []
      c[0] = v1[1] * v2[2] - v1[2] * v2[1]
      c[1] = v1[2] * v2[0] - v1[0] * v2[2]
      c[2] = v1[0] * v2[1] - v1[1] * v2[0]
      return [c[0], c[1], c[2]]
    }

    function dot(v1, v2) {
      return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
    }

    var radius = normalize(vector)
    var velocity = normalize(vectordot)

    var energy = Math.abs((velocity * velocity) / 2) - (gm / radius)
    var semi_major_axis = -gm / (2 * energy)
    var cv = cross(vector, vectordot)
    var normcv = normalize(cv)
    var eccentricity = Math.sqrt(1 - ((normcv * normcv) / (semi_major_axis * gm)))
    var normcvxy = Math.sqrt(cv[0] * cv[0] + cv[1] * cv[1])
    var inclination = Math.atan2(normcvxy, cv[2])
    var vz = [0, 0, 1]
    var tc = cross(vz, cv);
    var omega = Math.atan2(tc[1], tc[0])
    var dotrv = dot(vector, vectordot)
    if (dotrv < 0) {
      var p = Math.abs(semi_major_axis * (1 - eccentricity * eccentricity))
      //var p = semi_major_axis * (1 - eccentricity*eccentricity)
      var true_anomaly = Math.atan2(Math.sqrt(p / gm) * dotrv, p - radius)
    } else {
      var true_anomaly = Math.acos((semi_major_axis * (1 - eccentricity * eccentricity) - radius) / (eccentricity * radius))
    }
    var argument_of_latitude = Math.atan2(vector[2] / Math.sin(inclination), vector[0] * Math.cos(omega) + vector[1] * Math.sin(omega))
    var argument_of_periapsis = argument_of_latitude - true_anomaly;

    if (eccentricity > 1.0) {
      var eccentric_anomaly = 2 * Math.atanh(Math.sqrt((eccentricity - 1) / (eccentricity + 1)) * Math.tan(true_anomaly / 2));
      var mean_motion = Math.sqrt(gm / -(semi_major_axis * semi_major_axis * semi_major_axis))
      var mean_anomaly = eccentricity * Math.sinh(eccentric_anomaly) - eccentric_anomaly;
    } else {
      var eccentric_anomaly = 2 * Math.atan(Math.sqrt((1 - eccentricity) / (1 + eccentricity)) * Math.tan(true_anomaly / 2))
      var mean_motion = Math.sqrt(gm / (semi_major_axis * semi_major_axis * semi_major_axis))
      var mean_anomaly = eccentric_anomaly - eccentricity * Math.sin(eccentric_anomaly);
    }

    var time_of_periapsis = epoch - (mean_anomaly / mean_motion)
    var periapsis_distance = (1 - eccentricity) * semi_major_axis;
    function to_deg(num) {
      var rad = Math.PI / 180;
      var deg = num / rad
      if (deg < 0) { deg = deg + 360 }
      if (deg > 360) { deg = deg % 360 }
      return deg
    }
    return {
      epoch: epoch,
      semi_major_axis: semi_major_axis,
      eccentricity: eccentricity,
      inclination: to_deg(inclination),
      longitude_of_ascending_node: to_deg(omega),
      true_anomaly: to_deg(true_anomaly),
      mean_anomaly: to_deg(mean_anomaly),
      mean_motion: to_deg(mean_motion),
      time_of_periapsis: time_of_periapsis,
      argument_of_periapsis: to_deg(argument_of_periapsis),
      periapsis_distance: periapsis_distance
    }
  }
}
