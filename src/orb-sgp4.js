//sgp4.js
//require core.js, time.js

import {Constant} from './orb-core.js'
import {Time} from './orb-time.js'
import {sgp4init, sgp4, wgs72} from './orb-sgp4-propagation.js'
import {
  parseCatalogNumber,
  parseOmmRecord,
  parseTleRecord,
  tleRecordToOmm
} from './sgp4/parser.js'

export const ParseCatalogNumber = parseCatalogNumber;

export class SGP4{
  constructor (elements) {
    if (!elements || typeof elements !== 'object' || Array.isArray(elements)) {
      throw new TypeError('sgp4: elements must be a TLE or OMM object');
    }
    this.elements = elements;
    if (elements.CCSDS_OMM_VERS) {
      this.omm = elements;
      this._record = parseOmmRecord(elements);
      this.tle = {
        name: elements.OBJECT_NAME,
        first_line: elements.USER_DEFINED_TLE_LINE1,
        second_line: elements.USER_DEFINED_TLE_LINE2
      }
    } else {
      this.tle = this.elements;
      this._record = parseTleRecord(elements);
      this.omm = { ...tleRecordToOmm(this._record, {
        creationDate: new Date(),
        fractionDigits: 3,
        truncateFraction: true,
        legacyFormatting: true
      }) };
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
    var record = parseTleRecord(this.tle);
    return { ...tleRecordToOmm(record, {
      creationDate: new Date(),
      fractionDigits: 3,
      truncateFraction: true,
      legacyFormatting: true
    }) };
  }

  DecodeTLE = () => {
    var tle = this.tle;
    var line1 = tle.first_line;
    var line2 = tle.second_line;
    var record = parseTleRecord(tle);
    var bstar_mantissa = Number(line1.substring(53, 59)) * 1e-5;
    var bstar_exponent = Number("1e" + Number(line1.substring(59, 61)));
    var orbital_elements = {
      name: record.name || "N/A",
      line_number_1: Number(line1.slice(0, 1)),
      catalog_no_1: record.catalogNumber,
      security_classification: record.classification,
      international_identification: Number(line1.slice(9, 17)),
      epoch_year: record.epochYear,
      epoch: record.epochDay,
      first_derivative_mean_motion: record.meanMotionDot,
      second_derivative_mean_motion: record.meanMotionDdot,
      bstar_mantissa: bstar_mantissa,
      bstar_exponent: bstar_exponent,
      bstar: record.bstar,
      ephemeris_type: record.ephemerisType,
      element_number: record.elementSetNumber,
      check_sum_1: Number(line1.substring(68, 69)),
      line_number_2: Number(line2.slice(0, 1)),
      catalog_no_2: record.catalogNumber,
      inclination: record.inclination / Constant.RAD,
      right_ascension: record.rightAscension / Constant.RAD,
      eccentricity: record.eccentricity,
      argument_of_perigee: record.argumentOfPerigee / Constant.RAD,
      mean_anomaly: record.meanAnomaly / Constant.RAD,
      mean_motion: record.meanMotionRevPerDay,
      rev_number_at_epoch: record.revolutionsAtEpoch,
      check_sum_2: Number(line2.substring(68, 69))
    }
    return orbital_elements
  }

  ParseEpoch = () => {
    return new Date(this._record.epochUnixMs);
  }

  SetSGP4 = () => {
    var record = this._record;
    var epoch_jd = new Time(this.ParseEpoch()).jd();
    var satrec = {};
    //epoch in days since 1950 Jan 0.0; angles in radians, mean motion rad/min
    sgp4init(satrec, 'i', epoch_jd - 2433281.5,
      record.bstar, 0.0, 0.0,
      record.eccentricity,
      record.argumentOfPerigee,
      record.inclination,
      record.meanAnomaly,
      record.meanMotion,
      record.rightAscension);
    satrec.orbital_period = 1440.0 / record.meanMotionRevPerDay;
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
