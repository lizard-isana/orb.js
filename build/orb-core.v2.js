// orb.js
//
// Orb 2.1.0 - Javascript Library for Astronomical Calcrations
//
// Copyright (c) 2017 KASHIWAI, Isana
// Licensed under the MIT license (MIT-LICENSE.txt),

// for Name Space
var Orb;

Orb = Orb || {};

Orb.Storage = Orb.Storage ||  {}

// constant.js
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

// core.js
Orb.RoundAngle = Orb.RoundAngle || function(degree){
  var angle = degree%360
  if(angle<0){
    angle = angle+360
  }
  return angle;
}

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

//time.js
Orb.Time = Orb.Time || function(date){
  if(!date){
    var _date = new Date();
  }else{
    var _date = date;
  }

  var _getUTCArray = function(_date){
    return {
      year: _date.getUTCFullYear(),
      month: _date.getUTCMonth()+1,
      day: _date.getUTCDate(),
      hours: _date.getUTCHours(),
      minutes: _date.getUTCMinutes(),
      seconds: _date.getUTCSeconds()
    }
  }

  var _utc = _getUTCArray(_date);

  var _time_in_day = function(){
      return _utc.hours/24 + _utc.minutes/1440 + _utc.seconds/86400
  }

  var _jd = function(){
      var year = _utc.year;
      var month = _utc.month;;
      var day = _utc.day;
      var calender = "";
      if(month <= 2){
        var year = year - 1;
        var month = month + 12;
      }
      var julian_day = Math.floor(365.25*(year+4716))+Math.floor(30.6001*(month+1))+day-1524.5;
      if (calender == "julian"){
        var transition_offset=0;
      }else if(calender == "gregorian"){
        var tmp = Math.floor(year/100);
        var transition_offset=2-tmp+Math.floor(tmp/4);
      }else if(julian_day<2299160.5){
        var transition_offset=0;
      }else{
        var tmp = Math.floor(year/100);
        var transition_offset=2-tmp+Math.floor(tmp/4);
      }
      var jd=julian_day+transition_offset;
      return jd;
  }

  var _gmst = function(){
    var rad = Orb.Constant.RAD
      var time_in_sec = _utc.hours*3600 + _utc.minutes*60 + _utc.seconds;
      var jd = _jd();
      //gmst at 0:00
      var t = (jd-2451545.0)/36525;
      var gmst_at_zero = (24110.5484 + 8640184.812866*t+0.093104*t*t+0.0000062*t*t*t)/3600;
      if(gmst_at_zero>24){gmst_at_zero=gmst_at_zero%24;}
      //gmst at target time
      var gmst = gmst_at_zero+(time_in_sec * 1.00273790925)/3600;
      //mean obliquity of the ecliptic
      var e = 23+26.0/60+21.448/3600 -46.8150/3600*t -0.00059/3600*t*t +0.001813/3600*t*t*t;
      //nutation in longitude
      var omega = 125.04452-1934.136261*t+0.0020708*t*t+t*t*t/450000;
      var long1 = 280.4665 + 36000.7698*t;
      var long2 = 218.3165 + 481267.8813*t;
      var phai = -17.20*Math.sin(omega*rad)-(-1.32*Math.sin(2*long1*rad))-0.23*Math.sin(2*long2*rad) + 0.21*Math.sin(2*omega*rad);
      gmst =gmst + ((phai/15)*(Math.cos(e*rad)))/3600
      if(gmst<0){gmst=gmst%24+24;}
      if(gmst>24){gmst=gmst%24;}
      return gmst
  }

  var _delta_t = function(){
      //NASA - Polynomial Expressions for Delta T
      //http://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html
      var year = _utc.year;
      var month = _utc.month;;
      var y = year + (month - 0.5)/12

      if(year<=-500){
        var u = (y-1820)/100
        var dt = -20 + 32 * u*u;
      }else if(year>-500 && year<=500){
        var u = y/100;
        var dt = 10583.6 - 1014.41 * u + 33.78311 * u*u - 5.952053 * u*u*u - 0.1798452 * u*u*u*u + 0.022174192 * u*u*u*u*u + 0.0090316521 * u*u*u*u*u;
      }else if(year>500 && year<=1600){
        var u = (y-1000)/100
        var dt = 1574.2 - 556.01 * u + 71.23472 * u*u + 0.319781 * u*u*u - 0.8503463 * u*u*u*u - 0.005050998 * u*u*u*u*u + 0.0083572073 * u*u*u*u*u*u;
      }else if(year>1600 && year<=1700){
        var t = y - 1600
        var dt = 120 - 0.9808 * t - 0.01532 * t*t + t*t*t/7129
      }else if(year>1700 && year<=1800){
        var t = y - 1700
        var dt = 8.83 + 0.1603 * t - 0.0059285 * t*t + 0.00013336 * t*t*t - t*t*t*t/1174000
      }else if(year>1800 && year<=1860){
        var t = y - 1800
        var dt = 13.72 - 0.332447 * t + 0.0068612 * t*t + 0.0041116 * t*t*t - 0.00037436 * t*t*t*t + 0.0000121272 * t*t*t*t*t - 0.0000001699 * t*t*t*t*t*t + 0.000000000875 * t*t*t*t*t*t*t;
      }else if(year>1860 && year<=1900){
        var t = y - 1860
        var dt = 7.62 + 0.5737 * t - 0.251754 * t*t + 0.01680668 * t*t*t -0.0004473624 * t*t*t*t + t*t*t*t*t/233174
      }else if(year>1900 && year<=1920){
        var t = y - 1900
        var dt = -2.79 + 1.494119 * t - 0.0598939 * t*t + 0.0061966 * t*t*t - 0.000197 * t*t*t*t
      }else if(year>1920 && year<=1941){
        var t = y - 1920
        var dt = 21.20 + 0.84493*t - 0.076100 * t*t + 0.0020936 * t*t*t
      }else if(year>1941 && year<=1961){
        var t = y - 1950
        var dt = 29.07 + 0.407*t - t*t/233 + t*t*t/2547
      }else if(year>1961 && year<=1986){
        var t = y - 1975
        var dt = 45.45 + 1.067*t - t*t/260 - t*t*t/718
      }else if(year>1986 && year<=2005){
        var t = y - 2000
        var dt = 63.86 + 0.3345 * t - 0.060374 * t*t + 0.0017275 * t*t*t + 0.000651814 * t*t*t*t + 0.00002373599 * t*t*t*t*t
      }else if(year>2005 && year<=2050){
        var t = y - 2000
        var dt = 62.92 + 0.32217 * t + 0.005589 * t*t
      }else if(year>2050 && year<=2150){
        /*
        This expression is derived from estimated values of ��T in the years 2010 and 2050. The value for 2010 (66.9 seconds) is based on a linearly extrapolation from 2005 using 0.39 seconds/year (average from 1995 to 2005). The value for 2050 (93 seconds) is linearly extrapolated from 2010 using 0.66 seconds/year (average rate from 1901 to 2000).
        */
        var dt = -20 + 32 * ((y-1820)/100)*((y-1820)/100) - 0.5628 * (2150 - y)
        //The last term is introduced to eliminate the discontinuity at 2050.
      }else if(year>2150){
        var u = (y-1820)/100
        var dt = -20 + 32 * u*u
      }
    return dt;
    } // end of _delta_t()

    var _et = function(){
      var et = new Date();
      et.setTime(_date.getTime() + _delta_t());
      var time = new Orb.Time(et);
      return time;
    }

  var _doy = function(){
    var d=_date
    var d0=new Date(Date.UTC(d.getFullYear()-1,11,31,0,0,0));
    var doy=((d.getTime()-d.getTimezoneOffset()-d0.getTime())/(1000*60*60*24)).toFixed(8);
    return doy
  }

  return {
    date : _date,
    year: Number(_utc.year),
    month: Number(_utc.month),
    day: Number(_utc.day),
    hours: Number(_utc.hours),
    minutes: Number(_utc.minutes),
    seconds: Number(_utc.seconds),
    time_in_day:function(){
      return _time_in_day()
    },
    jd : function(){
      return _jd() + _time_in_day()
    },
    gmst: function(){
      return _gmst()
    },
    doy: function(){
      return _doy()
    }
  } // end of return Orb.Time
} // end of Orb.Time

