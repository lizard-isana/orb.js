//sgp4.js
//require core.js, time.js

import {Constant,ZeroFill} from './orb-core.js'
import {Time} from './orb-time.js'
import {sgp4init, sgp4, wgs72} from './orb-sgp4-propagation.js'

// Catalog numbers passed 99999, so TLE columns 3-7 may hold the Alpha-5
// spelling instead of five digits: the leading digit becomes a capital
// letter, skipping I and O so they are not confused with 1 and 0. A is 10,
// B is 11, ... Z is 33, which covers catalog numbers up to 339999.
// Space-Track keeps reporting NORAD_CAT_ID numerically in the GP class, so
// decode Alpha-5 back to a number instead of leaving Number() to yield NaN.
const ALPHA5_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function ParseCatalogNumber(value){
  var text = String(value === null || value === undefined ? "" : value).trim();
  if(text.length === 0){
    return NaN;
  }
  var alpha5 = text.toUpperCase();
  if(/^[A-HJ-NP-Z][0-9]{4}$/.test(alpha5)){
    var letter_index = ALPHA5_LETTERS.indexOf(alpha5.charAt(0));
    if(letter_index >= 0){
      return ((letter_index + 10) * 10000) + Number(alpha5.slice(1));
    }
  }
  return Number(text);
}

export class SGP4{
  constructor (elements) {
    this.elements = elements;
    if (elements.CCSDS_OMM_VERS) {
      this.omm = elements;
      this.tle = {
        name: elements.OBJECT_NAME,
        first_line: elements.USER_DEFINED_TLE_LINE1,
        second_line: elements.USER_DEFINED_TLE_LINE2
      }
    } else {
      this.tle = this.elements;
      this.omm = this.TLE2OMM();
    }
    var omm = this.omm;
    this.orbital_elements = {
      name: omm.OBJECT_NAME,
      catalog_number: omm.NORAD_CAT_ID,
      security_classification: omm.CLASSIFICATION_TYPE,
      international_designator: omm.OBJECT_ID,
      first_derivative_mean_motion: omm.MEAN_MOTION_DOT,
      second_derivative_mean_motion: omm.MEAN_MOTION_DDOT,
      bstar: omm.BSTAR,
      ephemeris_type: omm.EPHEMERIS_TYPE,
      element_number: omm.ELEMENT_SET_NO,
      inclination: omm.INCLINATION,
      right_ascension: omm.RA_OF_ASC_NODE,
      eccentricity: omm.ECCENTRICITY,
      argument_of_perigee: omm.ARG_OF_PERICENTER,
      mean_anomaly: omm.MEAN_ANOMALY,
      mean_motion: omm.MEAN_MOTION,
      rev_number_at_epoch: omm.REV_AT_EPOCH
    };
    this.sgp4 = this.SetSGP4()
    this.orbital_period = this.sgp4.orbital_period;
    this.apogee = this.sgp4.apogee;
    this.perigee = this.sgp4.perigee;
  }

