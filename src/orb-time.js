import {Constant} from './orb-core.js';
import {Nutation, Obliquity} from './orb-obliquity.js';

//TAI-UTC offset (leap seconds) since 1972: [effective date (ms), seconds]
const LEAP_SECONDS = [
  [Date.UTC(1972, 0, 1), 10],
  [Date.UTC(1972, 6, 1), 11],
  [Date.UTC(1973, 0, 1), 12],
  [Date.UTC(1974, 0, 1), 13],
  [Date.UTC(1975, 0, 1), 14],
  [Date.UTC(1976, 0, 1), 15],
  [Date.UTC(1977, 0, 1), 16],
  [Date.UTC(1978, 0, 1), 17],
  [Date.UTC(1979, 0, 1), 18],
  [Date.UTC(1980, 0, 1), 19],
  [Date.UTC(1981, 6, 1), 20],
  [Date.UTC(1982, 6, 1), 21],
  [Date.UTC(1983, 6, 1), 22],
  [Date.UTC(1985, 6, 1), 23],
  [Date.UTC(1988, 0, 1), 24],
  [Date.UTC(1990, 0, 1), 25],
  [Date.UTC(1991, 0, 1), 26],
  [Date.UTC(1992, 6, 1), 27],
  [Date.UTC(1993, 6, 1), 28],
  [Date.UTC(1994, 6, 1), 29],
  [Date.UTC(1996, 0, 1), 30],
  [Date.UTC(1997, 6, 1), 31],
  [Date.UTC(1999, 0, 1), 32],
  [Date.UTC(2006, 0, 1), 33],
  [Date.UTC(2009, 0, 1), 34],
  [Date.UTC(2012, 6, 1), 35],
  [Date.UTC(2015, 6, 1), 36],
  [Date.UTC(2017, 0, 1), 37]
];

export class Time {
  constructor(date = new Date()) {
    this.date = date;
    this.year = date.getUTCFullYear();
    this.month = date.getUTCMonth() + 1;
    this.day = date.getUTCDate();
    this.hours = date.getUTCHours();
    this.minutes = date.getUTCMinutes();
    this.seconds = date.getUTCSeconds();
    this.milliseconds = date.getUTCMilliseconds()
  }

  time_in_day = () =>  {
    return this.hours / 24 + this.minutes / 1440 + this.seconds / 86400 + this.milliseconds / 86400000;
  }

  // Meeus, J. 1998. Astronomical Algorithms (2nd ed.). Willmann-Bell.
  jd = () => {
    let year = this.year;
    let month = this.month;;
    let day = this.day;
    let time_in_day = this.time_in_day()
    if (month <= 2) {
      year = year - 1;
      month = month + 12;
    }
    const julian_day = Math.trunc(365.25*(year+4716))+Math.trunc(30.6001*(month+1))+day-1524.5;
    let transition_offset;
    if (julian_day < 2299160.5) {
      transition_offset = 0;
    } else {
      const tmp = Math.trunc(year/100);
      transition_offset = 2-tmp+Math.trunc(tmp/4);
    }
    const jd = julian_day + transition_offset + time_in_day;
    return jd;
  }

  //Greenwich Apparent Sidereal Time in hours: mean sidereal time (from UT)
  //plus the equation of the equinoxes. This is the sidereal time to use for
  //hour angles of apparent places.
  gast = () => {
    const rad = Constant.RAD
    const time_in_sec = this.hours * 3600 + this.minutes * 60 + this.seconds + this.milliseconds / 1000;
    const jd = this.jd();
    const jd0 = jd - this.time_in_day();
    //mean sidereal time at 0:00 UT
    const t = (jd0 - 2451545.0) / 36525;
    let gmst_at_zero = (24110.5484 + 8640184.812866 * t + 0.093104 * t * t + 0.0000062 * t * t * t) / 3600;
    if (gmst_at_zero > 24) { gmst_at_zero = gmst_at_zero % 24; }
    //mean sidereal time at target time
    let gast = gmst_at_zero + (time_in_sec * 1.00273790925) / 3600;
    //equation of the equinoxes: nutation in longitude (degrees) projected
    //onto the equator; 15 degrees = 1 hour
    gast = gast + (Nutation(this.date) * Math.cos(Obliquity(this.date) * rad)) / 15;
    if (gast < 0) { gast = gast % 24 + 24; }
    if (gast > 24) { gast = gast % 24; }
    return gast
  }

  //Deprecated: despite its name this has always returned APPARENT sidereal
  //time. Kept as an alias of gast() for backward compatibility; a future
  //major version may change it to return mean sidereal time.
  gmst = () =>  {
    return this.gast();
  }

