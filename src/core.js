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