  TLE2OMM = () => {
    var tle = this.tle;
    if (tle.name) {
      var name = tle.name;
    } else {
      var name = "N/A";
    }
    var line1 = tle.first_line;
    var line2 = tle.second_line;
    var date = new Date();
    var creation_date = date.getUTCFullYear() + "-" + ZeroFill(date.getUTCMonth() + 1, 2) + "-" + ZeroFill(date.getUTCDate(), 2) + " " + ZeroFill(date.getUTCHours(), 2) + ":" + ZeroFill(date.getUTCMinutes(), 2) + ":" + ZeroFill(date.getUTCSeconds(), 2);
    var id = String(line1.slice(9, 18))
    if (Number(id.slice(0, 2)) < 58) { var epystr = "20" } else { var epystr = "19" };
    var international_designator = epystr + String(id.slice(0, 2)) + "-" + String(id.slice(2, 7))
    var epy = Number(line1.slice(18, 20));
    if (epy < 57) { var epoch_year = epy + 2000 } else { var epoch_year = epy + 1900 };
    var doy = Number(line1.substring(20, 32))
    var year2 = epoch_year - 1;
    var epoch = new Date(Date.UTC(year2, 11, 31, 0, 0, 0) + (doy * 24 * 60 * 60 * 1000));
    var epoch_str = epoch.getUTCFullYear() + "-" + ZeroFill(epoch.getUTCMonth() + 1, 2) + "-" + ZeroFill(epoch.getUTCDate(), 2) + "T" + ZeroFill(epoch.getUTCHours(), 2) + ":" + ZeroFill(epoch.getUTCMinutes(), 2) + ":" + ZeroFill(epoch.getUTCSeconds(), 2) + "." + ZeroFill(epoch.getUTCMilliseconds(), 3);
    var bstar_mantissa = Number(line1.substring(53, 59)) * 1e-5;
    var bstar_exponent = Number("1e" + Number(line1.substring(59, 61)));
    var bstar = bstar_mantissa * bstar_exponent
    var nddot_mantissa = Number(line1.substring(44, 50)) * 1e-5;
    var nddot_exponent = Number(line1.substring(50, 52));
    var mean_motion_ddot = nddot_mantissa * Math.pow(10, nddot_exponent);
    var omm = {
      "CCSDS_OMM_VERS": "2.0",
      "COMMENT": "GENERATED VIA ORB.JS",
      "CREATION_DATE": creation_date,
      "ORIGINATOR": "",
      "OBJECT_NAME": name,
      "OBJECT_ID": international_designator,
      "CENTER_NAME": "EARTH",
      "REF_FRAME": "TEME",
      "TIME_SYSTEM": "UTC",
      "MEAN_ELEMENT_THEORY": "SGP4",
      "EPOCH": epoch_str,
      "MEAN_MOTION": Number(line2.substring(52, 63)),
      "ECCENTRICITY": Number(line2.substring(26, 33)) * 1e-7,
      "INCLINATION": Number(line2.substring(8, 16)),
      "RA_OF_ASC_NODE": Number(line2.substring(17, 25)),
      "ARG_OF_PERICENTER": Number(line2.substring(34, 42)),
      "MEAN_ANOMALY": Number(line2.substring(43, 51)),
      "EPHEMERIS_TYPE": Number(line1.substring(62, 63)),
      "CLASSIFICATION_TYPE": line1.slice(7, 8),
      "NORAD_CAT_ID": ParseCatalogNumber(line1.slice(2, 7)),
      "ELEMENT_SET_NO": Number(line1.substring(64, 68)),
      "REV_AT_EPOCH": Number(line2.substring(64, 68)),
      "BSTAR": bstar,
      "MEAN_MOTION_DOT": Number(line1.substring(34, 43)),
      "MEAN_MOTION_DDOT": mean_motion_ddot,
      "USER_DEFINED_TLE_LINE0": "0 " + name,
      "USER_DEFINED_TLE_LINE1": line1,
      "USER_DEFINED_TLE_LINE2": line2
    }
    return omm
  }

  DecodeTLE = () => {
    var tle = this.tle;
    if (tle.name) {
      var name = tle.name;
    } else {
      var name = "N/A";
    }
    var line1 = tle.first_line;
    var line2 = tle.second_line;
    var epy = Number(line1.slice(18, 20));
    //epoch_year should be smaller than 2057.
    if (epy < 57) { var epoch_year = epy + 2000 } else { var epoch_year = epy + 1900 };
    var bstar_mantissa = Number(line1.substring(53, 59)) * 1e-5;
    var bstar_exponent = Number("1e" + Number(line1.substring(59, 61)));
    var bstar = bstar_mantissa * bstar_exponent
    var orbital_elements = {
      name: name,
      line_number_1: Number(line1.slice(0, 1)),
      catalog_no_1: ParseCatalogNumber(line1.slice(2, 7)),
      security_classification: line1.slice(7, 8),
      international_identification: Number(line1.slice(9, 17)),
      epoch_year: epoch_year,
      epoch: Number(line1.substring(20, 32)),
      first_derivative_mean_motion: Number(line1.substring(33, 43)),
      second_derivative_mean_motion: Number(line1.substring(44, 52)),
      bstar_mantissa: bstar_mantissa,
      bstar_exponent: bstar_exponent,
      bstar: bstar,
      ephemeris_type: Number(line1.substring(62, 63)),
      element_number: Number(line1.substring(64, 68)),
      check_sum_1: Number(line1.substring(68, 69)),
      line_number_2: Number(line2.slice(0, 1)),
      catalog_no_2: ParseCatalogNumber(line2.slice(2, 7)),
      inclination: Number(line2.substring(8, 16)),
      right_ascension: Number(line2.substring(17, 25)),
      eccentricity: Number(line2.substring(26, 33)) * 1e-7,
      argument_of_perigee: Number(line2.substring(34, 42)),
      mean_anomaly: Number(line2.substring(43, 51)),
      mean_motion: Number(line2.substring(52, 63)),
      rev_number_at_epoch: Number(line2.substring(64, 68)),
      check_sum_2: Number(line2.substring(68, 69))
    }
    return orbital_elements
  }

