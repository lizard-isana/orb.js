// orb - core.js
//
// Orb 0.0.1 - Javascript Library for Astronomical Calcrations
//
// Copyright (c) 2010 KASHIWAI, Isana
// Dual licensed under the MIT (MIT-LICENSE.txt), 
// and GPL (GPL-LICENSE.txt) licenses.
//
// Date: 2010-07-15 00:00:00 +0900 (Sun, 20 Jun 2010)
// Rev: 0001
//

// This script includes "json2.js" on the last part of the file.
// "json2.js" creates a global JSON object
// Copyright/License: Public Domain
// ref. http://www.JSON.org/js.html


// for Name Space
var Orb;

Orb = Orb || {
    VERSION : "0.0.0 pre-alpha",
    AUTHOR : "KASHIWAI,Isana",
    LICENSE : "GPL"
};


(function (global) {
  "use strict";

Orb.Tool = Orb.Tool || {
  
  DataLoader : function(option){
    var XMLhttpObject;
    var createXMLhttpObject = function(){
      XMLhttpObject = false;
      if(window.XMLHttpRequest) {
        XMLhttpObject = new XMLHttpRequest();
      }else if(window.ActiveXObject) {
        try {
          XMLhttpObject = new ActiveXObject("Msxml2.XMLHTTP");
        }catch(e){
          if(console){console.log(e)}
          XMLhttpObject = new ActiveXObject("Microsoft.XMLHTTP");
        }
      }
      return XMLhttpObject;
    }
    
    var Loader = function(option) {
  
      XMLhttpObject=createXMLhttpObject();
      if (!XMLhttpObject){return;}
      XMLhttpObject.open("GET", option.path, option.ajax);
      XMLhttpObject.send(null);
      if(option.ajax==false){
        try{
          if(option.format === "json"){
            var data = JSON.parse(XMLhttpObject.responseText);
          }else{
            var data = XMLhttpObject.responseText;
          }
          if(option.callback !== undefined){
            option.callback(data);
          }else{
            return data;
          }
        }catch(e){
          if(console){console.log(e)}
          return;
        }
      }else{
        try{
          XMLhttpObject.onreadystatechange = function() {
            if(XMLhttpObject.readyState == 4){
              if(XMLhttpObject.status == 200){
                var data = JSON.parse(XMLhttpObject.responseText);
                if(callback){
                  callback(data);
                }else{
                  return data;
                }
              }
            }else{
              return;
            }
          }
        }catch(e){
          if(console){console.log(e)}
          return;
        }
      }
    }
    return Loader(option);
  } // end Orb.Tool.DataLoader
} // end Orb.Tool
}(this));


(function (global) {
  "use strict";
Orb.Time = function(date){

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
      var rad=Math.PI/180;
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

  var _mjd = function(){
      var jd = _jd();
      var mjd = jd - 2400000.5;
      return mjd;
  }
 
  var _tjd = function(){
      var jd = jd();
      var tjd=jd - 2440000.5;
      return tjd;
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
        This expression is derived from estimated values of ƒ¢T in the years 2010 and 2050. The value for 2010 (66.9 seconds) is based on a linearly extrapolation from 2005 using 0.39 seconds/year (average from 1995 to 2005). The value for 2050 (93 seconds) is linearly extrapolated from 2010 using 0.66 seconds/year (average rate from 1901 to 2000).
        */
        var dt = -20 + 32 * ((y-1820)/100)*((y-1820)/100) - 0.5628 * (2150 - y)
        //The last term is introduced to eliminate the discontinuity at 2050.
      }else if(year>2150){
        var u = (y-1820)/100
        var dt = -20 + 32 * u*u
      }
    return dt;
    } // end of DeltaT()

    var _et = function(){
      var et = new Date();
      et.setTime(_date.getTime() + DeltaT());
      var time = new Orb.Time(et);
      return time;
    }
  
  return {
    date : _date,
    year: Number(_utc.year),
    month: Number(_utc.month),
    day: Number(_utc.day),
    hours: Number(_utc.hours),
    minutes: Number(_utc.minutes),
    seconds: Number(_utc.seconds),
    timezone: _date.getTimezoneOffset()/60,
    jd : _jd,
    gmst: _gmst,
    mjd: _mjd,
    tjd: _tjd,
    delta_t: _delta_t,
    et: _et
  } // end of return Orb.Time
} // end of Orb.Time

}(this));


