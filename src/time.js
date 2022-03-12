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
  time_in_day = function () {
    return this.hours / 24 + this.minutes / 1440 + this.seconds / 86400 + this.milliseconds / 86400000;
  }
}