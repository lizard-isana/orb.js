export default class Time {
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
}