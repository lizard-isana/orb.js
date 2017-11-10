// orb.js
//
// Orb 2.1.1 - Javascript Library for Astronomical Calcrations
//
// Copyright (c) 2017 KASHIWAI, Isana
// Licensed under the MIT license (MIT-LICENSE.txt),

// for Name Space
var Orb = Orb || {};

Orb.Constant = Orb.Constant ||  {
  "PI":Math.PI,
  "RAD":Math.PI/180, //RADIAN
  "AU":149597870.700, //ASTRONOMICAL_UNIT(km)
  "RE": 6378.137, //EARTH_RADIUS(km)
  "LD": 384000, //LUNA_DISTANCE(km)
  "LY": Number("9.46073E+12"), //LIGHT_YEAR(km)
  "PC":Number("3.08568E+13"), //PARSEC(km)
  "G":Number("6.6740831E-11"), //GRAVITATIONAL_CONSTANT
  "GM":2.9591220828559093*Math.pow(10,-4),
  "Planets":["Sun","Mercury","Venus","Earth","Moon","Mars","Jupiter","Saturn","Uranus","Neptune"],
  "Sun":{
    "radius":1392038/2,
    "obliquity":7.25,
    "mass":Number("1.989E+30"),
    "gm":Number("1.327124400189E+11")
  },
  "Mercury":{
    "radius":4879.4/2,
    "obliquity":0.027,
    "mass":Number("3.301E+23"),
    "gm":220329
  },
  "Venus":{
    "radius":12103.6/2,
    "obliquity":177.36,
    "mass":Number("4.867E+24"),
    "gm":3248599
  },
  "Earth":{
    "radius":12756.3/2,
    "obliquity":23.435,
    "mass":Number("5.972E+24"),
    "gm": Number("3.9860044189E+5")
  },
  "Moon":{
    "radius":1737.4,
    "obliquity":1.5424,
    "mass":Number("7.346E+22"),
    "gm":4904.86959
  },
  "Mars":{
    "radius":6794.4/2,
    "obliquity":25,
    "mass":Number("6.417E+24"),
    "gm":42828.9
  },
  "Jupiter":{
    "radius":142984/2,
    "obliquity":3.08,
    "mass":Number("1.899E+27"),
    "gm":1266865349
  },
  "Saturn":{
    "radius":120536/2,
    "obliquity":26.7,
    "mass":Number("5.685E+26"),
    "gm":379311879
  },
  "Uranus":{
    "radius":51118/2,
    "obliquity":97.9,
    "mass":Number("8.682E+26"),
    "gm":57939399
  },
  "Neptune":{
    "radius":49572/2,
    "obliquity":29.6,
    "mass":Number("1.024E+26"),
    "gm":68365299
  }
}
Orb.Const = Orb.Constant

Orb.RoundAngle = Orb.RoundAngle || function(degree){
  var angle = degree%360
  if(angle<0){
    angle = angle+360
  }
  return angle;
}
