//coodinates.js
//require core.js, time.js, earth.js

import {Earth} from './orb-earth.js'
import {Const} from './orb-core.js'
import {Time} from './orb-time.js'
import {MeanObliquity, Nutation, Obliquity} from './orb-obliquity.js'
import {J2000Epoch, Precession} from './orb-precession.js'

const copyCenterMetadata = (target, source = {}) => {
  for (const key of ['center', 'center_keywords', 'origin']) {
    if (source[key] != undefined) target[key] = source[key];
  }
  return target;
}

const cloneRectangular = (position = {}) => {
  return copyCenterMetadata({
    x: Number(position.x) || 0,
    y: Number(position.y) || 0,
    z: Number(position.z) || 0
  }, position);
}

const normalizeEpoch = (epoch) => {
  const normalized = String(epoch ? epoch : '').trim().toLowerCase();
  return normalized === 'j2000' ? 'j2000' : 'of_date';
}

const resolveObliquityForEpoch = ({ date = null, epoch = 'of_date' } = {}) => {
  const targetDate = date instanceof Date ? date : new Date(date ? date : Date.now());
  const referenceDate = normalizeEpoch(epoch) === 'j2000'
    ? J2000Epoch
    : targetDate;
  return Obliquity(referenceDate);
}

const heliocentricDistanceUnit = (ecliptic) => {
  const keywords = ecliptic.unit_keywords;
  if (keywords == undefined || keywords === '') return 'au';
  if (typeof keywords === 'string') {
    if (/km/i.test(keywords)) return 'km';
    if (/au/i.test(keywords)) return 'au';
  }
  throw new RangeError(
    `EclipticToEquatorial: unsupported heliocentric unit_keywords '${keywords}'`
  );
}

const geocentricEcliptic = (parameter) => {
  const date = parameter.date;
  const ecliptic = parameter.ecliptic;
  const geocentric = parameter.origin === 'geocentric'
    || ecliptic.origin === 'geocentric'
    || ecliptic.center === 'earth'
    || (typeof ecliptic.center_keywords === 'string'
      && /earth|geocentric/i.test(ecliptic.center_keywords))
    || (typeof ecliptic.coordinate_keywords === 'string'
      && /geocentric/i.test(ecliptic.coordinate_keywords));
  if (geocentric) {
    return copyCenterMetadata({
      x: Number(ecliptic.x),
      y: Number(ecliptic.y),
      z: Number(ecliptic.z),
      date: date,
      coordinate_keywords: ecliptic.coordinate_keywords,
      center_keywords: ecliptic.center_keywords || "earth",
      unit_keywords: ecliptic.unit_keywords || ""
    }, ecliptic);
  }
  const earth = new Earth();
  const ep = earth.xyz(date);
  const earthScale = heliocentricDistanceUnit(ecliptic) === 'km' ? Const.AU : 1;
  return {
    x: ecliptic.x - ep.x * earthScale,
    y: ecliptic.y - ep.y * earthScale,
    z: ecliptic.z - ep.z * earthScale,
    date: date,
    coordinate_keywords: "ecliptic rectangular",
    center_keywords: "earth",
    unit_keywords: ecliptic.unit_keywords || ""
  }
}

const rotateEclipticToEquatorial = (parameter) => {
  const rad = Const.RAD;
  const obliquity = parameter.obliquity;
  const ecliptic = parameter.ecliptic;
  return {
    x: ecliptic.x,
    y: ecliptic.y * Math.cos(obliquity * rad) - ecliptic.z * Math.sin(obliquity * rad),
    z: ecliptic.y * Math.sin(obliquity * rad) + ecliptic.z * Math.cos(obliquity * rad)
  }
}

const rotateRectangularOnXAxis = (position, radians) => {
  const source = cloneRectangular(position);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return copyCenterMetadata({
    x: source.x,
    y: (cos * source.y) - (sin * source.z),
    z: (sin * source.y) + (cos * source.z)
  }, position);
}

// Convert an ecliptic rectangular vector referred to the equinox of J2000.0
// (as produced by VSOP87A and typical published osculating elements) to the
// apparent ecliptic of date. The rotations follow the IAU 1976 precession
// model used elsewhere in orb.js, followed by the library's nutation model.
export const EclipticJ2000ToDate = (vector, date) => {
  const rad = Const.RAD;
  const time = new Time(date);
  const t = (time.jd_tt() - 2451545.0) / 36525;
  const arcsecond = rad / 3600;
  const zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t * t * t) * arcsecond;
  const z = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t * t * t) * arcsecond;
  const theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t * t * t) * arcsecond;

  // J2000 ecliptic -> J2000 equatorial.
  const obliquityJ2000 = (23 + 26.0 / 60 + 21.448 / 3600) * rad;
  const ex = vector.x;
  const ey = Math.cos(obliquityJ2000) * vector.y - Math.sin(obliquityJ2000) * vector.z;
  const ez = Math.sin(obliquityJ2000) * vector.y + Math.cos(obliquityJ2000) * vector.z;

  // J2000 equator -> mean equator and equinox of date.
  const cosZeta = Math.cos(zeta);
  const sinZeta = Math.sin(zeta);
  const cosZ = Math.cos(z);
  const sinZ = Math.sin(z);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const px = (cosZ * cosTheta * cosZeta - sinZ * sinZeta) * ex
    + (-cosZ * cosTheta * sinZeta - sinZ * cosZeta) * ey
    + (-cosZ * sinTheta) * ez;
  const py = (sinZ * cosTheta * cosZeta + cosZ * sinZeta) * ex
    + (-sinZ * cosTheta * sinZeta + cosZ * cosZeta) * ey
    + (-sinZ * sinTheta) * ez;
  const pz = (sinTheta * cosZeta) * ex
    + (-sinTheta * sinZeta) * ey
    + cosTheta * ez;

  // Mean equator of date -> mean ecliptic of date.
  const meanObliquity = MeanObliquity(date) * rad;
  const mx = px;
  const my = Math.cos(meanObliquity) * py + Math.sin(meanObliquity) * pz;
  const mz = -Math.sin(meanObliquity) * py + Math.cos(meanObliquity) * pz;

  // Mean equinox -> true equinox of date.
  const nutation = Nutation(date) * rad;
  return copyCenterMetadata({
    x: Math.cos(nutation) * mx - Math.sin(nutation) * my,
    y: Math.sin(nutation) * mx + Math.cos(nutation) * my,
    z: mz,
    date: date,
    coordinate_keywords: "ecliptic rectangular",
    center_keywords: vector.center_keywords || "",
    unit_keywords: vector.unit_keywords || ""
  }, vector);
}

