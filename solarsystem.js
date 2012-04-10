// orb - solarsystem.js
//
// Orb 0.0.1 - Javascript Library for Astronomical Calcrations
//
// Copyright (c) 2010 KASHIWAI, Isana
// Dual licensed under the MIT (MIT-LICENSE.txt), 
// and GPL (GPL-LICENSE.txt) licenses.
//
// Date: 2010-06-20 00:00:00 +0900 (Sun, 20 Jun 2010) 
// Rev: 0001
//

(function (global) {
  "use strict";

Orb.SolarSystem = Orb.SolarSystem || function(){
  var vsop_dir = './vsop/'; 
  var rad=Math.PI/180;
  
  var NutationAndObliquity = function(time){
      var time_in_day=time.hours/24+time.minutes/1440+time.seconds/86400;
	    //var dt = DeltaT()/86400;
	    //var dt = 64/86400;
      var jd = time.jd() + time_in_day;// + dt;
      var t = (jd -2451545.0)/36525;
	  var omega = (125.04452 - 1934.136261*t+0.0020708*t*t + (t*t+t)/450000)*rad;
      var L0 = (280.4665 + 36000.7698*t)*rad
      var L1 = (218.3165 + 481267.8813*t)*rad
      var nutation = (-17.20/3600)*Math.sin(omega)-(-1.32/3600)*Math.sin(2*L0)-(0.23/3600)*Math.sin(2*L1)+(0.21/3600)*Math.sin(2*omega)/rad;
	  var obliquity_zero = 23+26.0/60+21.448/3600 -(46.8150/3600)*t -(0.00059/3600)*t*t +(0.001813/3600)*t*t*t; 
	  var obliquity_delta = (9.20/3600)*Math.cos(omega) + (0.57/3600)*Math.cos(2*L0) +(0.10/3600)*Math.cos(2*L1)-(0.09/3600)*Math.cos(2*omega);
      var obliquity= obliquity_zero + obliquity_delta;
	  return {
	    nutation:nutation,
		obliquity:obliquity
	  }
  
  }
  
  var PlanetPosition = function(time,d){
    var data = d.data;
    var hours=time.hours;
    var minutes=time.minutes;
    var seconds=time.seconds;
    var time_in_day=hours/24+minutes/1440+seconds/86400;
    var jd = time.jd() + time_in_day;
    var data_length = data.length;
    var t = ((jd -2451545.0)/365250);
    var v = [];
    v[0] = 0; v[1] = 0 ;v[2] = 0;
    var td = data[0].v
    for(var i=0;i<data_length; i++){
      var tmp_data = data[i].v;
      var n = tmp_data[0];
      var sum = Math.pow(t,Number(tmp_data[1]))*Number(tmp_data[2]) * Math.cos(Number(tmp_data[3]) + Number(tmp_data[4]) * t);
      v[n] = v[n]  + sum;
    }
    var longitude = v[0];
    var latitude = v[1];
    var radius = v[2];
    this.longitude = longitude;
    this.latitude = latitude;
    this.radius = radius;
    return this
  }

  var EclipticToEquatorial = function(from,to){
    var rad=Math.PI/180;
    
    var gcx = to.x - from.x; 
    var gcy = to.y - from.y;
    var gcz = to.z - from.z;

    var ecl = 23.439281;
    var eqx = gcx
    var eqy = gcy*Math.cos(ecl*rad) - gcz * Math.sin(ecl*rad)
    var eqz = gcy*Math.sin(ecl*rad) + gcz * Math.cos(ecl*rad)

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
    this.ra = ra;
    this.dec = dec;
    this.distance = distance;
    return this;
  }
  
  var ToEquatorial = function(time,planet){
    var earth = new EarthPosition(time);
    var planet_longitude= planet.longitude;
    var planet_latitude = planet.latitude;
    var planet_radius = planet.radius;
    var earth_longitude= earth.longitude;
    var earth_latitude = earth.latitude;
    var earth_radius = earth.radius;

    var rad=Math.PI/180;
    var gcx = planet_radius * Math.cos(planet_latitude)*Math.cos(planet_longitude) - earth_radius * Math.cos(earth_latitude)*Math.cos(earth_longitude); 
    var gcy = planet_radius * Math.cos(planet_latitude)*Math.sin(planet_longitude) - earth_radius * Math.cos(earth_latitude)*Math.sin(earth_longitude)
    var gcz = planet_radius * Math.sin(planet_latitude) - earth_radius * Math.sin(earth_latitude); 

    var ecl = 23.439281;
    var eqx = gcx
    var eqy = gcy*Math.cos(ecl*rad) - gcz * Math.sin(ecl*rad)
    var eqz = gcy*Math.sin(ecl*rad) + gcz * Math.cos(ecl*rad)

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
    ra : ra,
    dec : dec,
    distance : distance
    }
  }
  
  var ToEcliptic = function(planet){
    var planet_longitude= planet.longitude;
    var planet_latitude = planet.latitude;
    var planet_radius = planet.radius;
    var rad=Math.PI/180;
    return {
      x : planet_radius * Math.cos(planet_latitude)*Math.cos(planet_longitude),
      y : planet_radius * Math.cos(planet_latitude)*Math.sin(planet_longitude),
      z : planet_radius * Math.sin(planet_latitude)
    }
  }

  var PlanetLoader = function(path){
     var data_loader_option = {
       format:"json",
       path:path,
       ajax:false
     }
     var data = Orb.Tool.DataLoader(data_loader_option);
     return data;
  }
  
  var PlanetEquatorial = function(planet,earth){
     var planet = PlanetLoader(path);
     var equatorial = new ToEquatorial(earth.longitude,earth.latitude,earth.radius,planet.longitude,planet.latitude,planet.radius);
     return {
       ra : equatorial.ra,
       dec : equatorial.dec,
       distance : equatorial.distance
     }
  }

  var vsop_earth =  PlanetLoader(vsop_dir + "vsop87d_ear.json");

  var EarthPosition = function(time){
    var earth = new PlanetPosition(time,vsop_earth);
    var earth_ecliptic = new ToEcliptic(earth);
    return {
      latitude : earth.latitude,
      longitude : earth.longitude,
      radius : earth.radius,
      x : earth_ecliptic.x,
      y : earth_ecliptic.y,
      z : earth_ecliptic.z
    }
 }

  var FromKeplerian = function(orbital_elements,time){

     function deg2rad(d){
       return d*(Math.PI/180);
     }

     function rad2deg(r){
       return r*(180/Math.PI);
     }


     var eccentric_anomaly = function(orbital_elements,time){
         var mean_motion = Number(orbital_elements.mean_motion);
         var mean_anomaly = Number(orbital_elements.mean_anomaly);
         var elapsed_time = Number(time.jd())-Number(orbital_elements.epoch);
         var l=mean_motion*elapsed_time+mean_anomaly;
         if(l>360){
           l=l%360;
         }

       l = deg2rad(l)
       var eccentricity = Number(orbital_elements.eccentricity);
       var u=l;
       do{
         var ut=u;
         var delta_u=(l-u+(eccentricity*Math.sin(u)))/(1- (eccentricity*Math.cos(u)));
         u=u+delta_u;
       }while (Math.abs(ut-u)>0.00000001);
       var eccentric_anomaly = u;
       return eccentric_anomaly;  //in rad
     }

     var true_anomaly = function (orbital_elements,time){
       var u = eccentric_anomaly(orbital_elements,time);
       var eccentricity=Number(orbital_elements.eccentricity);
       var f=Math.atan2( (Math.sqrt(1-eccentricity*eccentricity)*Math.sin(u)),(Math.cos(u)-eccentricity));
       return true_anomaly; //in rad
     }

     var ecliptic_rectangular = function(orbital_elements,time){
       var a = Number(orbital_elements.semi_major_axis);
       var u = eccentric_anomaly(orbital_elements,time);
       var eccentricity=Number(orbital_elements.eccentricity);
       
       var orbital_plane_x = a*(Math.cos(u)-eccentricity);
       var orbital_plane_y = a*Math.sqrt(1-Math.pow(eccentricity,2))*Math.sin(u);
       var orbital_plane_r = a*(1-(eccentricity*Math.cos(u)));
       
       var lan = deg2rad(Number(orbital_elements.longitude_of_ascending_node));
       var ap = deg2rad(Number(orbital_elements.argument_of_periapsis));
       var inc = deg2rad(Number(orbital_elements.inclination));
       
       this.x = orbital_plane_x*(Math.cos(lan)*Math.cos(ap)-Math.sin(lan)*Math.cos(inc)*Math.sin(ap))-orbital_plane_y*(Math.cos(lan)*Math.sin(ap)+Math.sin(lan)*Math.cos(inc)*Math.cos(ap));
       this.y = orbital_plane_x*(Math.sin(lan)*Math.cos(ap)+Math.cos(lan)*Math.cos(inc)*Math.sin(ap))-orbital_plane_y*(Math.sin(lan)*Math.sin(ap)-Math.cos(lan)*Math.cos(inc)*Math.cos(ap))
       this.z = orbital_plane_x*Math.sin(inc)*Math.sin(ap)+orbital_plane_y*Math.sin(inc)*Math.cos(ap);
       this.orbital_plane_x = orbital_plane_x;
       this.orbital_plane_y = orbital_plane_y;
       this.orbital_plane_r = orbital_plane_r;
       return this;
     }
     var position = ecliptic_rectangular(orbital_elements,time);
     this.x = position.x;
     this.y = position.y;
     this.z = position.z;
     this.orbital_plane_x = position.orbital_plane_x;
     this.orbital_plane_y = position.orbital_plane_y;
     this.orbital_plane_r = position.orbital_plane_r;
     return this;
  }

  var round_angle = function(angle){
    if(angle>360){
      angle= angle%360
    }else if(angle<0){
      angle= angle%360+360
    }else{
      angle = angle;
    }
    return angle;
  }

  var SunPosition = function(time){
    var time_in_day=time.hours/24+time.minutes/1440+time.seconds/86400;
    //var dt = DeltaT()/86400;
    //var dt = 64/86400;
    var jd = time.jd() + time_in_day;// + dt;
    var t = (jd -2451545.0)/36525;
    //geometric_mean_longitude
    var mean_longitude = 280.46646 + 36000.76983*t + 0.0003032*t*t;
    //mean anomaly of the Sun
    var mean_anomaly =  357.52911+ 35999.05029*t - 0.0001537*t*t;
    //eccentricity of the Earth's orbit
    var eccentricity = 0.016708634 - 0.000042037*t - 0.0000001267*t*t;
    //Sun's equation of  the center
    var equation = (1.914602 - 0.004817*t - 0.000014*t*t)*Math.sin(mean_anomaly*rad);
    equation += (0.019993 - 0.000101*t)*Math.sin(2*mean_anomaly*rad);
    equation += 0.000289 *Math.sin(3*mean_anomaly*rad);
    //true longitude of the Sun
    var true_longitude = mean_longitude + equation;
    //true anomary of the Sun
    var true_anomary = mean_anomaly + equation;
    //radius vector, distance between center of the Sun and the Earth
    var radius = (1.000001018*(1-eccentricity*eccentricity))/(1 + eccentricity*Math.cos(true_anomary*rad));

    var nao = new NutationAndObliquity(time)
    var nutation = nao.nutation;
    var obliquity = nao.obliquity;
    var apparent_longitude = true_longitude + nutation;
    var longitude = apparent_longitude;

    //right asantion of the Sun
    var ra = Math.atan2(Math.cos(obliquity*rad)*Math.sin(longitude*rad), Math.cos(longitude*rad))
    ra = round_angle(ra/rad);
    //declination of the Sun
    var dec = Math.asin(Math.sin(obliquity*rad)*Math.sin(longitude*rad));
    dec=dec/rad;
    var distance=radius*149597870
    //rectanger
    var x = distance*Math.cos(longitude*rad);
    var y = distance*(Math.sin(longitude*rad)*Math.cos(obliquity*rad));
    var z = distance*(Math.sin(longitude*rad)*Math.sin(obliquity*rad));
    return {
    ra : ra/15,
    dec : dec,
    distance : distance,
    x : x,
    y : y,
    z : z
    }
  }
  
  var SunPosition2 = function(time){
    var earth = EarthPosition(time);
    var true_longitude = round_angle(earth.longitude/rad+180);
    var latitude = round_angle(-earth.latitude/rad);

    var nao = new NutationAndObliquity(time)
    var nutation = nao.nutation;
    var obliquity = nao.obliquity;
    var apparent_longitude = true_longitude + nutation;
    var longitude = apparent_longitude;

    var radius = earth.radius;
    var distance=radius*149597870;
    var ra = Math.atan2(Math.sin(longitude*rad)*Math.cos(obliquity*rad)-Math.tan(latitude*rad)*Math.sin(obliquity*rad),Math.cos(longitude*rad))/rad;
    ra = round_angle(ra)/15;
    var dec = Math.asin(Math.sin(latitude*rad)*Math.cos(obliquity*rad) + Math.cos(latitude*rad)*Math.sin(obliquity*rad)*Math.sin(longitude*rad))/rad;      
    var x = distance*Math.cos(longitude*rad);
    var y = distance*(Math.sin(longitude*rad)*Math.cos(obliquity*rad));
    var z = distance*(Math.sin(longitude*rad)*Math.sin(obliquity*rad));
    
    return {
      ra : ra,
      dec : dec,
      distance : distance,
      x : x,
      y : y,
      z : z
    }

  }

  var MoonPosition = function(time){
      var time_in_day=time.hours/24+time.minutes/1440+time.seconds/86400;
      var rad=Math.PI/180;
      var deg=180/Math.PI;
	    //var dt = DeltaT()/86400;
	    //var dt = 64/86400;
      var jd = time.jd() + time_in_day; // + dt;


      //ephemeris days from the epch J2000.0
      var t = (jd -2451545.0)/36525;
  	  var t2 = t*t;
  	  var t3 = t*t*t;
  	  var t4 = t*t*t*t;
      var e = 1- 0.002516*t - 0.0000074*t2;
      var L1 = (218.3164477 + 481267.88123421*t - 0.0015786*t2 + t3/538841 - t4/65194000);
      L1 = round_angle(L1)*rad;
  	  var D0 = (297.8501921 + 445267.1114034*t - 0.0018819*t2 + t3/545868 - t4/113065000);
      D0 = round_angle(D0)*rad;
      var M0 = (357.5291092 + 35999.0502909*t - 0.0001536*t2 + t3/24490000);
      M0 = round_angle(M0)*rad;
      var M1 = (134.9633964 + 477198.8675055*t + 0.0087414*t2 + t3/69699 - t4/14712000);
      M1 = round_angle(M1)*rad;
      var F0 = (93.2720950 + 483202.0175233*t - 0.0036539 *t2 - t3/3526000 + t4/863310000);
      F0 = round_angle(F0)*rad;
      var A1 = (119.75 + 131.849*t);
      A1 = round_angle(A1)*rad;
      var A2 = (53.09 + 479264.290*t);
      A2 = round_angle(A2)*rad;
      var A3 = (313.45 + 481266.484*t);
      A3 = round_angle(A3)*rad;

      var SigmaL = function(){
        var result =0;
        var terms = LunaTerms.LR;
        var terms_length = terms.length;
        for(var i = 0; i< terms_length;i++){
          var coef = terms[i][4];
          var multi = [terms[i][0],terms[i][1],terms[i][2],terms[i][3]]
          if(Math.abs(multi[1]) == 1){
            var e_coef = e;
          }else if(Math.abs(multi[1]) == 2){
            var e_coef = e*e;
          }else{
            var e_coef = 1;
          }
          var asin = multi[0]*D0 + multi[1]*M0 + multi[2]*M1 + multi[3]*F0;
          result += coef * Math.sin(asin) * e_coef;
        }
        result += 3958*Math.sin(A1)
        result += 1962*Math.sin(L1-F0)
        result += 318*Math.sin(A2)

        return result;
      }

      var SigmaR = function(){
        var result =0;
        var terms = LunaTerms.LR;
        var terms_length = terms.length;
        for(var i = 0; i< terms_length;i++){
          var coef = terms[i][5];
          var multi = [terms[i][0],terms[i][1],terms[i][2],terms[i][3]]
          if(Math.abs(multi[1]) == 1){
            var e_coef = e;
          }else if(Math.abs(multi[1]) == 2){
            var e_coef = e*e;
          }else{
            var e_coef = 1;
          }
          var acos = multi[0]*D0 + multi[1]*M0 + multi[2]*M1 + multi[3]*F0
          result += coef * Math.cos(acos) * e_coef;
        }
        return result;
      }

      var SigmaB = function(){
        var result =0;
        var terms = LunaTerms.B;
        var terms_length = terms.length;
        for(var i = 0; i< terms_length;i++){
          var coef = terms[i][4];
          var multi = [terms[i][0],terms[i][1],terms[i][2],terms[i][3]]
          if(Math.abs(multi[1]) == 1){
            var e_coef = e;
          }else if(Math.abs(multi[1]) == 2){
            var e_coef = e*e;
          }else{
            var e_coef = 1;
          }
          var asin = multi[0]*D0 + multi[1]*M0 + multi[2]*M1 + multi[3]*F0
          result += coef * Math.sin(asin) * e_coef;
        }
        result += -2235*Math.sin(L1)
        result += 382*Math.sin(A3)
        result += 175*Math.sin(A1-F0)
        result += 175*Math.sin(A1+F0)
        result += 127*Math.sin(L1-M1)
        result += -115*Math.sin(L1+M1)
        return result;
      }

      var LunaTerms = {
        LR: [
          [0,  0,  1,  0,  6288774, -20905335],
          [2,  0, -1,  0,  1274027,  -3699111],
          [2,  0,  0,  0,   658314,  -2955968],
          [0,  0,  2,  0,   213618,   -569925],
          [0,  1,  0,  0,  -185116,     48888],
          [0,  0,  0,  2,  -114332,     -3149],
          [2,  0, -2,  0,    58793,    246158],
          [2, -1, -1,  0,    57066,   -152138],
          [2,  0,  1,  0,    53322,   -170733],
          [2, -1,  0,  0,    45758,   -204586],
          [0,  1, -1,  0,   -40923,   -129620],
          [1,  0,  0,  0,   -34720,    108743],
          [0,  1,  1,  0,   -30383,    104755],
          [2,  0,  0, -2,    15327,     10321],
          [0,  0,  1,  2,   -12528,         0],
          [0,  0,  1, -2,    10980,     79661],
          [4,  0, -1,  0,    10675,    -34782],
          [0,  0,  3,  0,    10034,    -23210],
          [4,  0, -2,  0,     8548,    -21636],
          [2,  1, -1,  0,    -7888,     24208],
          [2,  1,  0,  0,    -6766,     30824],
          [1,  0, -1,  0,    -5163,     -8379],
          [1,  1,  0,  0,     4987,    -16675],
          [2, -1,  1,  0,     4036,    -12831],
          [2,  0,  2,  0,     3994,    -10445],
          [4,  0,  0,  0,     3861,    -11650],
          [2,  0, -3,  0,     3665,     14403],
          [0,  1, -2,  0,    -2689,     -7003],
          [2,  0, -1,  2,    -2602,         0],
          [2, -1, -2,  0,     2390,     10056],
          [1,  0,  1,  0,    -2348,      6322],
          [2, -2,  0,  0,     2236,     -9884],
          [0,  1,  2,  0,    -2120,      5751],
          [0,  2,  0,  0,    -2069,         0],
          [2, -2, -1,  0,     2048,     -4950],
          [2,  0,  1, -2,    -1773,      4130],
          [2,  0,  0,  2,    -1595,         0],
          [4, -1, -1,  0,     1215,     -3958],
          [0,  0,  2,  2,    -1110,         0],
          [3,  0, -1,  0,     -892,      3258],
          [2,  1,  1,  0,     -810,      2616],
          [4, -1, -2,  0,      759,     -1897],
          [0,  2, -1,  0,     -713,     -2117],
          [2,  2, -1,  0,     -700,      2354],
          [2,  1, -2,  0,      691,         0],
          [2, -1,  0, -2,      596,         0],
          [4,  0,  1,  0,      549,     -1423],
          [0,  0,  4,  0,      537,     -1117],
          [4, -1,  0,  0,      520,     -1571],
          [1,  0, -2,  0,     -487,     -1739],
          [2,  1,  0, -2,     -399,         0],
          [0,  0,  2, -2,     -381,     -4421],
          [1,  1,  1,  0,      351,         0],
          [3,  0, -2,  0,     -340,         0],
          [4,  0, -3,  0,      330,         0],
          [2, -1,  2,  0,      327,         0],
          [0,  2,  1,  0,     -323,      1165],
          [1,  1, -1,  0,      299,         0],
          [2,  0,  3,  0,      294,         0],
          [2,  0, -1, -2,        0,      8752]
        ],
        B:[
          [0,  0,  0,  1, 5128122],
          [0,  0,  1,  1,  280602],
          [0,  0,  1, -1,  277693],
          [2,  0,  0, -1,  173237],
          [2,  0, -1,  1,   55413],
          [2,  0, -1, -1,   46271],
          [2,  0,  0,  1,   32573],
          [0,  0,  2,  1,   17198],
          [2,  0,  1, -1,    9266],
          [0,  0,  2, -1,    8822],
          [2, -1,  0, -1,    8216],
          [2,  0, -2, -1,    4324],
          [2,  0,  1,  1,    4200],
          [2,  1,  0, -1,   -3359],
          [2, -1, -1,  1,    2463],
          [2, -1,  0,  1,    2211],
          [2, -1, -1, -1,    2065],
          [0,  1, -1, -1,   -1870],
          [4,  0, -1, -1,    1828],
          [0,  1,  0,  1,   -1794],
          [0,  0,  0,  3,   -1749],
          [0,  1, -1,  1,   -1565],
          [1,  0,  0,  1,   -1491],
          [0,  1,  1,  1,   -1475],
          [0,  1,  1, -1,   -1410],
          [0,  1,  0, -1,   -1344],
          [1,  0,  0, -1,   -1335],
          [0,  0,  3,  1,    1107],
          [4,  0,  0, -1,    1021],
          [4,  0, -1,  1,     833],
          [0,  0,  1, -3,     777],
          [4,  0, -2,  1,     671],
          [2,  0,  0, -3,     607],
          [2,  0,  2, -1,     596],
          [2, -1,  1, -1,     491],
          [2,  0, -2,  1,    -451],
          [0,  0,  3, -1,     439],
          [2,  0,  2,  1,     422],
          [2,  0, -3, -1,     421],
          [2,  1, -1,  1,    -366],
          [2,  1,  0,  1,    -351],
          [4,  0,  0,  1,     331],
          [2, -1,  1,  1,     315],
          [2, -2,  0, -1,     302],
          [0,  0,  1,  3,    -283],
          [2,  1,  1, -1,    -229],
          [1,  1,  0, -1,     223],
          [1,  1,  0,  1,     223],
          [0,  1, -2, -1,    -220],
          [2,  1, -1, -1,    -220],
          [1,  0,  1,  1,    -185],
          [2, -1, -2, -1,     181],
          [0,  1,  2,  1,    -177],
          [4,  0, -2, -1,     176],
          [4, -1, -1, -1,     166],
          [1,  0,  1, -1,    -164],
          [4,  0,  1, -1,     132],
          [1,  0, -1, -1,    -119],
          [4, -1,  0, -1,     115],
          [2, -2,  0,  1,     107]
        ]
      }

      var sigma_l = SigmaL();
      var sigma_r = SigmaR();
      var sigma_b = SigmaB();


      var true_longitude = (L1/rad)%360  + (sigma_l)/1000000
      var latitude = (sigma_b)/1000000
      var distance = 385000.56 + sigma_r/1000
  	  var nao = new NutationAndObliquity(time)
  	  var nutation = nao.nutation;
  	  var obliquity = nao.obliquity;
  	  var apparent_longitude = true_longitude + nutation;
      var longitude = apparent_longitude;

	  var ra = Math.atan2(Math.sin(longitude*rad)*Math.cos(obliquity*rad)-Math.tan(latitude*rad)*Math.sin(obliquity*rad),Math.cos(longitude*rad))/rad;
      ra = round_angle(ra)/15;
      var dec = Math.asin(Math.sin(latitude*rad)*Math.cos(obliquity*rad) + Math.cos(latitude*rad)*Math.sin(obliquity*rad)*Math.sin(longitude*rad))/rad;

      //rectanger
      var x = distance*Math.cos(latitude*rad)*Math.cos(longitude*rad);
      var y = distance*Math.cos(latitude*rad)*Math.sin(longitude*rad);
      var z = distance*Math.sin(latitude*rad);

      var p = {
        x:x,
        y:y,
        z:z
      }

      // equatiorial horizontal parallax
      var parallax = Math.asin(6378.14/distance)/rad

      return {
        time : time,
        position: {
          equatorial: {
            ra:ra,
            dec:dec,
            distance:distance,
            parallax:parallax
          },
          ecliptic: {
            center:"Earth",
            x:p.x,
            y:p.y,
            z:p.z
          }
        },        
        phase : function(){
          var now = time.date;
          var time_in_day=time.hours/24+time.minutes/1440+time.seconds/86400;
          var jd = time.jd() + time_in_day;
          var date_first = new Date(time.year, 0, 1, 0, 0, 0);
          var date_last = new Date(time.year, 11, 31, 11, 59, 59, 999);
          var since_new_year = (now - date_first)/(date_last-date_first);
          var y = time.year+since_new_year;

          var k = Math.floor((y-2000) * 12.3685);
          var t = k/1236.85;
          var t2 = t*t;
          var t3 = t*t*t;
          var t4 = t*t*t*t;
          var jde0 = 2451550.09766 + 29.530588861*k + 0.00015437*t2 - 0.000000150*t3 + 0.00000000073*t4;

          var e = 1-0.002516*t - 0.0000074*t2;
          e = round_angle(e);
          //Sun's mean anomary at the time;
          var m0 = 2.5534 + 29.10535670*k - 0.0000014*t2 - 0.00000011*t3;
          m0 = round_angle(m0);
          //Moon's mean anomary at the time;
          var m1 = 201.5643 + 385.81693528*k + 0.0107582*t2 + 0.00001238*t3 - 0.000000011*t4; 
          m1 = round_angle(m1);
          //Moon's argument of latitude
          var f = 160.7108 + 390.67050284*k - 0.0016118*t2-0.00000227*t3 + 0.000000011*t4;
          f = round_angle(f);
          //Longitude of the ascending node of lunar orbit
          var omega = 124.7746 -  1.56375588*k + 0.0020672*t2 + 0.00000215*t3;
          omega = round_angle(omega);

          var c1 = 0;
          c1 = c1 - 0.40720 * Math.sin(m1*rad);
          c1 = c1 + 0.17241 * e * Math.sin(m0*rad);
          c1 = c1 + 0.01608 * Math.sin(2*m1*rad);
          c1 = c1 + 0.01039 * Math.sin(2*f*rad);
          c1 = c1 + 0.00739 * e * Math.sin((m1-m0)*rad);
          c1 = c1 - 0.00514 * e * Math.sin((m1+m0)*rad);
          c1 = c1 + 0.00208 * e * e * Math.sin(2*m0*rad); 
          c1 = c1 - 0.00111 * Math.sin((m1-2*f)*rad)
          c1 = c1 - 0.00057 * Math.sin((m1+2*f)*rad)
          c1 = c1 + 0.00056 * e * Math.sin((2*m1+m0)*rad);
          c1 = c1 - 0.00042 * Math.sin(3*m1*rad);
          c1 = c1 + 0.00042 * e * Math.sin((m0+2*f)*rad)
          c1 = c1 + 0.00038 * e * Math.sin((m0-2*f)*rad)
          c1 = c1 - 0.00024 * e * Math.sin((2*m1-m0)*rad);
          c1 = c1 - 0.00017 * Math.sin(omega*rad);
          c1 = c1 - 0.00007 * Math.sin((m1+2*m0)*rad);
          c1 = c1 + 0.00004 * Math.sin((2*m1-2*f)*rad);
          c1 = c1 + 0.00004 * Math.sin(3*m0 *rad);
          c1 = c1 + 0.00003 * Math.sin((m1+m0-2*f)*rad);
          c1 = c1 + 0.00003 * Math.sin((2*m1+2*f)*rad);
          c1 = c1 - 0.00003 * Math.sin((m1+m0+2*f)*rad);
          c1 = c1 + 0.00003 * Math.sin((m1-m0+2*f)*rad);
          c1 = c1 - 0.00002 * Math.sin((m1-m0-2*f)*rad);
          c1 = c1 - 0.00002 * Math.sin((3*m1+m0)*rad);
          c1 = c1 + 0.00002 * Math.sin(4*m1*rad);

          var a1 = 299.77 + 0.107408*k-0.009173*t2;
          var a2 = 251.88 + 0.016321*k;
          var a3 = 251.83 + 26.651886*k;
          var a4 = 349.42 + 36.412478 *k; 
          var a5 =  84.66 + 18.206239*k;
          var a6 =  141.74+53.303771*k;
          var a7 =  207.14+2.453732*k;
          var a8 =  154.84+7.306860*k;
          var a9 =  34.52+27.261239*k;
          var a10 =  207.19+0.121824*k;
          var a11 =  291.34+1.844379*k;
          var a12 =  161.72+24.198154*k;
          var a13 =  239.56+25.513099*k;
          var a14 =  331.55+3.592518*k;

          var c2 = 0;
          c2 = c2 + 0.000325 *Math.sin(a1*rad);
          c2 = c2 + 0.000165 *Math.sin(a2*rad);
          c2 = c2 + 0.000164 *Math.sin(a3*rad);
          c2 = c2 + 0.000126 *Math.sin(a4*rad);
          c2 = c2 + 0.000110 *Math.sin(a5*rad);
          c2 = c2 + 0.000062 *Math.sin(a6*rad);
          c2 = c2 + 0.000060 *Math.sin(a7*rad);
          c2 = c2 + 0.000056 *Math.sin(a8*rad);
          c2 = c2 + 0.000047 *Math.sin(a9*rad);
          c2 = c2 + 0.000042 *Math.sin(a10*rad);
          c2 = c2 + 0.000040 *Math.sin(a11*rad);
          c2 = c2 + 0.000037 *Math.sin(a12*rad);
          c2 = c2 + 0.000035 *Math.sin(a13*rad);
          c2 = c2 + 0.000023 *Math.sin(a14*rad);
          var jde = jde0 + c1 + c2;
          var phase_of_the_moon = jd - jde;
          return phase_of_the_moon;
        }
      } //end  return;
  }


  return {
    Sun:function(){
      return {
        position:{
          equatorial:function(time){
            var sun = SunPosition(time);
            return {
              ra : sun.ra,
              dec : sun.dec,
              distance : sun.distance,
              x : sun.x,
              y : sun.y,
              z : sun.z
            }
          }
        },
        "radius":"6.955E+5",
        "mass":"1.9891E+30"
      }
    },
    Sun2:function(){
      return {
        position:{
          equatorial:function(time){
            var sun = SunPosition2(time);
            return {
              ra : sun.ra,
              dec : sun.dec,
              distance : sun.distance,
              x : sun.x,
              y : sun.y,
              z : sun.z
            }
          }
        },
        "radius":"6.955E+5",
        "mass":"1.9891E+30"
      }
    },
    Mercury:function(){
      var data = PlanetLoader(vsop_dir + "vsop87d_mer.json");
      return {
        position:{
          ecliptic:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEcliptic(planet);
          },
          equatorial:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEquatorial(time,planet);          
          }
        },
        "orbital_period":"87.969", 
        "radius":"2439.7",
        "mass":"3.3022E+23"
      }
    },

    Venus:function(){
      var data = PlanetLoader(vsop_dir + "vsop87d_ven.json");
      return {
        position:{
          ecliptic:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEcliptic(planet);
          },
          equatorial:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEquatorial(time,planet);          
          }
        },
      "orbital_period":"224.70069",  
      "radius":"6051.8",
      "mass":"4.8685E+24"
      }
    },

    Earth:function(){
      var data = PlanetLoader(vsop_dir + "vsop87d_ear.json");
      return {
        position:{
          ecliptic:function(time){
            var planet = new PlanetPosition(time,data);
            return  ToEcliptic(planet);
          }
        },
       "orbital_period":"365.256363004",  
       "radius":"6,371.0",
       "mass":"5.9736E+24"
      }
    },
    Mars:function(){
      var data = PlanetLoader(vsop_dir + "vsop87d_mar.json");
      return {
        position:{
          ecliptic:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEcliptic(planet);
          },
          equatorial:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEquatorial(time,planet);          
          }
        },
        "orbital_period":"686.971",  
        "radius":"3,396.2",
        "mass":"6.4185E+23"
      }
    },

    Jupiter:function(){
      var data = PlanetLoader(vsop_dir + "vsop87d_jup.json");
      return {
        position:{
          ecliptic:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEcliptic(planet);
          },
          equatorial:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEquatorial(time,planet);          
          }
        },
      "orbital_period":"4331.572",  
      "radius":"71492",
      "mass":"1.8986E+27"
      }
    },

    Saturn:function(){
      var data = PlanetLoader(vsop_dir + "vsop87d_sat.json");
      return {
        position:{
          ecliptic:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEcliptic(planet);
          },
          equatorial:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEquatorial(time,planet);          
          }
        },
      "orbital_period":"10759.22",  
      "radius":"60268",
      "mass":"5.6846E+26"
      }
    },

    Uranus:function(){
      var data = PlanetLoader(vsop_dir + "vsop87d_ura.json");
      return {
        position:{
          ecliptic:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEcliptic(planet);
          },
          equatorial:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEquatorial(time,planet);          
          }
        },
      "orbital_period":"30799.095",  
      "radius":"25559",
      "mass":"8.6810E+25"
      }
    },

    Neptune:function(){
      var data = PlanetLoader(vsop_dir + "vsop87d_nep.json");
      return {
        position:{
          ecliptic:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEcliptic(planet);
          },
          equatorial:function(time){
            var planet = new PlanetPosition(time,data);
            return ToEquatorial(time,planet);          
          }
        },
      "orbital_period":"60190",  
      "radius":"24764",
      "mass":"1.0243E+26"
      }
    },

    FromOrbitalElements:function(object){
      var orbital_elements = object.position.orbital_elements;
      return {
        position:{
          ecliptic:function(time){
            var p = FromKeplerian(orbital_elements,time);
            return {
              center: object.center,
              x: p.x,
              y: p.y,
              z: p.z
            }
          },
          orbital_plane:function(time){
            var p = FromKeplerian(orbital_elements,time);
            return {
              x: p.orbital_plane_x,
              y: p.orbital_plane_y,
              r: p.orbital_plane_r
            }
          },
          equatorial:function(time){
            var from = FromKeplerian(orbital_elements,time);
            var to = new EarthPosition(time);
            var equatorial = EclipticToEquatorial(from,to)
            return {
              ra : equatorial.ra,
              dec : equatorial.dec,
              distance : equatorial.distance
            }
          }
        }
      }
    },

    Moon :function(){
      return {
        position:{
          ecliptic:function(time){
            var moon = new MoonPosition(time);
            return {
              x: moon.position.ecliptic.x,
              y: moon.position.ecliptic.y,
              z: moon.position.ecliptic.z
            }
          },
          equatorial:function(time){
            var moon = new MoonPosition(time);
            return {
              ra :moon.position.equatorial.ra,
              dec: moon.position.equatorial.dec,
              distance: moon.position.equatorial.distance
            }
          }
        },
        phase:function(time){
          var moon = new MoonPosition(time);
          return moon.phase();
        }
      }
    } //end Moon
  }//end retrun
}

}(this))
