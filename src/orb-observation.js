//orb-observation.js

import {Constant} from './orb-core.js'
import {Time} from './orb-time.js'
import {EclipticToEquatorial, RadecToXYZ} from './orb-coordinates.js'
import {geodeticToEcef} from './geodesy/index.js'

const finiteNumber = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new TypeError(`Observation: ${label} must be finite`);
  }
  return number;
}

const rectangularCoordinates = (rect) => {
  if (!rect || typeof rect !== 'object') {
    throw new TypeError('Observation: rectangular target must be an object');
  }
  return {
    x: finiteNumber(rect.x, 'rectangular target x'),
    y: finiteNumber(rect.y, 'rectangular target y'),
    z: finiteNumber(rect.z, 'rectangular target z')
  };
}

const coordinateKind = (target) => {
  if (typeof target.coordinate_keywords !== 'string' || target.coordinate_keywords.trim() === '') {
    throw new TypeError(
      'Observation: rectangular target coordinate_keywords must identify ecliptic, equatorial, or TEME coordinates'
    );
  }
  if (/ecliptic/i.test(target.coordinate_keywords)) return 'ecliptic';
  if (/teme/i.test(target.coordinate_keywords)) return 'teme';
  if (/equatorial/i.test(target.coordinate_keywords)) return 'equatorial';
  throw new RangeError(
    `Observation: unsupported rectangular coordinate_keywords '${target.coordinate_keywords}'`
  );
}

const distanceUnit = (target, required = false) => {
  const keywords = target && target.unit_keywords;
  if (typeof keywords === 'string') {
    if (/km/i.test(keywords)) return 'km';
    if (/au/i.test(keywords)) return 'au';
  }
  if (!required) return undefined;
  if (keywords == undefined || keywords === '') {
    throw new TypeError('Observation: rectangular target unit_keywords must identify km or au');
  }
  throw new RangeError(`Observation: unsupported rectangular unit_keywords '${keywords}'`);
}

export class Observer {
  constructor(position){
    this.latitude = finiteNumber(position.latitude, 'observer latitude')
    this.longitude = finiteNumber(position.longitude, 'observer longitude')
    this.altitude = position.altitude == undefined
      ? 0
      : finiteNumber(position.altitude, 'observer altitude')
  }

  //sidereal_time (hours) defaults to apparent sidereal time; pass
  //time.gmst82() to place the observer in the TEME frame instead.
  rectangular = (time, sidereal_time) =>{
    const rad = Constant.RAD;
    const lat = Number(this.latitude);
    const lng = Number(this.longitude);
    const altitude = this.altitude == undefined ? 0 : Number(this.altitude);
    const gmst = sidereal_time != undefined ? sidereal_time : time.gast();
    const position = geodeticToEcef({
      latitude: lat * rad,
      longitude: (lng + gmst * 15) * rad,
      height: altitude
    });
    return {
      x: position[0],
      y: position[1],
      z: position[2]
    }
  }
}

export class Observation {
  constructor(param){
    const observer = new Observer(param.observer);
    this.observer = {
      latitude: observer.latitude,
      longitude: observer.longitude,
      altitude: observer.altitude
    };
    this.target = param.target;
  }

  AtmosphericRefraction = (elevation) =>{
    const rad = Constant.RAD;
    const tmp = elevation+7.31/(elevation + 4.4)
    const ar = 0.0167*rad/(Math.tan(tmp*rad))/rad
    return ar
  }

  RadecToHorizontal = (time,radec) => {
    const rad = Constant.RAD;
    const observer = this.observer;
    const ra = finiteNumber(radec.ra, 'right ascension');
    let dec = finiteNumber(radec.dec, 'declination');
    let distance;
    if(radec.distance != undefined){
      distance = finiteNumber(radec.distance, 'distance');
    }else{
      distance = undefined
    }
    const latitude = finiteNumber(observer.latitude, 'observer latitude');
    const longitude = finiteNumber(observer.longitude, 'observer longitude');
    dec = dec*rad
    const gmst = time.gast();
    const hour_angle = (gmst*15 + longitude - (ra*15));
    const h = hour_angle*rad;
    const lat = latitude*rad;
    let azimuth = (Math.atan2(-Math.cos(dec)*Math.sin(h),Math.sin(dec)*Math.cos(lat)-Math.cos(dec)*Math.sin(lat)*Math.cos(h)))/rad;
    const elevation = (Math.asin(Math.sin(dec)*Math.sin(lat)+Math.cos(lat)*Math.cos(dec)*Math.cos(h)))/rad;
    const atmospheric_refraction = this.AtmosphericRefraction(elevation)
    if (azimuth<0){
      azimuth = azimuth%360 +360
    }
    return {
      "azimuth" : azimuth,
      "elevation" : elevation,
      "distance": distance,
      "atmospheric_refraction":atmospheric_refraction
     }
  }