export const ConvertRectangularPlane = function ({
  position = {},
  from_plane = 'ecliptic',
  to_plane = 'ecliptic',
  date = new Date(),
  epoch = 'of_date'
} = {}) {
  const sourcePlane = String(from_plane ? from_plane : '').trim().toLowerCase() === 'equatorial'
    ? 'equatorial'
    : 'ecliptic';
  const targetPlane = String(to_plane ? to_plane : '').trim().toLowerCase() === 'equatorial'
    ? 'equatorial'
    : 'ecliptic';

  if (sourcePlane === targetPlane) {
    return cloneRectangular(position);
  }

  const obliquity = resolveObliquityForEpoch({ date, epoch }) * Const.RAD;
  if (sourcePlane === 'ecliptic' && targetPlane === 'equatorial') {
    return rotateRectangularOnXAxis(position, obliquity);
  }
  return rotateRectangularOnXAxis(position, -obliquity);
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
  return copyCenterMetadata({
    'x': xyz.x,
    'y': xyz.y,
    'z': xyz.z,
    'date': date,
    "coordinate_keywords": "equatorial rectangular",
    "unit_keywords": unit_keywords
  }, parameter)
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
  return copyCenterMetadata({
    "ra": ra,
    "dec": dec,
    "distance": distance,
    "date": date,
    "coordinate_keywords": "equatorial spherical",
    "center_keywords": rect.center_keywords != undefined ? rect.center_keywords : "",
    "unit_keywords": "hours degree" + distance_unit
  }, rect);
}

export const XYZtoRadecOfDate = function (parameter) {
  const date = parameter.date || new Date();
  if (parameter.coordinate_keywords && parameter.coordinate_keywords.match(/ecliptic/)) {
    const rect = EclipticToEquatorialOfDate({ date: date, ecliptic: parameter });
    return XYZtoRadec(rect);
  }

  const spherical = XYZtoRadec(parameter);
  return Precession({
    ...spherical,
    from: J2000Epoch,
    to: date
  });
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
  return copyCenterMetadata({
    'x': ecliptic.x,
    'y': ecliptic.y,
    'z': ecliptic.z,
    'date': date,
    "coordinate_keywords": "ecliptic rectangular",
    "unit_keywords": equatorial.unit_keywords != undefined ? equatorial.unit_keywords : ""
  }, equatorial)
}

export const EclipticToEquatorial = function (parameter) {
  // ecliptic rectangular(x,y,z) to equatorial rectangular(x,y,z)
  const date = parameter.date
  const source = parameter.ecliptic;
  let ecliptic = geocentricEcliptic(parameter);
  if(source.coordinate_keywords && source.coordinate_keywords.match(/j2000/i)){
    ecliptic = EclipticJ2000ToDate(ecliptic, date);
  }
  const obliquity = Obliquity(parameter.date)
  const equatorial = rotateEclipticToEquatorial({ ecliptic: ecliptic, obliquity: obliquity });
  return copyCenterMetadata({
    'x': equatorial.x,
    'y': equatorial.y,
    'z': equatorial.z,
    'date': date,
    "coordinate_keywords": "equatorial rectangular",
    "center_keywords": ecliptic.center_keywords || "earth",
    "unit_keywords": ecliptic.unit_keywords != undefined ? ecliptic.unit_keywords : ""
  }, ecliptic)
}

export const EclipticToEquatorialJ2000 = function (parameter) {
  const date = parameter.date;
  const ecliptic = geocentricEcliptic(parameter);
  const obliquity = MeanObliquity(J2000Epoch);
  const equatorial = rotateEclipticToEquatorial({ ecliptic: ecliptic, obliquity: obliquity });
  return copyCenterMetadata({
    'x': equatorial.x,
    'y': equatorial.y,
    'z': equatorial.z,
    'date': date,
    "coordinate_keywords": "equatorial rectangular",
    "center_keywords": ecliptic.center_keywords || "earth",
    "unit_keywords": ecliptic.unit_keywords != undefined ? ecliptic.unit_keywords : ""
  }, ecliptic)
}

export const EclipticToEquatorialOfDate = function (parameter) {
  const date = parameter.date;
  const ecliptic = EclipticJ2000ToDate(geocentricEcliptic(parameter), date);
  const obliquity = Obliquity(date);
  const rect = rotateEclipticToEquatorial({ ecliptic: ecliptic, obliquity: obliquity });
  return copyCenterMetadata({
    'x': rect.x,
    'y': rect.y,
    'z': rect.z,
    'date': date,
    "coordinate_keywords": "equatorial rectangular",
    "center_keywords": ecliptic.center_keywords || "earth",
    "unit_keywords": ecliptic.unit_keywords != undefined ? ecliptic.unit_keywords : ""
  }, ecliptic)
}
