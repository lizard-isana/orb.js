const Orb = require('../dist/orb.min.js');
const date = new Date();
const time = new Orb.Time(date);
const time_in_day = time.time_in_day();
console.log(`time in day: ${time_in_day}`);
const jd = time.jd();
console.log(`jd: ${jd}`);

var tle = {
  first_line:"1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015",
  second_line:"2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038"
}
var satellite = new Orb.SGP4(tle);
const results_satellite = {
  "xyz":satellite.xyz(date),
  "latlng": satellite.latlng(date)
}

console.log(`satellite: ${JSON.stringify(results_satellite, null, "  ")}`);