//sun.js

import {Constant,RoundAngle} from './core.js'
import {Time} from './time.js'
import {NutationAndObliquity} from './nutation.js'

export class Sun{
  constructor(){}

  EclipticLongitude = (date) => {
    const rad = Constant.RAD;
    const time = new Time(date)
    //var dt = DeltaT()/86400;
    //var dt = 64/86400;
    const jd = time.jd();// + dt;
    const t = (jd - 2451545.0) / 36525;
    const mean_longitude = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
    const mean_anomaly = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
    const eccentricity = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
    let equation = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(mean_anomaly * rad);
    equation += (0.019993 - 0.000101 * t) * Math.sin(2 * mean_anomaly * rad);
    equation += 0.000289 * Math.sin(3 * mean_anomaly * rad);
    const true_longitude = mean_longitude + equation;
    const true_anomary = mean_anomaly + equation;
    const radius = (1.000001018 * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(true_anomary * rad));
    const nao = NutationAndObliquity(date);
    const nutation = nao.nutation;
    const obliquity = nao.obliquity;
    const apparent_longitude = true_longitude + nutation;
    const longitude = apparent_longitude;
    const distance = radius; //* 149597870.691;
    return {
      longitude: longitude,
      distance: distance,
      obliquity: obliquity
    }
  }

  SphericalToRectangler = (spherical) =>{
    const rad = Constant.RAD;
    const longitude = spherical.longitude;
    const distance = spherical.distance;
    const obliquity = spherical.obliquity;
    return {
      x: distance * Math.cos(longitude * rad),
      y: distance * (Math.sin(longitude * rad) * Math.cos(obliquity * rad)),
      z: distance * (Math.sin(longitude * rad) * Math.sin(obliquity * rad))
    }
  }

  EclipticToEquatorial = (ecliptic) => {
    const rad = Constant.RAD;
    const longitude = ecliptic.longitude
    const distance = ecliptic.distance
    const obliquity = ecliptic.obliquity
    let ra = Math.atan2(Math.cos(obliquity * rad) * Math.sin(longitude * rad), Math.cos(longitude * rad))
    ra = RoundAngle(ra / rad);
    ra = ra / 15
    let dec = Math.asin(Math.sin(obliquity * rad) * Math.sin(longitude * rad));
    dec = dec / rad;
    return {
      ra: ra,
      dec: dec,
      distance: distance
    }
  }

  radec = (date) => {
    const ecliptic = this.EclipticLongitude(date)
    const radec = this.EclipticToEquatorial(ecliptic)
    return {
      "ra": radec.ra,
      "dec": radec.dec,
      "distance": radec.distance,
      "date": date,
      "coordinate_keywords": "equatorial spherical",
      "unit_keywords": "degree hour au"
    }
  }

  xyz = (date) => {
    const spherical = this.EclipticLongitude(date)
    const xyz = this.SphericalToRectangler(spherical)
    return {
      x: xyz.x,
      y: xyz.y,
      z: xyz.z,
      "date": date,
      "coordinate_keywords": "equatorial rectangular",
      "unit_keywords": "au"
    }
  }
}
