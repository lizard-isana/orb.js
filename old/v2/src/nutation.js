Orb.NutationAndObliquity = Orb.NutationAndObliquity || function (date) {
  var rad = Orb.Constant.RAD
  //var dt = DeltaT()/86400;
  //var dt = 64/86400;
  var time = new Orb.Time(date)
  var jd = time.jd();// + dt;
  var dt = time.delta_t();
  //jd = jd + (dt / 86400);
  var t = (jd - 2451545.0) / 36525;
  var omega = 125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t / 450000);
  var L0 = 280.4665 + 36000.7698 * t;
  var L1 = 218.3165 + 481267.8813 * t;
  var nutation = (-17.20 / 3600) * Math.sin(omega * rad) - (-1.32 / 3600) * Math.sin(2 * L0 * rad) - (0.23 / 3600) * Math.sin(2 * L1 * rad) + (0.21 / 3600) * Math.sin(2 * omega * rad);
  var mean_obliquity = 23 + 26.0 / 60 + 21.448 / 3600 - (46.8150 / 3600) * t - (0.00059 / 3600) * t * t + (0.001813 / 3600) * t * t * t;
  var obliquity_delta = (9.20 / 3600) * Math.cos(omega * rad) + (0.57 / 3600) * Math.cos(2 * L0 * rad) + (0.10 / 3600) * Math.cos(2 * L1 * rad) - (0.09 / 3600) * Math.cos(2 * omega * rad);
  var obliquity = mean_obliquity + obliquity_delta;
  return {
    nutation: nutation,
    obliquity: obliquity,
    mean_obliquity: mean_obliquity,
    obliquity_delta: obliquity_delta
  }
}

Orb.Obliquity = Orb.Obliquity || function (date) {
  var no = new Orb.NutationAndObliquity(date)
  return no.obliquity;
}

Orb.Nutation = Orb.Nutation || function (date) {
  var no = new Orb.NutationAndObliquity(date)
  return no.nutation()
}