(function (global) {
  "use strict";

Orb.Position = Orb.Position || function(obj){

  return {
  // Public members.  
    //equatorial to rectangular
    equatorial_to_rectangular: function(){
      if(obj.position.equatorial){
        var ra = obj.position.equatorial.ra;
        var dec = obj.position.equatorial.dec;
        var distance = obj.position.equatorial.distance;
      }
      var value = {}
      var rad=Math.PI/180;
      obj.position.rectangular = {};
      obj.position.rectangular.x = distance*Math.cos(dec*rad)*Math.cos(ra*rad);
      obj.position.rectangular.y = distance*Math.cos(dec*rad)*Math.sin(ra*rad);
      obj.position.rectangular.z = distance*Math.sin(dec*rad);
      return obj;
    },
 
    //rectangular to geographic
    rectangular_to_geographic : function(){
      var time = obj.time;
      if(obj.position.rectangular){
        var xkm = obj.position.rectangular.x;
        var ykm = obj.position.rectangular.y;
        var zkm = obj.position.rectangular.z;
        var xdotkmps = obj.position.rectangular.xdot;
        var ydotkmps = obj.position.rectangular.ydot;
        var zdotkmps = obj.position.rectangular.zdot;
      }
      var gmst = time.gmst();
      var lst = gmst*15;

      var f = 0.00335277945 //Earth's flattening term in WGS-72 (= 1/298.26)
      var a = 6378.135  //Earth's equational radius in WGS-72 (km)

      var r = Math.sqrt(xkm*xkm+ykm*ykm);
      var lng = Math.atan2(ykm,xkm)/rad - lst;
      if(lng>360){lng = lng%360;}
      if(lng<0){lng = lng%360+360;}  
      if(lng>180){lng=lng-360}
    
      var lat = Math.atan2(zkm,r);
      var e2 = f*(2-f);
      var tmp_lat = 0

      do{
        tmp_lat = lat;
        var sin_lat= Math.sin(tmp_lat)
        var c = 1/Math.sqrt(1-e2*sin_lat*sin_lat);
        lat= Math.atan2(zkm+a*c*e2*(Math.sin(tmp_lat)),r);
      }while(Math.abs(lat-tmp_lat)>0.0001);

      var alt = r/Math.cos(lat)-a*c;
      var v = Math.sqrt(xdotkmps*xdotkmps + ydotkmps*ydotkmps + zdotkmps*zdotkmps);

      obj.position.geographic = {}
      obj.position.geographic.longitude = lng
      obj.position.geographic.latitude = lat/rad;
      obj.position.geographic.altitude = alt;
      obj.position.geographic.velocity = v;
      return obj;
    },
    equatorial_to_ecliptic  : function(){
      var rad=Math.PI/180;
      var ra = obj.position.rectangular.ra*15;
      var dec = obj.position.rectangular.dec;    
      var time = obj.time;
      var jd = time.jd();
      var time_in_day=time.hours/24+time.minutes/1440+time.seconds/86400;


      //ephemeris days from the epch J2000.0
      var t = (jd + time_in_day -2451545.0)/36525;

      //obliquity of the ecliptic
      var e = 23+26.0/60+21.448/3600 -(46.8150/3600)*t -(0.00059/3600)*t*t +(0.001813/3600)*t*t*t; 
      var lng_n = Math.sin(ra*rad)*Math.cos(e*rad)+Math.tan(dec*rad)*Math.sin(e*rad);
      var lng_b = Math.cos(ra*rad);
      var lng = Math.atan2(lng_n,lng_b)/rad;
      var sinlat = Math.sin(dec*rad)*Math.cos(e*rad) - Math.cos(dec*rad)*Math.sin(e*rad)*Math.sin(ra*rad);
      var lat= Math.asin(sinlat)/rad;

      obj.position.ecliptic = {}
      obj.position.ecliptic.latitude = lat;
      obj.position.ecliptic.longitude = lng;
      return obj;
    }
  } //end of return
} // end of Orb.Position

}(this));

(function (global) {
  "use strict";

Orb.Observation = Orb.Observation || function(observer,target){
  // Private members.
  var rad=Math.PI/180;
  var ra = Number(target.ra);
  var dec = Number(target.dec);

  var latitude = Number(observer.latitude);
  var longitude = Number(observer.longitude);
  var altitutude = Number(observer.altitutude);

  var _horizontal = function(time){
    dec = dec*rad
    var gmst = time.gmst();
    var hour_angle = (gmst*15 + longitude - (ra*15));
    var h = hour_angle*rad;
    var lat = latitude*rad;
    var azimuth = (Math.atan2(-Math.cos(dec)*Math.sin(h),Math.sin(dec)*Math.cos(lat)-Math.cos(dec)*Math.sin(lat)*Math.cos(h)))/rad;
    var elevation = (Math.asin(Math.sin(dec)*Math.sin(lat)+Math.cos(lat)*Math.cos(dec)*Math.cos(h)))/rad;
    if (azimuth<0){azimuth = azimuth%360 +360}

    return {
      azimuth : azimuth,
      elevation : elevation,
      hour_angle : hour_angle
    
    };
  }
    
  return {
  // Public members.
    // equatorial to horizontal
    horizontal: function(time){
        return _horizontal(time);
    } // end Orb.Observation.horizontal

  } // end of return
} // end of Orb.Observation

}(this));