  tt_minus_utc = () => {
    //From 1972 on, TT-UTC is exactly 32.184s (TT-TAI) plus the accumulated
    //leap seconds. The table's last entry carries forward: no leap second has
    //been inserted since 2017 and the CGPM plans to discontinue them by 2035.
    //Before 1972 UTC in its present form did not exist; fall back to the
    //delta_t() polynomial, which estimates TT-UT1.
    const ms = this.date.getTime();
    if (ms < LEAP_SECONDS[0][0]) {
      return this.delta_t();
    }
    let tai_utc = LEAP_SECONDS[0][1];
    for (let i = 0; i < LEAP_SECONDS.length; i++) {
      if (ms >= LEAP_SECONDS[i][0]) {
        tai_utc = LEAP_SECONDS[i][1];
      } else {
        break;
      }
    }
    return 32.184 + tai_utc;
  }

  //Julian date in Terrestrial Time: the time argument for ephemeris series
  //(VSOP87, lunar theory). Sidereal time must keep using jd()/UTC.
  jd_tt = () => {
    return this.jd() + this.tt_minus_utc() / 86400;
  }

  delta_t = () =>  {
    //NASA - Polynomial Expressions for Delta T
    //http://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html
    const year = this.year;
    const month = this.month;
    const y = year + (month - 0.5) / 12
    let u, t , dt;
    if (year <= -500) {
      u = (y - 1820) / 100
      dt = -20 + 32 * u * u;
    } else if (year > -500 && year <= 500) {
      u = y / 100;
      dt = 10583.6 - 1014.41 * u + 33.78311 * u * u - 5.952053 * u * u * u - 0.1798452 * u * u * u * u + 0.022174192 * u * u * u * u * u + 0.0090316521 * u * u * u * u * u * u;
    } else if (year > 500 && year <= 1600) {
      u = (y - 1000) / 100;
      dt = 1574.2 - 556.01 * u + 71.23472 * u * u + 0.319781 * u * u * u - 0.8503463 * u * u * u * u - 0.005050998 * u * u * u * u * u + 0.0083572073 * u * u * u * u * u * u;
    } else if (year > 1600 && year <= 1700) {
      t = y - 1600;
      dt = 120 - 0.9808 * t - 0.01532 * t * t + t * t * t / 7129;
    } else if (year > 1700 && year <= 1800) {
      t = y - 1700;
      dt = 8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t * t * t - t * t * t * t / 1174000;
    } else if (year > 1800 && year <= 1860) {
      t = y - 1800;
      dt = 13.72 - 0.332447 * t + 0.0068612 * t * t + 0.0041116 * t * t * t - 0.00037436 * t * t * t * t + 0.0000121272 * t * t * t * t * t - 0.0000001699 * t * t * t * t * t * t + 0.000000000875 * t * t * t * t * t * t * t;
    } else if (year > 1860 && year <= 1900) {
      t = y - 1860;
      dt = 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t * t * t - 0.0004473624 * t * t * t * t + t * t * t * t * t / 233174;
    } else if (year > 1900 && year <= 1920) {
      t = y - 1900;
      dt = -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t * t * t * t;
    } else if (year > 1920 && year <= 1941) {
      t = y - 1920;
      dt = 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t;
    } else if (year > 1941 && year <= 1961) {
      t = y - 1950;
      dt = 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547;
    } else if (year > 1961 && year <= 1986) {
      t = y - 1975;
      dt = 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718;
    } else if (year > 1986 && year <= 2005) {
      t = y - 2000;
      dt = 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t + 0.000651814 * t * t * t * t + 0.00002373599 * t * t * t * t * t;
    } else if (year > 2005 && year <= 2050) {
      t = y - 2000;
      dt = 62.92 + 0.32217 * t + 0.005589 * t * t;
    } else if (year > 2050 && year <= 2150) {
      /*
      This expression is derived from estimated values of ��T in the years 2010 and 2050. The value for 2010 (66.9 seconds) is based on a linearly extrapolation from 2005 using 0.39 seconds/year (average from 1995 to 2005). The value for 2050 (93 seconds) is linearly extrapolated from 2010 using 0.66 seconds/year (average rate from 1901 to 2000).
      */
      dt = -20 + 32 * ((y - 1820) / 100) * ((y - 1820) / 100) - 0.5628 * (2150 - y)
      //The last term is introduced to eliminate the discontinuity at 2050.
    } else if (year > 2150) {
      u = (y - 1820) / 100
      dt = -20 + 32 * u * u
    }
    return dt;
  }

  doy = () =>  {
    const d = this.date
    const d0 = Date.UTC(d.getUTCFullYear() - 1, 11, 31, 0, 0, 0);
    const doy = (d.getTime() - d0) / (1000 * 60 * 60 * 24);
    return doy
  }
}