//coodinates.js
//require core.js, time.js, earth.js

import {Earth} from './orb-earth.js'
import {Const} from './orb-core.js'
import {MeanObliquity, Obliquity} from './orb-obliquity.js'
import {J2000Epoch, Precession} from './orb-precession.js'

const cloneRectangular = (position = {}) => {
  return {
    x: Number(position.x) || 0,
    y: Number(position.y) || 0,
    z: Number(position.z) || 0
  };
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

const geocentricEcliptic = (parameter) => {
  const date = parameter.date;
  const ecliptic = parameter.ecliptic;
  const earth = new Earth();
  const ep = earth.xyz(date);
  return {
    x: ecliptic.x - ep.x,
    y: ecliptic.y - ep.y,
    z: ecliptic.z - ep.z,
    date: date,
    coordinate_keywords: "ecliptic rectangular",
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
  return {
    x: source.x,
    y: (cos * source.y) - (sin * source.z),
    z: (sin * source.y) + (cos * source.z)
  };
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

export const XYZtoRadecOfDate = function (parameter) {
  const date = parameter.date || new Date();
  let spherical;

  if (parameter.coordinate_keywords && parameter.coordinate_keywords.match(/ecliptic/)) {
    const rect = EclipticToEquatorialJ2000({ date: date, ecliptic: parameter });
    spherical = XYZtoRadec(rect);
  } else {
    spherical = XYZtoRadec(parameter);
  }

  return Precession({
    ra: spherical.ra,
    dec: spherical.dec,
    distance: spherical.distance,
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
  const ecliptic = geocentricEcliptic(parameter);
  const obliquity = Obliquity(parameter.date)
  const equatorial = rotateEclipticToEquatorial({ ecliptic: ecliptic, obliquity: obliquity });
  return {
    'x': equatorial.x,
    'y': equatorial.y,
    'z': equatorial.z,
    'date': date,
    "coordinate_keywords": "equatorial rectangular",
    "unit_keywords": ""
  }
}

export const EclipticToEquatorialJ2000 = function (parameter) {
  const date = parameter.date;
  const ecliptic = geocentricEcliptic(parameter);
  const obliquity = MeanObliquity(J2000Epoch);
  const equatorial = rotateEclipticToEquatorial({ ecliptic: ecliptic, obliquity: obliquity });
  return {
    'x': equatorial.x,
    'y': equatorial.y,
    'z': equatorial.z,
    'date': date,
    "coordinate_keywords": "equatorial rectangular",
    "unit_keywords": ""
  }
}

export const EclipticToEquatorialOfDate = function (parameter) {
  const date = parameter.date;
  const rectJ2000 = EclipticToEquatorialJ2000(parameter);
  const spherical = XYZtoRadec(rectJ2000);
  const precessed = Precession({
    ra: spherical.ra,
    dec: spherical.dec,
    distance: spherical.distance,
    from: J2000Epoch,
    to: date
  });
  const rect = RadecToXYZ(precessed);
  return {
    'x': rect.x,
    'y': rect.y,
    'z': rect.z,
    'date': date,
    "coordinate_keywords": "equatorial rectangular",
    "unit_keywords": ""
  }
}