  RectToHorizontal = (time,rect) => {
    const coordinates = rectangularCoordinates(rect);
    const kind = coordinateKind(rect);
    const inputUnit = distanceUnit(rect, true);
    if (kind === 'ecliptic') {
      throw new RangeError(
        'Observation.RectToHorizontal: ecliptic coordinates must be converted to equatorial coordinates first'
      );
    }
    rect = {
      ...rect,
      ...coordinates
    };
    // The observer position is in km; convert the target to km when it
    // comes in astronomical units so the topocentric subtraction is valid.
    if (inputUnit === 'au') {
      rect = {
        x: rect.x * Constant.AU,
        y: rect.y * Constant.AU,
        z: rect.z * Constant.AU,
        coordinate_keywords: rect.coordinate_keywords,
        unit_keywords: 'km'
      }
    }
    const distance_unit = ' km';
    const rad = Constant.RAD;
    const observer = this.observer;
    const lat = finiteNumber(observer.latitude, 'observer latitude');
    const lng = finiteNumber(observer.longitude, 'observer longitude');
    //TEME vectors (SGP4) pair with mean sidereal time (GMST 1982);
    //apparent places pair with apparent sidereal time.
    const is_teme = kind === 'teme';
    const st = is_teme ? time.gmst82() : time.gast();
    const obsv = new Observer(observer);
    const ob = obsv.rectangular(time, st)
    const rx0 = rect.x - ob.x;
    const ry0 = rect.y - ob.y
    const rz0 = rect.z - ob.z
    const gmst = st;
    const lst = gmst*15 + lng;
    const rs = Math.sin(lat*rad)*Math.cos(lst*rad)*rx0 + Math.sin(lat*rad)*Math.sin(lst*rad)*ry0-Math.cos(lat*rad)*rz0;
    const re = -Math.sin(lst*rad)*rx0 + Math.cos(lst*rad)*ry0;
    const rz = Math.cos(lat*rad)*Math.cos(lst*rad)*rx0+Math.cos(lat*rad)*Math.sin(lst*rad)*ry0 + Math.sin(lat*rad)*rz0;
    const range = Math.sqrt(rs*rs+re*re+rz*rz);
    const elevation = Math.asin(rz/range)/rad;
    const atmospheric_refraction = this.AtmosphericRefraction(elevation)
    let azimuth  = Math.atan2(-re,rs);
    azimuth = azimuth/rad+180;
    if (azimuth>360){
      azimuth = azimuth%360;
    }
    return {
    "azimuth" : azimuth,
    "elevation" : elevation,
    "distance": range,
    "atmospheric_refraction":atmospheric_refraction,
    "coordinate_keywords":"horizontal spherical",
    "unit_keywords": "degree" + distance_unit
   }
  }

  azel = (date) => {
    const target = this.target;
    if (!target || typeof target !== 'object') {
      throw new TypeError(
        'Observation.azel: target must provide ra/dec, x/y/z, radec(date), or xyz(date)'
      );
    }
    const time = new Time(date)
    let horizontal,radec,distance_unit

    // When the target's distance and its unit are known, go through the
    // rectangular path so the observer's geocentric position is subtracted:
    // this applies diurnal parallax (up to ~1 degree for the Moon). Targets
    // without a usable distance keep the purely angular conversion.
    const HorizontalFromRadec = (radec_obj) => {
      if (!radec_obj || typeof radec_obj !== 'object'
        || radec_obj.ra == undefined || radec_obj.dec == undefined) {
        throw new TypeError('Observation: radec target must contain both ra and dec');
      }
      const unit = distanceUnit(radec_obj);
      if (radec_obj.distance != undefined && unit != undefined) {
        return this.RectToHorizontal(time, RadecToXYZ({
          ...radec_obj,
          unit_keywords: unit
        }))
      }
      return this.RadecToHorizontal(time, radec_obj)
    }
    const DistanceUnitFromRadec = (h, radec_obj) => {
      if (h.unit_keywords != undefined) {
        const unit = distanceUnit(h);
        return unit == undefined ? '' : ' ' + unit;
      }
      const unit = distanceUnit(radec_obj);
      return unit == undefined ? '' : ' ' + unit;
    }
    const HorizontalFromRect = (rect_obj) => {
      rectangularCoordinates(rect_obj);
      const kind = coordinateKind(rect_obj);
      distanceUnit(rect_obj, true);
      let converted = rect_obj;
      if(kind === 'ecliptic'){
        const targetDate = rect_obj.date != undefined ? rect_obj.date : date;
        converted = EclipticToEquatorial({ date: targetDate, ecliptic: rect_obj });
      }
      return this.RectToHorizontal(time, converted);
    }

    const hasRa = target.ra != undefined;
    const hasDec = target.dec != undefined;
    const hasAnyXyz = target.x != undefined || target.y != undefined || target.z != undefined;
    const hasAllXyz = target.x != undefined && target.y != undefined && target.z != undefined;
    if(hasRa && hasDec){
      horizontal = HorizontalFromRadec(target)
      distance_unit = DistanceUnitFromRadec(horizontal, target)
    }else if(hasAllXyz){
      horizontal = HorizontalFromRect(target)
      distance_unit = ' ' + distanceUnit(horizontal, true)
    }else if(typeof target.radec === 'function'){
      radec = target.radec(date)
      horizontal = HorizontalFromRadec(radec)
      distance_unit = DistanceUnitFromRadec(horizontal, radec)
    }else if(typeof target.xyz === 'function'){
      const rect = target.xyz(date);
      horizontal = HorizontalFromRect(rect)
      distance_unit = ' ' + distanceUnit(horizontal, true)
    }else if(hasRa || hasDec){
      throw new TypeError('Observation: radec target must contain both ra and dec');
    }else if(hasAnyXyz){
      rectangularCoordinates(target);
    }else if(target.radec != undefined || target.xyz != undefined){
      throw new TypeError('Observation.azel: target radec and xyz properties must be functions');
    }else{
      throw new TypeError(
        'Observation.azel: target must provide ra/dec, x/y/z, radec(date), or xyz(date)'
      );
    }

    return {
      "azimuth" : horizontal.azimuth,
      "elevation" : horizontal.elevation,
      "distance": horizontal.distance,
      "atmospheric_refraction":horizontal.atmospheric_refraction,
      "date":date,
      "coordinate_keywords":"horizontal spherical",
      "unit_keywords": "degree" + distance_unit
    }
  }
}
