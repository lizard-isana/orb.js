//luna.js
Orb.Luna = Orb.Luna ||  function(){}

Orb.Luna.prototype.latlng = function latlng(date){
  var time = new Orb.Time(date)
  var rad = Orb.Constant.RAD
  var deg=180/Math.PI;
  //var dt = DeltaT()/86400;
  //var dt = 64/86400;
  var jd = time.jd(); // + dt;

  //ephemeris days from the epch J2000.0
  var t = (jd -2451545.0)/36525;
  var t2 = t*t;
  var t3 = t*t*t;
  var t4 = t*t*t*t;
  var e = 1- 0.002516*t - 0.0000074*t2;
  var L1 = (218.3164477 + 481267.88123421*t - 0.0015786*t2 + t3/538841 - t4/65194000);
  L1 = Orb.RoundAngle(L1)*rad;
  var D0 = (297.8501921 + 445267.1114034*t - 0.0018819*t2 + t3/545868 - t4/113065000);
  D0 = Orb.RoundAngle(D0)*rad;
  var M0 = (357.5291092 + 35999.0502909*t - 0.0001536*t2 + t3/24490000);
  M0 = Orb.RoundAngle(M0)*rad;
  var M1 = (134.9633964 + 477198.8675055*t + 0.0087414*t2 + t3/69699 - t4/14712000);
  M1 = Orb.RoundAngle(M1)*rad;
  var F0 = (93.2720950 + 483202.0175233*t - 0.0036539 *t2 - t3/3526000 + t4/863310000);
  F0 = Orb.RoundAngle(F0)*rad;
  var A1 = (119.75 + 131.849*t);
  A1 = Orb.RoundAngle(A1)*rad;
  var A2 = (53.09 + 479264.290*t);
  A2 = Orb.RoundAngle(A2)*rad;
  var A3 = (313.45 + 481266.484*t);
  A3 = Orb.RoundAngle(A3)*rad;


var SigmaL = function(){
  var result =0;
  var terms = Orb.Terms.Luna.LR;
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
  var terms = Orb.Terms.Luna.LR;
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
  var terms = Orb.Terms.Luna.B;
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


  var sigma_l = SigmaL();
  var sigma_r = SigmaR();
  var sigma_b = SigmaB();
  var true_longitude = (L1/rad)%360  + (sigma_l)/1000000
  var latitude = (sigma_b)/1000000
  var distance = 385000.56 + sigma_r/1000
  var nao = new Orb.NutationAndObliquity(date)
  var nutation = nao.nutation();
  var obliquity = nao.obliquity();
  var apparent_longitude = true_longitude + nutation;
  var longitude = apparent_longitude;
  return {
    latitude:latitude,
    longitude:longitude,
    distance:distance,
    obliquity:obliquity,
    "date":date,
    "coordinate_keywords":"ecliptic spherical",
    "unit_keywords":"degree km"
  }
}

Orb.Luna.prototype.radec = function radec(date){
  var latlng = this.latlng(date);
  var rad = Orb.Constant.RAD
  var latitude = latlng.latitude
  var longitude = latlng.longitude
  var distance = latlng.distance
  var obliquity = latlng.obliquity
  var ra = Math.atan2(Math.sin(longitude*rad)*Math.cos(obliquity*rad)-Math.tan(latitude*rad)*Math.sin(obliquity*rad),Math.cos(longitude*rad))/rad;
  ra = Orb.RoundAngle(ra)/15;
  var dec = Math.asin(Math.sin(latitude*rad)*Math.cos(obliquity*rad) + Math.cos(latitude*rad)*Math.sin(obliquity*rad)*Math.sin(longitude*rad))/rad;
  return {
    ra:ra,
    dec:dec,
    distance:distance,
    obliquity:obliquity,
    "date":date,
    "coordinate_keywords":"equatoria spherical",
    "unit_keywords":"degree hour km"
  }
}

Orb.Luna.prototype.xyz = function xyz(date){
  var latlng = this.latlng(date);
  var rad = Orb.Constant.RAD
  var latitude = latlng.latitude
  var longitude = latlng.longitude
  var distance = latlng.distance
  var x = distance*Math.cos(latitude*rad)*Math.cos(longitude*rad);
  var y = distance*Math.cos(latitude*rad)*Math.sin(longitude*rad);
  var z = distance*Math.sin(latitude*rad);
  return  {
    x:x,
    y:y,
    z:z,
    "date":date,
    "coordinate_keywords":"equatorial rectangular",
    "unit_keywords":"km"
  }
}

Orb.Luna.prototype.parallax = function parallax(date){
  var latlng = this.latlng(date);
  var rad = Orb.Constant.RAD
  return Math.asin(6378.14/latlng.distance)/rad
}

Orb.Luna.prototype.phase = function phase(date){
  var rad = Orb.Constant.RAD
  var time = new Orb.Time(date)
  var now = date;
  var jd = time.jd();
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
  e = Orb.RoundAngle(e);
  //Sun's mean anomary at the time;
  var m0 = 2.5534 + 29.10535670*k - 0.0000014*t2 - 0.00000011*t3;
  m0 = Orb.RoundAngle(m0);
  //Moon's mean anomary at the time;
  var m1 = 201.5643 + 385.81693528*k + 0.0107582*t2 + 0.00001238*t3 - 0.000000011*t4;
  m1 = Orb.RoundAngle(m1);
  //Moon's argument of latitude
  var f = 160.7108 + 390.67050284*k - 0.0016118*t2-0.00000227*t3 + 0.000000011*t4;
  f = Orb.RoundAngle(f);
  //Longitude of the ascending node of lunar orbit
  var omega = 124.7746 -  1.56375588*k + 0.0020672*t2 + 0.00000215*t3;
  omega = Orb.RoundAngle(omega);
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

Orb.Moon = Orb.Moon || Orb.Luna;

Orb.Terms = Orb.Terms || {}
Orb.Terms.Luna = {
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