//coodinates.js
Orb.RadecToXYZ = function (parameter){
  // equatorial spherical(ra,dec) to rectangular(x,y,z)
  var rad=Orb.Const.RAD;
  var ra = parameter.ra*15
  var dec = parameter.dec
  var distance = parameter.distance
  var xyz = {
   "x": distance*Math.cos(dec*rad)*Math.cos(ra*rad),
   "y": distance*Math.cos(dec*rad)*Math.sin(ra*rad),
   "z": distance*Math.sin(dec*rad)
  }
  return {
    'x':xyz.x,
    'y':xyz.y,
    'z':xyz.z,
    "coordinate_keywords":"equatorial rectangular",
    "unit_keywords":""
  }
}

Orb.XYZtoRadec = function (parameter){
  // equatorial rectangular(x,y,z) to spherical(ra,dec)
  if(parameter.coordinate_keywords && parameter.coordinate_keywords.match(/ecliptic/)){
    if(parameter.date){
      var date = parameter.date
    }else{
      var date = new Date()
    }
    var rect = Orb.EclipticToEquatorial({"date":date,"ecliptic":parameter})
  }else{
    var rect = parameter
  }
  var rad=Math.PI/180;
  var eqx = rect.x;
  var eqy = rect.y;
  var eqz = rect.z;
  var ra = Math.atan2(eqy,eqx)/rad;
  if (ra <0){
    ra = ra%360+360
  }
  if(ra >360){
    ra = ra%360
  }
  ra=ra/15
  var dec = Math.atan2(eqz,Math.sqrt(eqx*eqx + eqy*eqy))/rad;
  var distance = Math.sqrt(eqx*eqx + eqy*eqy + eqz*eqz);
  return {
    "ra":ra,
    "dec":dec,
    "distance":distance,
    "coordinate_keywords":"equatorial spherical",
    "unit_keywords":"hours degree"
 };
}

