// orb.js
//
// Orb 2.3.0 (20200115) - Javascript Library for Astronomical Calculation
//
// Copyright (c) 2012 - 2020 KASHIWAI, Isana
// Licensed under the MIT license (MIT-LICENSE),
//
// Versioning Schemes:
// "major.minor.revision (update)"
// The major number is increased when there are significant jumps in functionality, 
// the minor number is incremented when only minor features or significant fixes have been added, 
// and the revision number is incremented when minor bugs are fixed.

// for Name Space
var Orb = Orb || {
  VERSION: "2.3.0 (20200115)",
  AUTHOR: "Isana Kashiwai",
  LICENSE: "MIT"
};

//core.js
Orb.Constant = Orb.Constant || {
  "PI": Math.PI,
  "RAD": Math.PI / 180, //RADIAN
  "AU": 149597870.700, //ASTRONOMICAL_UNIT(km)
  "RE": 6378.137, //EARTH_RADIUS(km)
  "LD": 384000, //LUNA_DISTANCE(km)
  "LY": Number("9.46073E+12"), //LIGHT_YEAR(km)
  "PC": Number("3.08568E+13"), //PARSEC(km)
  "G": Number("6.6740831E-11"), //GRAVITATIONAL_CONSTANT
  "GM": Number("2.9591220828559093E-4"), // au^3/d^2
  "Planets": ["Sun", "Mercury", "Venus", "Earth", "Moon", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"],
  "Sun": {
    "radius": 1392038 / 2,
    "obliquity": 7.25,
    "mass": Number("1.989E+30"),
    "gm": Number("1.327124400189E+11") // m^3/s^2
  },
  "Mercury": {
    "radius": 4879.4 / 2,
    "obliquity": 0.027,
    "mass": Number("3.301E+23"),
    "gm": 220329  // m^3/s^2
  },
  "Venus": {
    "radius": 12103.6 / 2,
    "obliquity": 177.36,
    "mass": Number("4.867E+24"),
    "gm": 3248599  // m^3/s^2
  },
  "Earth": {
    "radius": 12756.3 / 2,
    "obliquity": 23.435,
    "mass": Number("5.972E+24"),
    "gm": Number("3.9860044189E+5")  // m^3/s^2
  },
  "Moon": {
    "radius": 1737.4,
    "obliquity": 1.5424,
    "mass": Number("7.346E+22"),
    "gm": 4904.86959  // m^3/s^2
  },
  "Mars": {
    "radius": 6794.4 / 2,
    "obliquity": 25,
    "mass": Number("6.417E+24"),
    "gm": 42828.9  // m^3/s^2
  },
  "Jupiter": {
    "radius": 142984 / 2,
    "obliquity": 3.08,
    "mass": Number("1.899E+27"),
    "gm": 1266865349  // m^3/s^2
  },
  "Saturn": {
    "radius": 120536 / 2,
    "obliquity": 26.7,
    "mass": Number("5.685E+26"),
    "gm": 379311879 // m^3/s^2
  },
  "Uranus": {
    "radius": 51118 / 2,
    "obliquity": 97.9,
    "mass": Number("8.682E+26"),
    "gm": 57939399  // m^3/s^2
  },
  "Neptune": {
    "radius": 49572 / 2,
    "obliquity": 29.6,
    "mass": Number("1.024E+26"),
    "gm": 68365299 // m^3/s^2
  }
}
Orb.Const = Orb.Constant

Orb.RoundAngle = Orb.RoundAngle || function (degree) {
  var angle = degree % 360
  if (angle < 0) {
    angle = angle + 360
  }
  return angle;
}

//time.js
//require core.js
Orb.Time = Orb.Time || function (date) {
  if (!date) {
    var d = new Date();
  } else {
    var d = date;
  }
  this.date = d;
  this.year = d.getUTCFullYear();
  this.month = d.getUTCMonth() + 1;
  this.day = d.getUTCDate();
  this.hours = d.getUTCHours();
  this.minutes = d.getUTCMinutes();
  this.seconds = d.getUTCSeconds();
  this.milliseconds = d.getUTCMilliseconds()
}

Orb.Time.prototype = {

  time_in_day: function () {
    return this.hours / 24 + this.minutes / 1440 + this.seconds / 86400 + this.milliseconds / 86400000;
  },

  jd: function () {
    var year = this.year;
    var month = this.month;;
    var day = this.day;
    var time_in_day = this.time_in_day()
    if (month <= 2) {
      var year = year - 1;
      var month = month + 12;
    }
    var julian_day = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day - 1524.5;
    if (julian_day < 2299160.5) {
      var transition_offset = 0;
    } else {
      var tmp = Math.floor(year / 100);
      var transition_offset = 2 - tmp + Math.floor(tmp / 4);
    }
    var jd = julian_day + transition_offset + time_in_day;
    return jd;
  },

  gmst: function () {
    var rad = Orb.Constant.RAD
    var time_in_sec = this.hours * 3600 + this.minutes * 60 + this.seconds + this.milliseconds / 1000;
    var jd = this.jd();
    var jd0 = jd - this.time_in_day();
    //gmst at 0:00
    var t = (jd0 - 2451545.0) / 36525;
    var gmst_at_zero = (24110.5484 + 8640184.812866 * t + 0.093104 * t * t + 0.0000062 * t * t * t) / 3600;
    if (gmst_at_zero > 24) { gmst_at_zero = gmst_at_zero % 24; }
    //gmst at target time
    var gmst = gmst_at_zero + (time_in_sec * 1.00273790925) / 3600;
    //mean obliquity of the ecliptic
    var e = 23 + 26.0 / 60 + 21.448 / 3600 - 46.8150 / 3600 * t - 0.00059 / 3600 * t * t + 0.001813 / 3600 * t * t * t;
    //nutation in longitude
    var omega = 125.04452 - 1934.136261 * t + 0.0020708 * t * t + t * t * t / 450000;
    var long1 = 280.4665 + 36000.7698 * t;
    var long2 = 218.3165 + 481267.8813 * t;
    var phai = -17.20 * Math.sin(omega * rad) - (-1.32 * Math.sin(2 * long1 * rad)) - 0.23 * Math.sin(2 * long2 * rad) + 0.21 * Math.sin(2 * omega * rad);
    gmst = gmst + ((phai / 15) * (Math.cos(e * rad))) / 3600
    if (gmst < 0) { gmst = gmst % 24 + 24; }
    if (gmst > 24) { gmst = gmst % 24; }
    return gmst
  },
  delta_t: function () {
    //NASA - Polynomial Expressions for Delta T
    //http://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html
    var year = this.year;
    var month = this.month;
    var y = year + (month - 0.5) / 12

    if (year <= -500) {
      var u = (y - 1820) / 100
      var dt = -20 + 32 * u * u;
    } else if (year > -500 && year <= 500) {
      var u = y / 100;
      var dt = 10583.6 - 1014.41 * u + 33.78311 * u * u - 5.952053 * u * u * u - 0.1798452 * u * u * u * u + 0.022174192 * u * u * u * u * u + 0.0090316521 * u * u * u * u * u;
    } else if (year > 500 && year <= 1600) {
      var u = (y - 1000) / 100
      var dt = 1574.2 - 556.01 * u + 71.23472 * u * u + 0.319781 * u * u * u - 0.8503463 * u * u * u * u - 0.005050998 * u * u * u * u * u + 0.0083572073 * u * u * u * u * u * u;
    } else if (year > 1600 && year <= 1700) {
      var t = y - 1600
      var dt = 120 - 0.9808 * t - 0.01532 * t * t + t * t * t / 7129
    } else if (year > 1700 && year <= 1800) {
      var t = y - 1700
      var dt = 8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t * t * t - t * t * t * t / 1174000
    } else if (year > 1800 && year <= 1860) {
      var t = y - 1800
      var dt = 13.72 - 0.332447 * t + 0.0068612 * t * t + 0.0041116 * t * t * t - 0.00037436 * t * t * t * t + 0.0000121272 * t * t * t * t * t - 0.0000001699 * t * t * t * t * t * t + 0.000000000875 * t * t * t * t * t * t * t;
    } else if (year > 1860 && year <= 1900) {
      var t = y - 1860
      var dt = 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t * t * t - 0.0004473624 * t * t * t * t + t * t * t * t * t / 233174
    } else if (year > 1900 && year <= 1920) {
      var t = y - 1900
      var dt = -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t * t * t * t
    } else if (year > 1920 && year <= 1941) {
      var t = y - 1920
      var dt = 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t
    } else if (year > 1941 && year <= 1961) {
      var t = y - 1950
      var dt = 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547
    } else if (year > 1961 && year <= 1986) {
      var t = y - 1975
      var dt = 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718
    } else if (year > 1986 && year <= 2005) {
      var t = y - 2000
      var dt = 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t + 0.000651814 * t * t * t * t + 0.00002373599 * t * t * t * t * t
    } else if (year > 2005 && year <= 2050) {
      var t = y - 2000
      var dt = 62.92 + 0.32217 * t + 0.005589 * t * t
    } else if (year > 2050 && year <= 2150) {
      /*
      This expression is derived from estimated values of ��T in the years 2010 and 2050. The value for 2010 (66.9 seconds) is based on a linearly extrapolation from 2005 using 0.39 seconds/year (average from 1995 to 2005). The value for 2050 (93 seconds) is linearly extrapolated from 2010 using 0.66 seconds/year (average rate from 1901 to 2000).
      */
      var dt = -20 + 32 * ((y - 1820) / 100) * ((y - 1820) / 100) - 0.5628 * (2150 - y)
      //The last term is introduced to eliminate the discontinuity at 2050.
    } else if (year > 2150) {
      var u = (y - 1820) / 100
      var dt = -20 + 32 * u * u
    }
    return dt;
  },

  doy: function () {
    var d = this.date
    var d0 = new Date(Date.UTC(d.getFullYear() - 1, 11, 31, 0, 0, 0));
    var doy = ((d.getTime() - d.getTimezoneOffset() - d0.getTime()) / (1000 * 60 * 60 * 24)).toFixed(8);
    return doy
  }
}

//earth.js
//require core.js, time.js
Orb.Earth = function(){}
Orb.Earth.prototype = {
  xyz: function(date){
    var time = new Orb.Time(date)
    var jd = time.jd();
    var t = ((jd -2451545.0)/365250);
    var v = [0,0,0];
    var target_data = Orb.Terms.Earth;
    for(var i=0,ln = target_data.length; i<ln; i++){
      var tmp_data = target_data[i];
      var n = tmp_data[0];
      var sum = Math.pow(t,Number(tmp_data[1]))*Number(tmp_data[2]) * Math.cos(Number(tmp_data[3]) + Number(tmp_data[4]) * t);
      v[n] = v[n]  + sum;
    }
    return {
      x:v[0],
      y:v[1],
      z:v[2],
      "date":date,
      "coordinate_keywords":"ecliptic rectangular",
      "unit_keywords":"au"
    }
  },
  radec:function(date){
    return {
      "ra":0,
      "dec":0,
      "distance":0,
      "date":date,
      "coordinate_keywords":"equatorial spherical",
      "unit_keywords":"hours degree"
    }
  }
}
Orb.Terms = Orb.Terms || {};
Orb.Terms.Earth=[
  [0,0,0.99982928844,1.75348568475,6283.07584999140],
  [0,0,0.00835257300,1.71034539450,12566.15169998280],
  [0,0,0.00561144206,0.00000000000,0.00000000000],
  [0,0,0.00010466628,1.66722645223,18849.22754997420],
  [0,0,0.00003110838,0.66875185215,83996.84731811189],
  [0,0,0.00002552498,0.58310207301,529.69096509460],
  [0,0,0.00002137256,1.09235189672,1577.34354244780],
  [0,0,0.00001709103,0.49540223397,6279.55273164240],
  [0,0,0.00001707882,6.15315547484,6286.59896834040],
  [0,0,0.00001445242,3.47272783760,2352.86615377180],
  [0,0,0.00001091006,3.68984782465,5223.69391980220],
  [0,0,0.00000934429,6.07389922585,12036.46073488820],
  [0,0,0.00000899144,3.17571950523,10213.28554621100],
  [0,0,0.00000566514,2.15262034016,1059.38193018920],
  [0,0,0.00000684416,1.30699021227,5753.38488489680],
  [0,0,0.00000734455,4.35500196530,398.14900340820],
  [0,0,0.00000681437,2.21821534685,4705.73230754360],
  [0,0,0.00000611238,5.38479234323,6812.76681508600],
  [0,0,0.00000451836,6.08768280868,5884.92684658320],
  [0,0,0.00000451953,1.27933728354,6256.77753019160],
  [0,0,0.00000449517,5.36923831714,6309.37416979120],
  [0,0,0.00000406248,0.54361367084,6681.22485339960],
  [0,0,0.00000540957,0.78677364655,775.52261132400],
  [0,0,0.00000547004,1.46146650376,14143.49524243060],
  [0,0,0.00000520484,4.43295799975,7860.41939243920],
  [0,0,0.00000214960,4.50213844573,11506.76976979360],
  [0,0,0.00000227892,1.23941482802,7058.59846131540],
  [0,0,0.00000225878,3.27244306207,4694.00295470760],
  [0,0,0.00000255820,2.26556277246,12168.00269657460],
  [0,0,0.00000256182,1.45474116190,709.93304855830],
  [0,0,0.00000178120,2.96205424204,796.29800681640],
  [0,0,0.00000161205,1.47337718956,5486.77784317500],
  [0,0,0.00000178325,6.24374704602,6283.14316029419],
  [0,0,0.00000178325,0.40466470869,6283.00853968860],
  [0,0,0.00000155487,1.62409309523,25132.30339996560],
  [0,0,0.00000209024,5.85207528073,11790.62908865880],
  [0,0,0.00000199971,4.07209938245,17789.84561978500],
  [0,0,0.00000128933,5.21693314150,7079.37385680780],
  [0,0,0.00000128099,4.80182882228,3738.76143010800],
  [0,0,0.00000151691,0.86921639327,213.29909543800],
  [0,1,0.00123403056,0.00000000000,0.00000000000],
  [0,1,0.00051500156,6.00266267204,12566.15169998280],
  [0,1,0.00001290726,5.95943124583,18849.22754997420],
  [0,1,0.00001068627,2.01554176551,6283.07584999140],
  [0,1,0.00000212689,1.73380190491,6279.55273164240],
  [0,1,0.00000212515,4.91489371033,6286.59896834040],
  [0,1,0.00000062260,0.36239798178,4705.73230754360],
  [0,1,0.00000059822,3.81195369871,6256.77753019160],
  [0,1,0.00000059514,2.83634160150,6309.37416979120],
  [0,1,0.00000048841,5.21419389335,775.52261132400],
  [0,1,0.00000042883,0.43789776559,1059.38193018920],
  [0,1,0.00000046286,0.01839494103,7860.41939243920],
  [0,1,0.00000035675,1.45279327264,5884.92684658320],
  [0,1,0.00000036061,2.16002201071,5753.38488489680],
  [0,1,0.00000035367,4.47243820095,6812.76681508600],
  [0,1,0.00000032137,5.19589851893,6681.22485339960],
  [0,1,0.00000028763,5.91618989512,25132.30339996560],
  [0,1,0.00000028447,1.14976253807,6127.65545055720],
  [0,1,0.00000027573,5.50119104683,6438.49624942560],
  [0,1,0.00000024815,2.92204909812,5486.77784317500],
  [0,1,0.00000020611,3.71790880968,7079.37385680780],
  [0,1,0.00000019565,2.89351924469,5507.55323866740],
  [0,1,0.00000018308,1.46954314992,11790.62908865880],
  [0,1,0.00000016471,6.22682639292,11506.76976979360],
  [0,1,0.00000016757,3.81935015812,7058.59846131540],
  [0,1,0.00000014555,5.97554823531,6290.18939699220],
  [0,1,0.00000014388,0.68157599309,6275.96230299060],
  [0,1,0.00000013921,1.44156172409,796.29800681640],
  [0,1,0.00000011845,4.15246503623,4694.00295470760],
  [0,1,0.00000012573,0.30429978572,7.11354700080],
  [0,1,0.00000010073,3.28940171828,3738.76143010800],
  [0,1,0.00000010425,4.26610810148,6282.09552892320],
  [0,1,0.00000010425,2.38242547117,6284.05617105960],
  [0,2,0.00004143217,3.14159265359,0.00000000000],
  [0,2,0.00002175695,4.39999849572,12566.15169998280],
  [0,2,0.00000995233,0.20790847155,6283.07584999140],
  [0,2,0.00000092659,4.19285471010,18849.22754997420],
  [0,2,0.00000013679,3.37833642063,6286.59896834040],
  [0,2,0.00000013668,3.27271492019,6279.55273164240],
  [0,3,0.00000175213,3.14159265359,0.00000000000],
  [0,3,0.00000072337,2.89303952476,12566.15169998280],
  [0,3,0.00000008364,3.85500954096,6283.07584999140],
  [0,3,0.00000005040,2.53152989786,18849.22754997420],
  [0,3,0.00000001481,2.23672235234,6438.49624942560],
  [0,3,0.00000001481,4.41181122031,6127.65545055720],
  [0,4,0.00000004022,0.00000000000,0.00000000000],
  [0,4,0.00000001927,1.18746233453,12566.15169998280],
  [1,0,0.99989211030,0.18265890456,6283.07584999140],
  [1,0,0.02442699036,3.14159265359,0.00000000000],
  [1,0,0.00835292314,0.13952878991,12566.15169998280],
  [1,0,0.00010466965,0.09641690558,18849.22754997420],
  [1,0,0.00003110838,5.38114091484,83996.84731811189],
  [1,0,0.00002570338,5.30103973360,529.69096509460],
  [1,0,0.00002147473,2.66253538905,1577.34354244780],
  [1,0,0.00001709219,5.20780401071,6279.55273164240],
  [1,0,0.00001707987,4.58232858766,6286.59896834040],
  [1,0,0.00001440265,1.90068164664,2352.86615377180],
  [1,0,0.00001135092,5.27313415220,5223.69391980220],
  [1,0,0.00000934539,4.50301201844,12036.46073488820],
  [1,0,0.00000900565,1.60563288120,10213.28554621100],
  [1,0,0.00000567126,0.58142248753,1059.38193018920],
  [1,0,0.00000744932,2.80728871886,398.14900340820],
  [1,0,0.00000639316,6.02923915017,5753.38488489680],
  [1,0,0.00000681324,0.64729627497,4705.73230754360],
  [1,0,0.00000611347,3.81381495286,6812.76681508600],
  [1,0,0.00000450435,4.52785572489,5884.92684658320],
  [1,0,0.00000452018,5.99167242707,6256.77753019160],
  [1,0,0.00000449968,3.79880375595,6309.37416979120],
  [1,0,0.00000551390,3.96125249369,5507.55323866740],
  [1,0,0.00000406334,5.25616268027,6681.22485339960],
  [1,0,0.00000541273,5.49902805917,775.52261132400],
  [1,0,0.00000546360,6.17311131785,14143.49524243060],
  [1,0,0.00000507084,2.87025193381,7860.41939243920],
  [1,0,0.00000219504,2.95216139568,11506.76976979360],
  [1,0,0.00000227937,5.95179248814,7058.59846131540],
  [1,0,0.00000227792,4.84547074733,4694.00295470760],
  [1,0,0.00000255845,0.69454231563,12168.00269657460],
  [1,0,0.00000256132,6.16722512388,709.93304855830],
  [1,0,0.00000179242,1.40003446021,796.29800681640],
  [1,0,0.00000178280,5.11717552231,6283.00853968860],
  [1,0,0.00000178280,4.67307255246,6283.14316029419],
  [1,0,0.00000155454,0.05340525434,25132.30339996560],
  [1,0,0.00000206257,4.28366728882,11790.62908865880],
  [1,0,0.00000149769,6.07429023278,5486.77784317500],
  [1,0,0.00000200005,2.50144088120,17789.84561978500],
  [1,0,0.00000129006,3.64623708634,7079.37385680780],
  [1,0,0.00000128211,3.23254821381,3738.76143010800],
  [1,0,0.00000152790,5.58120800450,213.29909543800],
  [1,0,0.00000118725,5.45361490488,9437.76293488700],
  [1,1,0.00093046324,0.00000000000,0.00000000000],
  [1,1,0.00051506609,4.43180499286,12566.15169998280],
  [1,1,0.00001290800,4.38860548540,18849.22754997420],
  [1,1,0.00000464550,5.82729912952,6283.07584999140],
  [1,1,0.00000212689,0.16300556918,6279.55273164240],
  [1,1,0.00000212533,3.34400595407,6286.59896834040],
  [1,1,0.00000062345,5.07377354827,4705.73230754360],
  [1,1,0.00000059794,2.24100907272,6256.77753019160],
  [1,1,0.00000059441,1.26619990626,6309.37416979120],
  [1,1,0.00000048987,3.64166577835,775.52261132400],
  [1,1,0.00000042746,5.15177425824,1059.38193018920],
  [1,1,0.00000046642,4.71575215800,7860.41939243920],
  [1,1,0.00000037274,0.66041323804,5753.38488489680],
  [1,1,0.00000035625,6.15462846966,5884.92684658320],
  [1,1,0.00000035373,2.90052012152,6812.76681508600],
  [1,1,0.00000032157,3.62669702015,6681.22485339960],
  [1,1,0.00000028763,4.34539355621,25132.30339996560],
  [1,1,0.00000028447,5.86215103214,6127.65545055720],
  [1,1,0.00000027502,3.92641632542,6438.49624942560],
  [1,1,0.00000024830,1.35190115953,5486.77784317500],
  [1,1,0.00000020618,2.14772396647,7079.37385680780],
  [1,1,0.00000019531,1.29958310594,5507.55323866740],
  [1,1,0.00000018447,6.17330532651,11790.62908865880],
  [1,1,0.00000016520,4.63328039489,11506.76976979360],
  [1,1,0.00000016754,2.24862220282,7058.59846131540],
  [1,1,0.00000014560,4.40425761361,6290.18939699220],
  [1,1,0.00000014426,5.39226330857,6275.96230299060],
  [1,1,0.00000014186,6.18547219419,796.29800681640],
  [1,1,0.00000012666,5.73231393752,4694.00295470760],
  [1,1,0.00000012966,5.10338935824,7.11354700080],
  [1,1,0.00000010100,1.72464513593,3738.76143010800],
  [1,1,0.00000010425,2.69531177468,6282.09552892320],
  [1,1,0.00000010425,0.81162914438,6284.05617105960],
  [1,2,0.00005080208,0.00000000000,0.00000000000],
  [1,2,0.00002178016,2.82957544235,12566.15169998280],
  [1,2,0.00001020487,4.63746718598,6283.07584999140],
  [1,2,0.00000092688,2.62218748420,18849.22754997420],
  [1,2,0.00000013680,1.80736896884,6286.59896834040],
  [1,2,0.00000013668,1.70191859339,6279.55273164240],
  [1,3,0.00000128116,3.14159265359,0.00000000000],
  [1,3,0.00000072366,1.32019314413,12566.15169998280],
  [1,3,0.00000013847,5.37444701633,6283.07584999140],
  [1,3,0.00000005044,0.96001931081,18849.22754997420],
  [1,3,0.00000001481,0.66592602555,6438.49624942560],
  [1,3,0.00000001481,2.84101489351,6127.65545055720],
  [1,4,0.00000004187,3.14159265359,0.00000000000],
  [1,4,0.00000001931,5.89883838000,12566.15169998280],
  [2,0,0.00000279620,3.19870156017,84334.66158130829],
  [2,0,0.00000101625,5.42248110597,5507.55323866740],
  [2,1,0.00227822442,3.41372504278,6283.07584999140],
  [2,1,0.00005429282,0.00000000000,0.00000000000],
  [2,1,0.00001903183,3.37061270964,12566.15169998280],
  [2,1,0.00000023859,3.32836261978,18849.22754997420],
  [2,2,0.00009721989,5.15233725915,6283.07584999140],
  [2,2,0.00000349501,3.14159265359,0.00000000000],
  [2,2,0.00000067136,0.64403888586,12566.15169998280],
  [2,3,0.00000276077,0.59413258730,6283.07584999140],
  [2,3,0.00000025551,3.14159265359,0.00000000000],
  [2,3,0.00000001810,0.11612262117,12566.15169998280],
  [2,4,0.00000005751,2.27069090892,6283.07584999140],
  [2,4,0.00000001305,0.00000000000,0.00000000000]
]

Orb.NutationAndObliquity  = Orb.NutationAndObliquity || function(date){
  var rad = Orb.Constant.RAD
  //var dt = DeltaT()/86400;
  //var dt = 64/86400;
  var time = new Orb.Time(date)
  var jd = time.jd();// + dt;
  var t = (jd -2451545.0)/36525;
  var omega = (125.04452 - 1934.136261*t+0.0020708*t*t + (t*t+t)/450000)*rad;
  var L0 = (280.4665 + 36000.7698*t)*rad
  var L1 = (218.3165 + 481267.8813*t)*rad
  return {
    nutation:function(){
      var nutation = (-17.20/3600)*Math.sin(omega)-(-1.32/3600)*Math.sin(2*L0)-(0.23/3600)*Math.sin(2*L1)+(0.21/3600)*Math.sin(2*omega)/rad;
      return nutation;
    },
    obliquity:function(){
      var obliquity_zero = 23+26.0/60+21.448/3600 -(46.8150/3600)*t -(0.00059/3600)*t*t +(0.001813/3600)*t*t*t;
      var obliquity_delta = (9.20/3600)*Math.cos(omega) + (0.57/3600)*Math.cos(2*L0) +(0.10/3600)*Math.cos(2*L1)-(0.09/3600)*Math.cos(2*omega);
      var obliquity= obliquity_zero + obliquity_delta;
      return obliquity;
    }
  }
}

Orb.Obliquity  = Orb.Obliquity || function(date){
 var ob = new Orb.NutationAndObliquity(date)
 return ob.obliquity()
}

//coodinates.js
//require core.js, time.js, earth.js
Orb.RadecToXYZ = function (parameter) {
  // equatorial spherical(ra,dec) to rectangular(x,y,z)
  var rad = Orb.Const.RAD;
  var ra = parameter.ra * 15
  var dec = parameter.dec
  var distance = parameter.distance
  if (parameter.date) {
    var date = parameter.date;
  } else {
    var date = null;
  }
  var xyz = {
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

Orb.XYZtoRadec = function (parameter) {
  // equatorial rectangular(x,y,z) to spherical(ra,dec)
  if (parameter.coordinate_keywords && parameter.coordinate_keywords.match(/ecliptic/)) {
    if (parameter.date) {
      var date = parameter.date
    } else {
      var date = new Date()
    }
    var rect = Orb.EclipticToEquatorial({ "date": date, "ecliptic": parameter })
  } else {
    var rect = parameter
    if (parameter.date) {
      var date = parameter.date;
    } else {
      var date = null;
    }
  }
  var rad = Math.PI / 180;
  var eqx = rect.x;
  var eqy = rect.y;
  var eqz = rect.z;
  var ra = Math.atan2(eqy, eqx) / rad;
  if (ra < 0) {
    ra = ra % 360 + 360
  }
  if (ra > 360) {
    ra = ra % 360
  }
  ra = ra / 15
  var dec = Math.atan2(eqz, Math.sqrt(eqx * eqx + eqy * eqy)) / rad;
  var distance = Math.sqrt(eqx * eqx + eqy * eqy + eqz * eqz);
  return {
    "ra": ra,
    "dec": dec,
    "distance": distance,
    "date": date,
    "coordinate_keywords": "equatorial spherical",
    "unit_keywords": "hours degree"
  };
}

Orb.EquatorialToEcliptic = function (parameter) {
  // equatorial rectangular(x,y,z) to ecliptic rectangular(x,y,z)
  var date = parameter.date
  var obliquity = Orb.Obliquity(date)
  var equatorial = parameter.equatorial
  var rad = Orb.Const.RAD;
  var ecliptic = {
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

Orb.EclipticToEquatorial = function (parameter) {
  // ecliptic rectangular(x,y,z) to equatorial rectangular(x,y,z)
  var date = parameter.date
  var ecliptic = parameter.ecliptic
  var rad = Orb.Const.RAD;
  var earth = new Orb.Earth();
  var ep = earth.xyz(date)
  var gcx = ecliptic.x - ep.x;
  var gcy = ecliptic.y - ep.y;
  var gcz = ecliptic.z - ep.z;
  var obliquity = Orb.Obliquity(parameter.date)
  var ecl = obliquity;
  var equatorial = {
    x: gcx,
    y: gcy * Math.cos(ecl * rad) - gcz * Math.sin(ecl * rad),
    z: gcy * Math.sin(ecl * rad) + gcz * Math.cos(ecl * rad)
  }
  return {
    'x': equatorial.x,
    'y': equatorial.y,
    'z': equatorial.z,
    'date': date,
    "coordinate_keywords": "equatorial rectangular",
    "unit_keywords": ""
  }
}
//observation.js
//require core.js, time.js, coordinates.js, earth.js
Orb.Observer = Orb.Observer ||  function(position){
  var rad = Orb.Constant.RAD;
  var a = 6377.39715500; // earth radius
  var e2 = 0.006674372230614;
  var n = a/(Math.sqrt(1-e2*Math.cos(position.latitude*rad)))
  this.latitude = position.latitude
  this.longitude = position.longitude
  this.altitude = position.altitude
}
Orb.Observer.prototype = {

  rectangular: function(time){
    var rad = Orb.Constant.RAD;
    var lat = this.latitude;
    var lng = this.longitude;
    var gmst = time.gmst();
    var lst = gmst*15 + lng;
    var a = 6378.135 + this.altitude;  //Earth's equational radius in WGS-72 (km)
    var f = 0.00335277945 //Earth's flattening term in WGS-72 (= 1/298.26)
    var sin_lat =Math.sin(lat*rad);
    var c = 1/Math.sqrt(1+f*(f-2)*sin_lat*sin_lat);
    var s = (1-f)*(1-f)*c;
    return {
      x: a*c*Math.cos(lat*rad)*Math.cos(lst*rad),
      y: a*c*Math.cos(lat*rad)*Math.sin(lst*rad),
      z: a*s*Math.sin(lat*rad)
    }
  }

}

Orb.Observation = Orb.Observation || function(param){
  this.observer = param.observer;
  this.target = param.target;
}

Orb.Observation.prototype = {

  RadecToHorizontal: function(time,radec){
    var rad = Orb.Constant.RAD;
    var observer = this.observer;
    var ra = Number(radec.ra);
    var dec = Number(radec.dec);
    if(radec.distance != undefined){
      var distance = Number(radec.distance);
    }else{
      var distance = undefined
    }
    var latitude = Number(observer.latitude);
    var longitude = Number(observer.longitude);
    var altitutude = Number(observer.altitutude);
    dec = dec*rad
    var gmst = time.gmst();
    var hour_angle = (gmst*15 + longitude - (ra*15));
    var h = hour_angle*rad;
    var lat = latitude*rad;
    var azimuth = (Math.atan2(-Math.cos(dec)*Math.sin(h),Math.sin(dec)*Math.cos(lat)-Math.cos(dec)*Math.sin(lat)*Math.cos(h)))/rad;
    var elevation = (Math.asin(Math.sin(dec)*Math.sin(lat)+Math.cos(lat)*Math.cos(dec)*Math.cos(h)))/rad;
    if (azimuth<0){
      azimuth = azimuth%360 +360
    }
    return {
      "azimuth" : azimuth,
      "elevation" : elevation,
      "distance": distance
     }
  },
  RectToHorizontal: function(time,rect){
    var rad = Orb.Constant.RAD;
    var observer = this.observer;
    var lat = observer.latitude;
    var lng = observer.longitude;
    var obsv = new Orb.Observer(observer);
    var ob = obsv.rectangular(time)
    var rx0 = rect.x - ob.x;
    var ry0 = rect.y - ob.y
    var rz0 = rect.z - ob.z
    var gmst = time.gmst();
    var lst = gmst*15 + lng;
    var rs = Math.sin(lat*rad)*Math.cos(lst*rad)*rx0 + Math.sin(lat*rad)*Math.sin(lst*rad)*ry0-Math.cos(lat*rad)*rz0;
    var re = -Math.sin(lst*rad)*rx0 + Math.cos(lst*rad)*ry0;
    var rz = Math.cos(lat*rad)*Math.cos(lst*rad)*rx0+Math.cos(lat*rad)*Math.sin(lst*rad)*ry0 + Math.sin(lat*rad)*rz0;
    var range = Math.sqrt(rs*rs+re*re+rz*rz);
    var elevation = Math.asin(rz/range);
    var azimuth  = Math.atan2(-re,rs);
    azimuth = azimuth/rad+180;
    if (azimuth>360){
      azimuth = azimuth%360;
    }
    return {
    "azimuth" : azimuth,
    "elevation" : elevation,
    "distance": range
   }
  },
  azel: function(date){
    var rad = Orb.Constant.RAD;
    var target = this.target;
    var observer = this.observer;
    var time = new Orb.Time(date)
    function get_distance_unit(target){
      if(target.unit_keywords.match(/km/)){
        return "km"
      }else if(target.unit_keywords.match(/au/)){
        return "au"
      }
    }
    if(target.ra != undefined && target.dec != undefined){
      var horizontal = this.RadecToHorizontal(time,target)
      var distance_unit = "au"
    }else if(target.x != undefined && target.y != undefined && target.z != undefined){
      if(target.coordinate_keywords.match(/ecliptic/)){
        if(target.date != undefined ){
          var target_date = target.date;
        }else{
          var target_date = date;
        }
        var rect = Orb.EclipticToEquatorial({"date":target_date,"ecliptic":target})
      }else{
        var rect = target
      }
      var horizontal = this.RectToHorizontal(time,rect)
      var distance_unit = get_distance_unit(rect)
    }else if(target.radec != undefined){
      var radec = target.radec(date)
      var horizontal = this.RadecToHorizontal(time,radec)
      var distance_unit = get_distance_unit(radec)
    }else if(target.xyz != undefined){
      var rect = target.xyz(date);
      var horizontal = this.RectToHorizontal(time,rect)
      var distance_unit = get_distance_unit(rect)
    }

    return {
      "azimuth" : horizontal.azimuth,
      "elevation" : horizontal.elevation,
      "distance": horizontal.distance,
      "date":date,
      "coordinate_keywords":"horizontal spherical",
      "unit_keywords": "degree" + " " + distance_unit
    }
  }
}

//sgp4.js
//require core.js, time.js
Orb.SGP4 = Orb.SGP4 || function (tle) {
  this.tle = tle;
  this.orbital_elements = this.DecodeTLE();
  this.sgp4 = this.SetSGP4()
  this.orbital_period = this.sgp4.orbital_period;
  this.apogee = this.sgp4.apogee;
  this.perigee = this.sgp4.perigee;
}

Orb.SGP4.prototype = {

  DecodeTLE: function () {
    var tle = this.tle;
    var name = tle.name;
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
      line_number_1: Number(line1.slice(0, 0)),
      catalog_no_1: Number(line1.slice(2, 6)),
      security_classification: Number(line1.slice(7, 7)),
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
      check_sum_1: Number(line1.substring(69, 69)),
      line_number_2: Number(line1.slice(0, 0)),
      catalog_no_2: Number(line2.slice(2, 7)),
      inclination: Number(line2.substring(8, 16)),
      right_ascension: Number(line2.substring(17, 25)),
      eccentricity: Number(line2.substring(26, 33)),
      argument_of_perigee: Number(line2.substring(34, 42)),
      mean_anomaly: Number(line2.substring(43, 51)),
      mean_motion: Number(line2.substring(52, 63)),
      rev_number_at_epoch: Number(line2.substring(64, 68)),
      check_sum_2: Number(line1.substring(68, 69))
    }
    return orbital_elements
  },

  SetSGP4: function () {
    var orbital_elements = this.orbital_elements;
    var torad = Math.PI / 180;
    var ck2 = 5.413080e-4;
    var ck4 = 0.62098875e-6;
    var e6a = 1.0e-6;
    var qoms2t = 1.88027916e-9;
    var s = 1.01222928; // 1.0+78.0/xkmper
    var tothrd = 0.66666667;
    var xj3 = -0.253881e-5;
    var xke = 0.743669161e-1;
    var xkmper = 6378.135;
    var xmnpda = 1440.0; // min_par_day
    var ae = 1.0;
    var pi = 3.14159265;
    var pio2 = 1.57079633;
    var twopi = 6.2831853;
    var x3pio2 = 4.71238898;
    var epoch = orbital_elements.epoch;
    var epoch_year = orbital_elements.epoch_year;
    var bstar = orbital_elements.bstar;
    var xincl = orbital_elements["inclination"] * torad;
    var xnodeo = orbital_elements["right_ascension"] * torad;
    var eo = orbital_elements["eccentricity"] * 1e-7;
    var omegao = orbital_elements["argument_of_perigee"] * torad;
    var xmo = orbital_elements["mean_anomaly"] * torad;
    var xno = orbital_elements["mean_motion"] * 2.0 * Math.PI / 1440.0;
    var a1 = Math.pow(xke / xno, tothrd);
    var cosio = Math.cos(xincl);
    var theta2 = cosio * cosio;
    var x3thm1 = 3 * theta2 - 1.0;
    var eosq = eo * eo;
    var betao2 = 1 - eosq;
    var betao = Math.sqrt(betao2);
    var del1 = 1.5 * ck2 * x3thm1 / (a1 * a1 * betao * betao2);
    var ao = a1 * (1 - del1 * ((1.0 / 3.0) + del1 * (1.0 + (134.0 / 81.0) * del1)));
    var delo = 1.5 * ck2 * x3thm1 / (ao * ao * betao * betao2);
    var xnodp = xno / (1.0 + delo); //original_mean_motion
    var aodp = ao / (1.0 - delo); //semi_major_axis
    var orbital_period = 1440.0 / Number(orbital_elements["mean_motion"]);
    var isimp = 0;
    if ((aodp * (1.0 - eo) / ae) < (220.0 / xkmper + ae)) {
      isimp = 1;
    }
    var s4 = s;
    var qoms24 = qoms2t;
    var perigee = (aodp * (1.0 - eo) - ae) * xkmper;
    var apogee = (aodp * (1.0 + eo) - ae) * xkmper;
    if (perigee < 156.0) {
      s4 = perigee - 78.0;
      if (perigee <= 98.0) {
        s4 = 20.0;
      } else {
        var qoms24 = Math.pow(((120.0 - s4) * ae / xkmper), 4);
        s4 = s4 / xkmper + ae;
      }
    }
    var pinvsq = 1.0 / (aodp * aodp * betao2 * betao2);
    var tsi = 1.0 / (aodp - s4);
    var eta = aodp * eo * tsi;
    var etasq = eta * eta;
    var eeta = eo * eta;
    var psisq = Math.abs(1.0 - etasq);
    var coef = qoms24 * Math.pow(tsi, 4);
    var coef1 = coef / Math.pow(psisq, 3.5);
    var c2 = coef1 * xnodp * (aodp * (1.0 + 1.5 * etasq + eeta * (4.0 + etasq)) + 0.75 * ck2 * tsi / psisq * x3thm1 * (8.0 + 3.0 * etasq * (8.0 + etasq)));
    var c1 = bstar * c2;
    var sinio = Math.sin(xincl);
    var a3ovk2 = -xj3 / ck2 * Math.pow(ae, 3);
    var c3 = coef * tsi * a3ovk2 * xnodp * ae * sinio / eo;
    var x1mth2 = 1.0 - theta2;
    var c4 = 2.0 * xnodp * coef1 * aodp * betao2 * (eta * (2.0 + 0.5 * etasq) + eo * (0.5 + 2.0 * etasq) - 2.0 * ck2 * tsi / (aodp * psisq) * (-3.0 * x3thm1 * (1.0 - 2.0 * eeta + etasq * (1.5 - 0.5 * eeta)) + 0.75 * x1mth2 * (2.0 * etasq - eeta * (1.0 + etasq)) * Math.cos((2.0 * omegao))));
    var c5 = 2.0 * coef1 * aodp * betao2 * (1.0 + 2.75 * (etasq + eeta) + eeta * etasq);
    var theta4 = theta2 * theta2;
    var temp1 = 3.0 * ck2 * pinvsq * xnodp;
    var temp2 = temp1 * ck2 * pinvsq;
    var temp3 = 1.25 * ck4 * pinvsq * pinvsq * xnodp;
    var xmdot = xnodp + 0.5 * temp1 * betao * x3thm1 + 0.0625 * temp2 * betao * (13.0 - 78.0 * theta2 + 137.0 * theta4);
    var x1m5th = 1.0 - 5.0 * theta2;
    var omgdot = -0.5 * temp1 * x1m5th + 0.0625 * temp2 * (7.0 - 114.0 * theta2 + 395.0 * theta4) + temp3 * (3.0 - 36.0 * theta2 + 49.0 * theta4);
    var xhdot1 = -temp1 * cosio;
    var xnodot = xhdot1 + (0.5 * temp2 * (4.0 - 19.0 * theta2) + 2.0 * temp3 * (3.0 - 7.0 * theta2)) * cosio;
    var omgcof = bstar * c3 * Math.cos(omegao);
    var xmcof = -tothrd * coef * bstar * ae / eeta;
    var xnodcf = 3.5 * betao2 * xhdot1 * c1;
    var t2cof = 1.5 * c1;
    var xlcof = 0.125 * a3ovk2 * sinio * (3.0 + 5.0 * cosio) / (1.0 + cosio);
    var aycof = 0.25 * a3ovk2 * sinio;
    var delmo = Math.pow((1.0 + eta * Math.cos(xmo)), 3);
    var sinmo = Math.sin(xmo);
    var x7thm1 = 7.0 * theta2 - 1.0;
    if (isimp != 1) {
      var c1sq = c1 * c1;
      var d2 = 4.0 * aodp * tsi * c1sq;
      var temp = d2 * tsi * c1 / 3.0;
      var d3 = (17.0 * aodp + s4) * temp;
      var d4 = 0.5 * temp * aodp * tsi * (221.0 * aodp + 31.0 * s4) * c1;
      var t3cof = d2 + 2.0 * c1sq;
      var t4cof = 0.25 * (3.0 * d3 + c1 * (12.0 * d2 + 10.0 * c1sq));
      var t5cof = 0.2 * (3.0 * d4 + 12.0 * c1 * d3 + 6.0 * d2 * d2 + 15.0 * c1sq * (2.0 * d2 + c1sq));
    }
    //set accesser
    return {
      orbital_elements: orbital_elements,
      apogee: apogee,
      perigee: perigee,
      orbital_period: orbital_period,
      epoch_year: epoch_year,
      epoch: epoch,
      xmo: xmo,
      xmdot: xmdot,
      omegao: omegao,
      omgdot: omgdot,
      xnodeo: xnodeo,
      xnodot: xnodot,
      xnodcf: xnodcf,
      bstar: bstar,
      t2cof: t2cof,
      omgcof: omgcof,
      isimp: isimp,
      xmcof: xmcof,
      eta: eta,
      delmo: delmo,
      c1: c1,
      c4: c4,
      c5: c5,
      d2: d2,
      d3: d3,
      d4: d4,
      sinmo: sinmo,
      t3cof: t3cof,
      t4cof: t4cof,
      t5cof: t5cof,
      aodp: aodp,
      eo: eo,
      xnodp: xnodp,
      xke: xke,
      xlcof: xlcof,
      aycof: aycof,
      x3thm1: x3thm1,
      x1mth2: x1mth2,
      xincl: xincl,
      cosio: cosio,
      sinio: sinio,
      e6a: e6a,
      ck2: ck2,
      x7thm1: x7thm1,
      xkmper: xkmper
    }
  },

  ExecSGP4: function (time) {
    var rad = Orb.Constant.RAD
    var sgp4 = this.sgp4;
    var orbital_elements = this.orbital_elements;
    var tsince = (function (time, orbital_elements) {
      var epoch_year = orbital_elements.epoch_year;
      var epoch = orbital_elements.epoch;
      var year2 = epoch_year - 1;
      var now_sec = Date.UTC(time.year, time.month - 1, time.day, time.hours, time.minutes, time.seconds, time.milliseconds);
      var epoch_sec = Date.UTC(year2, 11, 31, 0, 0, 0) + (epoch * 24 * 60 * 60 * 1000);
      var elapsed_time = (now_sec - epoch_sec) / (60 * 1000);
      return elapsed_time;
    })(time, orbital_elements)
    var xmo = sgp4.xmo;
    var xmdot = sgp4.xmdot;
    var omegao = sgp4.omegao;
    var omgdot = sgp4.omgdot;
    var xnodeo = sgp4.xnodeo;
    var xnodot = sgp4.xnodot;
    var xnodcf = sgp4.xnodcf
    var bstar = sgp4.bstar;
    var t2cof = sgp4.t2cof;
    var omgcof = sgp4.omgcof;
    var isimp = sgp4.isimp;
    var xmcof = sgp4.xmcof;
    var eta = sgp4.eta;
    var delmo = sgp4.delmo;
    var c1 = sgp4.c1;
    var c4 = sgp4.c4;
    var c5 = sgp4.c5;
    var d2 = sgp4.d2;
    var d3 = sgp4.d3;
    var d4 = sgp4.d4;
    var sinmo = sgp4.sinmo;
    var t3cof = sgp4.t3cof;
    var t4cof = sgp4.t4cof;
    var t5cof = sgp4.t5cof;
    var aodp = sgp4.aodp;
    var eo = sgp4.eo;
    var xnodp = sgp4.xnodp;
    var xke = sgp4.xke;
    var xlcof = sgp4.xlcof;
    var aycof = sgp4.aycof;
    var x3thm1 = sgp4.x3thm1;
    var x1mth2 = sgp4.x1mth2;
    var xincl = sgp4.xincl;
    var cosio = sgp4.cosio;
    var sinio = sgp4.sinio;
    var e6a = sgp4.e6a;
    var ck2 = sgp4.ck2;
    var x7thm1 = sgp4.x7thm1;
    var xkmper = sgp4.xkmper;
    var epoch_year = sgp4.epoch_year;
    var epoch = sgp4.epoch;
    var xmdf = xmo + xmdot * tsince;
    var omgadf = omegao + omgdot * tsince;
    var xnoddf = xnodeo + xnodot * tsince;
    var omega = omgadf;
    var xmp = xmdf;
    var tsq = tsince * tsince;
    var xnode = xnoddf + xnodcf * tsq;
    var tempa = 1.0 - c1 * tsince;
    var tempe = bstar * c4 * tsince;
    var templ = t2cof * tsq;
    if (isimp != 1) {
      var delomg = omgcof * tsince;
      var delm = xmcof * (Math.pow((1.0 + eta * Math.cos(xmdf)), 3) - delmo);
      var temp = delomg + delm;
      var xmp = xmdf + temp;
      var omega = omgadf - temp;
      var tcube = tsq * tsince;
      var tfour = tsince * tcube;
      var tempa = tempa - d2 * tsq - d3 * tcube - d4 * tfour;
      var tempe = tempe + bstar * c5 * (Math.sin(xmp) - sinmo);
      var templ = templ + t3cof * tcube + tfour * (t4cof + tsince * t5cof);
    }
    var a = aodp * tempa * tempa;
    var e = eo - tempe;
    var xl = xmp + omega + xnode + xnodp * templ;
    var beta = Math.sqrt(1.0 - e * e);
    var xn = xke / Math.pow(a, 1.5);

    // long period periodics
    var axn = e * Math.cos(omega);
    var temp = 1.0 / (a * beta * beta);
    var xll = temp * xlcof * axn;
    var aynl = temp * aycof;
    var xlt = xl + xll;
    var ayn = e * Math.sin(omega) + aynl;

    // solve keplers equation
    var capu = (xlt - xnode) % (2.0 * Math.PI);
    var temp2 = capu;
    for (var i = 1; i <= 10; i++) {
      var sinepw = Math.sin(temp2);
      var cosepw = Math.cos(temp2);
      var temp3 = axn * sinepw;
      var temp4 = ayn * cosepw;
      var temp5 = axn * cosepw;
      var temp6 = ayn * sinepw;
      var epw = (capu - temp4 + temp3 - temp2) / (1.0 - temp5 - temp6) + temp2;
      if (Math.abs(epw - temp2) <= e6a) {
        break
      };
      temp2 = epw;
    }
    // short period preliminary quantities
    var ecose = temp5 + temp6;
    var esine = temp3 - temp4;
    var elsq = axn * axn + ayn * ayn;
    var temp = 1.0 - elsq;
    var pl = a * temp;
    var r = a * (1.0 - ecose);
    var temp1 = 1.0 / r;
    var rdot = xke * Math.sqrt(a) * esine * temp1;
    var rfdot = xke * Math.sqrt(pl) * temp1;
    var temp2 = a * temp1;
    var betal = Math.sqrt(temp);
    var temp3 = 1.0 / (1.0 + betal);
    var cosu = temp2 * (cosepw - axn + ayn * esine * temp3);
    var sinu = temp2 * (sinepw - ayn - axn * esine * temp3);
    var u = Math.atan2(sinu, cosu);
    if (u < 0) { u += 2 * Math.PI; }
    var sin2u = 2.0 * sinu * cosu;
    var cos2u = 2.0 * cosu * cosu - 1.;
    var temp = 1.0 / pl;
    var temp1 = ck2 * temp;
    var temp2 = temp1 * temp;
    // update for short periodics
    var rk = r * (1.0 - 1.5 * temp2 * betal * x3thm1) + 0.5 * temp1 * x1mth2 * cos2u;
    var uk = u - 0.25 * temp2 * x7thm1 * sin2u;
    var xnodek = xnode + 1.5 * temp2 * cosio * sin2u;
    var xinck = xincl + 1.5 * temp2 * cosio * sinio * cos2u;
    var rdotk = rdot - xn * temp1 * x1mth2 * sin2u;
    var rfdotk = rfdot + xn * temp1 * (x1mth2 * cos2u + 1.5 * x3thm1);
    // orientation vectors
    var sinuk = Math.sin(uk);
    var cosuk = Math.cos(uk);
    var sinik = Math.sin(xinck);
    var cosik = Math.cos(xinck);
    var sinnok = Math.sin(xnodek);
    var cosnok = Math.cos(xnodek);
    var xmx = -sinnok * cosik;
    var xmy = cosnok * cosik;
    var ux = xmx * sinuk + cosnok * cosuk;
    var uy = xmy * sinuk + sinnok * cosuk;
    var uz = sinik * sinuk;
    var vx = xmx * cosuk - cosnok * sinuk;
    var vy = xmy * cosuk - sinnok * sinuk;
    var vz = sinik * cosuk;
    var x = rk * ux;
    var y = rk * uy;
    var z = rk * uz;
    var xdot = rdotk * ux + rfdotk * vx;
    var ydot = rdotk * uy + rfdotk * vy;
    var zdot = rdotk * uz + rfdotk * vz;
    var xkm = (x * xkmper);
    var ykm = (y * xkmper);
    var zkm = (z * xkmper);
    var xdotkmps = (xdot * xkmper / 60);
    var ydotkmps = (ydot * xkmper / 60);
    var zdotkmps = (zdot * xkmper / 60);
    return {
      x: xkm,
      y: ykm,
      z: zkm,
      xdot: xdotkmps,
      ydot: ydotkmps,
      zdot: zdotkmps,
    }
  },

  RectangularToGeographic: function (time, rect) {
    var time = time;
    var xkm = rect.x;
    var ykm = rect.y;
    var zkm = rect.z;
    var xdotkmps = rect.xdot;
    var ydotkmps = rect.ydot;
    var zdotkmps = rect.zdot;
    var rad = Orb.Constant.RAD;
    var gmst = time.gmst();
    var lst = gmst * 15;
    var f = 0.00335277945 //Earth's flattening term in WGS-72 (= 1/298.26)
    var a = 6378.135  //Earth's equational radius in WGS-72 (km)
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
  },

  xyz: function (date) {
    var time = new Orb.Time(date)
    var rect = this.ExecSGP4(time);
    return {
      "x": rect.x,
      "y": rect.y,
      "z": rect.z,
      "xdot": rect.xdot,
      "ydot": rect.ydot,
      "zdot": rect.zdot,
      "date": date,
      "coordinate_keywords": "equational rectangular",
      "unit_keywords": "km"
    }
  },

  latlng: function (date) {
    var time = new Orb.Time(date)
    var rect = this.ExecSGP4(time);
    var geo = this.RectangularToGeographic(time, rect);
    return {
      "latitude": geo.latitude,
      "longitude": geo.longitude,
      "altitude": geo.altitude,
      "velocity": geo.velocity,
      "date": date,
      "coordinate_keywords": "geographic spherical",
      "unit_keywords": "degree km"
    }
  }

}

Orb.Satellite = Orb.Satellite || Orb.SGP4
