//sun.js
Orb.Sun = Orb.Sun || function(){}

Orb.Sun.prototype = {

  EclipticLongitude: function(date){
    var rad = Orb.Const.RAD;
    var time = new Orb.Time(date)
    //var dt = DeltaT()/86400;
    //var dt = 64/86400;
    var jd = time.jd();// + dt;
    var t = (jd -2451545.0)/36525;
    var mean_longitude = 280.46646 + 36000.76983*t + 0.0003032*t*t;
    var mean_anomaly =  357.52911+ 35999.05029*t - 0.0001537*t*t;
    var eccentricity = 0.016708634 - 0.000042037*t - 0.0000001267*t*t;
    var equation = (1.914602 - 0.004817*t - 0.000014*t*t)*Math.sin(mean_anomaly*rad);
    equation += (0.019993 - 0.000101*t)*Math.sin(2*mean_anomaly*rad);
    equation += 0.000289 *Math.sin(3*mean_anomaly*rad);
    var true_longitude = mean_longitude + equation;
    var true_anomary = mean_anomaly + equation;
    var radius = (1.000001018*(1-eccentricity*eccentricity))/(1 + eccentricity*Math.cos(true_anomary*rad));
    var nao = new Orb.NutationAndObliquity(date)
    var nutation = nao.nutation();
    var obliquity = nao.obliquity();
    var apparent_longitude = true_longitude + nutation;
    var longitude = apparent_longitude;
    var distance=radius*149597870.691;
    return {
      longitude:longitude,
      distance:distance,
      obliquity:obliquity
    }
  },

  SphericalToRectangler: function(spherical){
    var rad = Orb.Const.RAD;
    var longitude = spherical.longitude;
    var distance = spherical.distance;
    var obliquity = spherical.obliquity;
    var x = distance*Math.cos(longitude*rad);
    var y = distance*(Math.sin(longitude*rad)*Math.cos(obliquity*rad));
    var z = distance*(Math.sin(longitude*rad)*Math.sin(obliquity*rad));
    return {
      x : x,
      y : y,
      z : z
    }
  },

  EclipticToEquatorial: function(ecliptic){
    var rad = Orb.Const.RAD;
    var longitude = ecliptic.longitude
    var distance = ecliptic.distance
    var obliquity = ecliptic.obliquity
    var ra = Math.atan2(Math.cos(obliquity*rad)*Math.sin(longitude*rad), Math.cos(longitude*rad))
    ra = Orb.RoundAngle(ra/rad);
    ra=ra/15
    var dec = Math.asin(Math.sin(obliquity*rad)*Math.sin(longitude*rad));
    dec=dec/rad;
    return {
      ra:ra,
      dec:dec,
      distance:distance
    }
  },

  radec: function(date){
    var ecliptic = this.EclipticLongitude(date)
    var radec = this.EclipticToEquatorial(ecliptic)
    return{
      "ra":radec.ra,
      "dec":radec.dec,
      "distance":radec.distance,
      "date":date,
      "coordinate_keywords":"equatorial spherical",
      "unit_keywords":"degree hour au"
    }
  },

  xyz: function(date){
    var spherical = this.EclipticLongitude(date)
    var xyz = this.SphericalToRectangler(spherical)
    return{
      x:xyz.x,
      y:xyz.y,
      z:xyz.z,
      "date":date,
      "coordinate_keywords":"equatorial rectangular",
      "unit_keywords":"au"
    }
  }
}