  ParseEpoch = () => {
    //UTC epoch Date from the OMM EPOCH string
    var epoch_array = this.omm.EPOCH.split("T");
    var epoch_date = epoch_array[0].split("-");
    var epoch_time = epoch_array[1].split(":");
    return new Date(Date.UTC(
      Number(epoch_date[0]), Number(epoch_date[1]) - 1, Number(epoch_date[2]),
      Number(epoch_time[0]), Number(epoch_time[1]), 0, Number(epoch_time[2]) * 1000
    ));
  }

  SetSGP4 = () => {
    var omm = this.omm;
    var torad = Math.PI / 180;
    var epoch_jd = new Time(this.ParseEpoch()).jd();
    var satrec = {};
    //epoch in days since 1950 Jan 0.0; angles in radians, mean motion rad/min
    sgp4init(satrec, 'i', epoch_jd - 2433281.5,
      omm.BSTAR, 0.0, 0.0,
      omm.ECCENTRICITY,
      omm.ARG_OF_PERICENTER * torad,
      omm.INCLINATION * torad,
      omm.MEAN_ANOMALY * torad,
      omm.MEAN_MOTION * 2.0 * Math.PI / 1440.0,
      omm.RA_OF_ASC_NODE * torad);
    satrec.orbital_period = 1440.0 / omm.MEAN_MOTION;
    satrec.apogee = satrec.alta * wgs72.radiusearthkm;
    satrec.perigee = satrec.altp * wgs72.radiusearthkm;
    return satrec;
  }

  ExecSGP4 = (time) => {
    //Note: Date.UTC silently truncates a fractional seconds argument, so the
    //epoch must go through ParseEpoch, which carries the milliseconds.
    var now_sec = Date.UTC(time.year, time.month - 1, time.day, time.hours, time.minutes, time.seconds, time.milliseconds);
    var tsince = (now_sec - this.ParseEpoch().getTime()) / (60 * 1000);
    var result = sgp4(this.sgp4, tsince);
    if (result == null) {
      throw new Error("SGP4 propagation failed (error " + this.sgp4.error + "): " + this.sgp4.error_message);
    }
    return result;
  }

  RectangularToGeographic = (time, rect) =>{
    var time = time;
    var xkm = rect.x;
    var ykm = rect.y;
    var zkm = rect.z;
    var xdotkmps = rect.xdot;
    var ydotkmps = rect.ydot;
    var zdotkmps = rect.zdot;
    var rad = Constant.RAD;
    //TEME pairs with mean sidereal time (GMST 1982), not apparent
    var gmst = time.gmst82();
    var lst = gmst * 15;
    var f = 1 / 298.257223563; //Earth's flattening in WGS-84
    var a = 6378.137;  //Earth's equatorial radius in WGS-84 (km)
    var r = Math.sqrt(xkm * xkm + ykm * ykm);
    var lng = Math.atan2(ykm, xkm) / rad - lst;
    if (lng > 360) { lng = lng % 360; }
    if (lng < 0) { lng = lng % 360 + 360; }
    if (lng > 180) { lng = lng - 360 }
    var lat = Math.atan2(zkm, r);
    var e2 = f * (2 - f);
    var tmp_lat = 0
    do {
      tmp_lat = lat;
      var sin_lat = Math.sin(tmp_lat)
      var c = 1 / Math.sqrt(1 - e2 * sin_lat * sin_lat);
      lat = Math.atan2(zkm + a * c * e2 * (Math.sin(tmp_lat)), r);
    } while (Math.abs(lat - tmp_lat) > 0.0001);
    var alt = r / Math.cos(lat) - a * c;
    var v = Math.sqrt(xdotkmps * xdotkmps + ydotkmps * ydotkmps + zdotkmps * zdotkmps);
    return {
      longitude: lng,
      latitude: lat / rad,
      altitude: alt,
      velocity: v
    }
  }

  xyz = (date) => {
    var time = new Time(date)
    var rect = this.ExecSGP4(time);
    return {
      "x": rect.x,
      "y": rect.y,
      "z": rect.z,
      "xdot": rect.xdot,
      "ydot": rect.ydot,
      "zdot": rect.zdot,
      "date": date,
      "coordinate_keywords": "equatorial rectangular teme",
      "unit_keywords": "km km/s"
    }
  }

  latlng = (date) => {
    var time = new Time(date)
    var rect = this.ExecSGP4(time);
    var geo = this.RectangularToGeographic(time, rect);
    return {
      "latitude": geo.latitude,
      "longitude": geo.longitude,
      "altitude": geo.altitude,
      "velocity": geo.velocity,
      "date": date,
      "coordinate_keywords": "geographic spherical",
      "unit_keywords": "degree km km/s"
    }
  }
}

export class Satellite{ 
  constructor(orbital_elements){
    return new SGP4(orbital_elements)
  }
};