Orb.EquatorialToEcliptic = function (parameter){
  // equatorial rectangular(x,y,z) to ecliptic rectangular(x,y,z)
  var date = parameter.date
  var obliquity = Orb.Obliquity(date)
  var equatorial = parameter.equatorial
  var rad=Orb.Const.RAD;
  var ecliptic = {
      x: equatorial.x,
      y: Math.cos(obliquity*rad)*equatorial.y+Math.sin(obliquity*rad)*equatorial.z,
      z: -Math.sin(obliquity*rad)*equatorial.y+Math.cos(obliquity*rad)*equatorial.z
  }
  return  {
    'x':ecliptic.x,
    'y':ecliptic.y,
    'z':ecliptic.z,
    'date':date,
    "coordinate_keywords":"ecliptic rectangular",
    "unit_keywords":""
  }
}

Orb.EclipticToEquatorial = function(parameter){
  // ecliptic rectangular(x,y,z) to equatorial rectangular(x,y,z)
  var date = parameter.date
  var ecliptic = parameter.ecliptic
  var rad=Orb.Const.RAD;
  var earth = new Orb.VSOP("Earth")
  var ep = earth.xyz(date)
  var gcx = ecliptic.x-ep.x;
  var gcy = ecliptic.y-ep.y;
  var gcz = ecliptic.z-ep.z;
  var obliquity = Orb.Obliquity(parameter.date)
  var ecl = obliquity;
  var equatorial = {
    x: gcx,
    y: gcy*Math.cos(ecl*rad) - gcz * Math.sin(ecl*rad),
    z: gcy*Math.sin(ecl*rad) + gcz * Math.cos(ecl*rad)
  }
  return  {
    'x':equatorial.x,
    'y':equatorial.y,
    'z':equatorial.z,
    'date':date,
    "coordinate_keywords":"equatorial rectangular",
    "unit_keywords":""
  }
}

//observation.js
Orb.Observer = Orb.Observer ||  function(position){
  var rad = Orb.Constant.RAD;
  var a = 6377.39715500; // earth radius
  var e2 = 0.006674372230614;
  var n = a/(Math.sqrt(1-e2*Math.cos(position.latitude*rad)))
  return {
    latitude: position.latitude,
    longitude: position.longitude,
    altitude: position.altitude,
    rectangular: function(time){
      var lat = position.latitude;
      var lng = position.longitude;
      var gmst = time.gmst();
      var lst = gmst*15 + lng;
      var a = 6378.135  //Earth's equational radius in WGS-72 (km)
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
}

Orb.Observation = Orb.Observation || function(param){
  var observer = param.observer;
  var target = param.target;
  var rad = Orb.Constant.RAD;
  var _radec2horizontal = function(time,target,observer){
      var ra = Number(target.ra);
      var dec = Number(target.dec);
      if(target.distance != undefined){
      var distance = Number(target.distance);
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
  }
  var _rect2horizontal = function(time,rect,observer){
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
  }
  var _horizontal = function(date){
    var time = new Orb.Time(date)

    function get_distance_unit(target){
      if(target.unit_keywords.match(/km/)){
        return "km"
      }else if(target.unit_keywords.match(/au/)){
        return "au"
      }
    }

    if(target.ra != undefined && target.dec != undefined){
      var horizontal = _radec2horizontal(time,target,observer)
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
      var horizontal = _rect2horizontal(time,rect,observer)
      var distance_unit = get_distance_unit(rect)
    }else if(target.radec != undefined){
      var radec = target.radec(date)
      var horizontal = _radec2horizontal(time,radec,observer)
      var distance_unit = get_distance_unit(radec)
    }else if(target.xyz != undefined){
      var rect = target.xyz(date);
      var horizontal = _rect2horizontal(time,rect,observer)
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
  return {
    // equatorial to horizontal
    azel: function(date){
        return _horizontal(date);
    } // end Orb.Observation.horizontal
  } // end of return
} //
