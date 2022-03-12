const Orb = require('../dist/orb.min.js');

const date = new Date();
const time = new Orb.Time(date);
const time_in_day = time.time_in_day();
console.log(time_in_day)
