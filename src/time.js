import {Constant} from './constant.js';
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
  jd = () => {
    const year = this.year;
    const month = this.month;;
    const day = this.day;
    const time_in_day = this.time_in_day()
    if (month <= 2) {
      year = year - 1;
      month = month + 12;
    }
    const julian_day = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day - 1524.5;
    let transition_offset;
    if (julian_day < 2299160.5) {
      transition_offset = 0;
    } else {
      const tmp = Math.floor(year / 100);
      transition_offset = 2 - tmp + Math.floor(tmp / 4);
    }
    const jd = julian_day + transition_offset + time_in_day;
    return jd;
  }
  gmst = () =>  {
    const rad = Constant.RAD
    const time_in_sec = this.hours * 3600 + this.minutes * 60 + this.seconds + this.milliseconds / 1000;
    const jd = this.jd();
    const jd0 = jd - this.time_in_day();
    //gmst at 0:00
    const t = (jd0 - 2451545.0) / 36525;
    let gmst_at_zero = (24110.5484 + 8640184.812866 * t + 0.093104 * t * t + 0.0000062 * t * t * t) / 3600;
    if (gmst_at_zero > 24) { gmst_at_zero = gmst_at_zero % 24; }
    //gmst at target time
    let gmst = gmst_at_zero + (time_in_sec * 1.00273790925) / 3600;
    //mean obliquity of the ecliptic
    const e = 23 + 26.0 / 60 + 21.448 / 3600 - 46.8150 / 3600 * t - 0.00059 / 3600 * t * t + 0.001813 / 3600 * t * t * t;
    //nutation in longitude
    const omega = 125.04452 - 1934.136261 * t + 0.0020708 * t * t + t * t * t / 450000;
    const long1 = 280.4665 + 36000.7698 * t;
    const long2 = 218.3165 + 481267.8813 * t;
    const phai = -17.20 * Math.sin(omega * rad) - (-1.32 * Math.sin(2 * long1 * rad)) - 0.23 * Math.sin(2 * long2 * rad) + 0.21 * Math.sin(2 * omega * rad);
    gmst = gmst + ((phai / 15) * (Math.cos(e * rad))) / 3600
    if (gmst < 0) { gmst = gmst % 24 + 24; }
    if (gmst > 24) { gmst = gmst % 24; }
    return gmst
  }
}