//coodinates.js
//require core.js, time.js, earth.js

import {Earth} from './earth.js'
import {Const} from './core.js'
import {Obliquity} from './nutation.js'

export const RadecToXYZ = (parameter) => {
  // equatorial spherical(ra,dec) to rectangular(x,y,z)
  const rad = Const.RAD;
  const ra = parameter.ra * 15
  const dec = parameter.dec
  const distance = parameter.distance;
  let date;
  if (parameter.date) {
    date = parameter.date;
  } else {
    date = null;
  }
  const xyz = {
    "x": distance * Math.cos(dec * rad) * Math.cos(ra * rad),
    "y": distance * Math.cos(dec * rad) * Math.sin(ra * rad),
    "z": distance * Math.sin(dec * rad)
  }
  return {
    'x': xyz.x,
    'y': xyz.y,
    'z': xyz.z,
    'date': date,
    "coordinate_keywords": "equatorial rectangular",
    "unit_keywords": ""
  }
}

export const XYZtoRadec = function (parameter) {
  // equatorial rectangular(x,y,z) to spherical(ra,dec)
  let date,rect;
  if (parameter.coordinate_keywords && parameter.coordinate_keywords.match(/ecliptic/)) {
    if (parameter.date) {
      date = parameter.date
    } else {
      date = new Date()
    }
    rect = EclipticToEquatorial({ "date": date, "ecliptic": parameter })
  } else {
    rect = parameter
    if (parameter.date) {
      date = parameter.date;
    } else {
      date = null;
    }
  }
  const rad = Math.PI / 180;
  const eqx = rect.x;
  const eqy = rect.y;
  const eqz = rect.z;
  let ra = Math.atan2(eqy, eqx) / rad;
  if (ra < 0) {
    ra = ra % 360 + 360
  }
  if (ra > 360) {
    ra = ra % 360
  }
  ra = ra / 15
  const dec = Math.atan2(eqz, Math.sqrt(eqx * eqx + eqy * eqy)) / rad;
  const distance = Math.sqrt(eqx * eqx + eqy * eqy + eqz * eqz);
  return {
    "ra": ra,
    "dec": dec,
    "distance": distance,
    "date": date,
    "coordinate_keywords": "equatorial spherical",
    "unit_keywords": "hours degree"
  };
}

export const EquatorialToEcliptic = function (parameter) {
  // equatorial rectangular(x,y,z) to ecliptic rectangular(x,y,z)
  const date = parameter.date
  const obliquity = Obliquity(date)
  const equatorial = parameter.equatorial
  const rad = Const.RAD;
  const ecliptic = {
    x: equatorial.x,
    y: Math.cos(obliquity * rad) * equatorial.y + Math.sin(obliquity * rad) * equatorial.z,
    z: -Math.sin(obliquity * rad) * equatorial.y + Math.cos(obliquity * rad) * equatorial.z
  }
  return {
    'x': ecliptic.x,
    'y': ecliptic.y,
    'z': ecliptic.z,
    'date': date,
    "coordinate_keywords": "ecliptic rectangular",
    "unit_keywords": ""
  }
}

export const EclipticToEquatorial = function (parameter) {
  // ecliptic rectangular(x,y,z) to equatorial rectangular(x,y,z)
  const date = parameter.date
  const ecliptic = parameter.ecliptic
  const rad = Const.RAD;
  const earth = new Earth();
  const ep = earth.xyz(date)
  const gcx = ecliptic.x - ep.x;
  const gcy = ecliptic.y - ep.y;
  const gcz = ecliptic.z - ep.z;
  const obliquity = Obliquity(parameter.date)
  const ecl = obliquity;
  const equatorial = {
    x: gcx,
    y: gcy * Math.cos(ecl * rad) - gcz * Math.sin(ecl * rad),
    z: gcy * Math.sin(ecl * rad) + gcz * Math.cos(ecl * rad)
  }
  return {
    'x': equatorial.x,
    'y': equatorial.y,
    'z': equatorial.z,
    'date': date,
    "coordinate_keywords": "equatorial rectangular",
    "unit_keywords": ""
  }
}