/*
http://www.JSON.org/json2.js
2011-02-23

Public Domain.

NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

See http://www.JSON.org/js.html


This code should be minified before deployment.
See http://javascript.crockford.com/jsmin.html

USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
NOT CONTROL.


This file creates a global JSON object containing two methods: stringify
and parse.

JSON.stringify(value, replacer, space)
value any JavaScript value, usually an object or array.

replacer an optional parameter that determines how object
values are stringified for objects. It can be a
function or an array of strings.

space an optional parameter that specifies the indentation
of nested structures. If it is omitted, the text will
be packed without extra whitespace. If it is a number,
it will specify the number of spaces to indent at each
level. If it is a string (such as '\t' or '&nbsp;'),
it contains the characters used to indent at each level.

This method produces a JSON text from a JavaScript value.

When an object value is found, if the object contains a toJSON
method, its toJSON method will be called and the result will be
stringified. A toJSON method does not serialize: it returns the
value represented by the name/value pair that should be serialized,
or undefined if nothing should be serialized. The toJSON method
will be passed the key associated with the value, and this will be
bound to the value

For example, this would serialize Dates as ISO strings.

Date.prototype.toJSON = function (key) {
function f(n) {
// Format integers to have at least two digits.
return n < 10 ? '0' + n : n;
}

return this.getUTCFullYear() + '-' +
f(this.getUTCMonth() + 1) + '-' +
f(this.getUTCDate()) + 'T' +
f(this.getUTCHours()) + ':' +
f(this.getUTCMinutes()) + ':' +
f(this.getUTCSeconds()) + 'Z';
};

You can provide an optional replacer method. It will be passed the
key and value of each member, with this bound to the containing
object. The value that is returned from your method will be
serialized. If your method returns undefined, then the member will
be excluded from the serialization.

If the replacer parameter is an array of strings, then it will be
used to select the members to be serialized. It filters the results
such that only members with keys listed in the replacer array are
stringified.

Values that do not have JSON representations, such as undefined or
functions, will not be serialized. Such values in objects will be
dropped; in arrays they will be replaced with null. You can use
a replacer function to replace those with JSON values.
JSON.stringify(undefined) returns undefined.

The optional space parameter produces a stringification of the
value that is filled with line breaks and indentation to make it
easier to read.

If the space parameter is a non-empty string, then that string will
be used for indentation. If the space parameter is a number, then
the indentation will be that many spaces.

Example:

text = JSON.stringify(['e', {pluribus: 'unum'}]);
// text is '["e",{"pluribus":"unum"}]'


text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
// text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

text = JSON.stringify([new Date()], function (key, value) {
return this[key] instanceof Date ?
'Date(' + this[key] + ')' : value;
});
// text is '["Date(---current time---)"]'


JSON.parse(text, reviver)
This method parses a JSON text to produce an object or array.
It can throw a SyntaxError exception.

The optional reviver parameter is a function that can filter and
transform the results. It receives each of the keys and values,
and its return value is used instead of the original value.
If it returns what it received, then the structure is not modified.
If it returns undefined then the member is deleted.

Example:

// Parse the text. Values that look like ISO date strings will
// be converted to Date objects.

myData = JSON.parse(text, function (key, value) {
var a;
if (typeof value === 'string') {
a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
if (a) {
return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
+a[5], +a[6]));
}
}
return value;
});

myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
var d;
if (typeof value === 'string' &&
value.slice(0, 5) === 'Date(' &&
value.slice(-1) === ')') {
d = new Date(value.slice(5, -1));
if (d) {
return d;
}
}
return value;
});


This is a reference implementation. You are free to copy, modify, or
redistribute.
*/

/*jslint evil: true, strict: false, regexp: false */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
lastIndex, length, parse, prototype, push, replace, slice, stringify,
test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

var JSON;
if (!JSON) {
    JSON = {};
}

(function () {
    "use strict";

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                this.getUTCFullYear() + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate()) + 'T' +
                f(this.getUTCHours()) + ':' +
                f(this.getUTCMinutes()) + ':' +
                f(this.getUTCSeconds()) + 'Z' : null;
        };

        String.prototype.toJSON =
            Number.prototype.toJSON =
            Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = { // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i, // The loop counter.
            k, // The member key.
            v, // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' : gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@') 
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());

