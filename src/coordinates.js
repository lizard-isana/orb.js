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
