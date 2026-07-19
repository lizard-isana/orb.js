//coodinates.js
//require core.js, time.js, earth.js

import {Earth} from './orb-earth.js'
import {Const} from './orb-core.js'
import {Time} from './orb-time.js'
import {Obliquity, MeanObliquity, Nutation} from './orb-obliquity.js'

//Convert an ecliptic rectangular vector referred to the equinox of J2000.0
//(as produced by VSOP87A and by typical published osculating elements) to
//the apparent ecliptic of date: rotate to the J2000 equator, apply the
//IAU 1976 precession angles (zeta, z, theta), rotate back through the mean
//obliquity of date, then rotate by the nutation in longitude to reach the
//true equinox of date.
export const EclipticJ2000ToDate = (vec, date) => {
  const rad = Const.RAD;
  const time = new Time(date);
  const t = (time.jd_tt() - 2451545.0) / 36525;
  const asec = rad / 3600;
  const zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t * t * t) * asec;
  const z = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t * t * t) * asec;
  const theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t * t * t) * asec;
  //J2000 ecliptic -> J2000 equatorial (mean obliquity at J2000.0: 23d26m21.448s)
  const e0 = (23 + 26.0 / 60 + 21.448 / 3600) * rad;
  const ex = vec.x;
  const ey = Math.cos(e0) * vec.y - Math.sin(e0) * vec.z;
  const ez = Math.sin(e0) * vec.y + Math.cos(e0) * vec.z;
  //precession: J2000 equator -> mean equator and equinox of date
  const cz = Math.cos(zeta), sz = Math.sin(zeta);
  const cZ = Math.cos(z), sZ = Math.sin(z);
  const ct = Math.cos(theta), st = Math.sin(theta);
  const px = (cZ * ct * cz - sZ * sz) * ex + (-cZ * ct * sz - sZ * cz) * ey + (-cZ * st) * ez;
  const py = (sZ * ct * cz + cZ * sz) * ex + (-sZ * ct * sz + cZ * cz) * ey + (-sZ * st) * ez;
  const pz = (st * cz) * ex + (-st * sz) * ey + ct * ez;
  //mean equator of date -> mean ecliptic of date
  const em = MeanObliquity(date) * rad;
  const mx = px;
  const my = Math.cos(em) * py + Math.sin(em) * pz;
  const mz = -Math.sin(em) * py + Math.cos(em) * pz;
  //nutation in longitude: mean equinox -> true equinox of date
  const dpsi = Nutation(date) * rad;
  return {
    x: Math.cos(dpsi) * mx - Math.sin(dpsi) * my,
    y: Math.sin(dpsi) * mx + Math.cos(dpsi) * my,
    z: mz,
    'date': date,
    "coordinate_keywords": "ecliptic rectangular",
    "unit_keywords": vec.unit_keywords != undefined ? vec.unit_keywords : ""
  }
}

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
  let unit_keywords = "";
  if (parameter.unit_keywords != undefined) {
    if (parameter.unit_keywords.match(/km/)) {
      unit_keywords = "km"
    } else if (parameter.unit_keywords.match(/au/)) {
      unit_keywords = "au"
    }
  }
  return {
    'x': xyz.x,
    'y': xyz.y,
    'z': xyz.z,
    'date': date,
    "coordinate_keywords": "equatorial rectangular",
    "unit_keywords": unit_keywords
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
  let distance_unit = "";
  if (rect.unit_keywords != undefined) {
    if (rect.unit_keywords.match(/km/)) {
      distance_unit = " km"
    } else if (rect.unit_keywords.match(/au/)) {
      distance_unit = " au"
    }
  }
  return {
    "ra": ra,
    "dec": dec,
    "distance": distance,
    "date": date,
    "coordinate_keywords": "equatorial spherical",
    "unit_keywords": "hours degree" + distance_unit
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
    "unit_keywords": equatorial.unit_keywords != undefined ? equatorial.unit_keywords : ""
  }
}

export const EclipticToEquatorial = function (parameter) {
  // ecliptic rectangular(x,y,z) to equatorial rectangular(x,y,z)
  const date = parameter.date
  const ecliptic = parameter.ecliptic
  const rad = Const.RAD;
  const earth = new Earth();
  const ep = earth.xyz(date)
  let gc = {
    x: ecliptic.x - ep.x,
    y: ecliptic.y - ep.y,
    z: ecliptic.z - ep.z,
    unit_keywords: ecliptic.unit_keywords
  }
  //Vectors referred to the J2000 equinox (VSOP planets, osculating elements)
  //are precessed/nutated to the equinox of date, so the resulting RA/Dec is
  //an apparent place consistent with the Sun and Moon theories, which give
  //coordinates of date directly.
  if (ecliptic.coordinate_keywords != undefined && ecliptic.coordinate_keywords.match(/j2000/)) {
    gc = EclipticJ2000ToDate(gc, date)
  }
  const gcx = gc.x;
  const gcy = gc.y;
  const gcz = gc.z;
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
    "unit_keywords": ecliptic.unit_keywords != undefined ? ecliptic.unit_keywords : ""
  }
}