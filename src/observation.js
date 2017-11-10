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
