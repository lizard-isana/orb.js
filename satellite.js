// orb - satellite.js
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

Orb.Satellite = Orb.Satellite || function(tle){

  var _decodeTLE = function(tle){
    var name = tle.name;
    var line1 = tle.first_line;
    var line2 = tle.second_line;
    var epy = Number(line1.slice(18,20));

    //epoch_year should be smaller than 2057.
    if(epy<57){var epoch_year=epy+2000}else{var epoch_year=epy+1900};
    var bstar_mantissa = Number(line1.substring(53,59))*1e-5;
    var bstar_exponent = Number("1e" + Number(line1.substring(59,61)));
    var bstar = bstar_mantissa*bstar_exponent

    var orbital_elements={
      name: name,
      line_number_1 :   Number(line1.slice(0,0)),
      catalog_no_1 :  Number(line1.slice(2,6)),
      security_classification :  Number(line1.slice(7,7)),
      international_identification : Number(line1.slice(9,17)),
      epoch_year : epoch_year,
      epoch : Number(line1.substring(20,32)),
      first_derivative_mean_motion : Number(line1.substring(33,43)),
      second_derivative_mean_motion : Number(line1.substring(44,52)),
      bstar_mantissa: bstar_mantissa,
      bstar_exponent :bstar_exponent,
      bstar :bstar,
      ephemeris_type :  Number(line1.substring(62,63)),
      element_number :  Number(line1.substring(64,68)),
      check_sum_1 :   Number(line1.substring(69,69)),
      line_number_2 :   Number(line2.slice(0,0)),
      catalog_no_2 :  Number(line2.slice(2,7)),
      inclination : Number(line2.substring(8,16)),
      right_ascension : Number(line2.substring(17,25)),
      eccentricity : Number(line2.substring(26,33)),
      argument_of_perigee : Number(line2.substring(34,42)),
      mean_anomaly : Number(line2.substring(43,51)),
      mean_motion : Number(line2.substring(52,63)),
      rev_number_at_epoch : Number(line2.substring(64,68)),
      check_sum_2 :   Number(line1.substring(68,69))
    }
    return orbital_elements
  }
  

  var _setSGP4 = function(orbital_elements){
    var torad = Math.PI/180;
    var ck2 = 5.413080e-4;
    var ck4 = 0.62098875e-6;
    var e6a = 1.0e-6;
    var qoms2t = 1.88027916e-9;
    var s = 1.01222928; // 1.0+78.0/xkmper
    var tothrd = 0.66666667;
    var xj3 = -0.253881e-5;
    var xke = 0.743669161e-1;
    var xkmper = 6378.135;
    var xmnpda = 1440.0; // min_par_day
    var ae = 1.0;
    var pi = 3.14159265;
    var pio2 = 1.57079633;
    var twopi = 6.2831853;
    var x3pio2 = 4.71238898;

    var epoch = orbital_elements.epoch;
    var epoch_year = orbital_elements.epoch_year;
    var bstar = orbital_elements.bstar;
    var xincl = orbital_elements["inclination"]*torad;
    var xnodeo = orbital_elements["right_ascension"]*torad;
    var eo = orbital_elements["eccentricity"]*1e-7;
    var omegao  = orbital_elements["argument_of_perigee"]*torad;
    var xmo = orbital_elements["mean_anomaly"]*torad;
    var xno  = orbital_elements["mean_motion"]*2.0*Math.PI/1440.0;
    var a1 = Math.pow(xke/xno,tothrd);
    var cosio=Math.cos(xincl);
    var theta2=cosio*cosio;
    var x3thm1=3*theta2-1.0;
    var eosq=eo*eo;
    var betao2=1-eosq;
    var betao=Math.sqrt(betao2);
    var del1=1.5*ck2*x3thm1/(a1*a1*betao*betao2);
    var ao=a1*(1-del1*((1.0/3.0)+del1*(1.0+(134.0/81.0)*del1)));
    var delo=1.5*ck2*x3thm1/(ao*ao*betao*betao2);
    var xnodp=xno/(1.0+delo); //original_mean_motion
    var aodp=ao/(1.0-delo); //semi_major_axis

    var orbital_period= 1440.0/Number(orbital_elements["mean_motion"]);

    var isimp=0;
    if ((aodp*(1.0-eo)/ae) < (220.0/xkmper+ae)){
      isimp=1;
    }

    var s4=s;
    var qoms24=qoms2t;
    var perige=(aodp*(1.0-eo)-ae)*xkmper;
    var apoge=(aodp*(1.0+eo)-ae)*xkmper;
    if (perige < 156.0){
      s4 = perige-78.0;
      if (perige <= 98.0){
        s4 = 20.0;
      }else{
        var qoms24=Math.pow(((120.0-s4)*ae/xkmper),4);
        s4 = s4/xkmper+ae;
      }
    }
    var pinvsq=1.0/(aodp*aodp*betao2*betao2);
    var tsi=1.0/(aodp-s4);
    var eta=aodp*eo*tsi;
    var etasq=eta*eta;
    var eeta=eo*eta;
    var psisq=Math.abs(1.0-etasq);
    var coef=qoms24*Math.pow(tsi,4);
    var coef1=coef/Math.pow(psisq,3.5);
    
    var c2=coef1*xnodp*(aodp*(1.0+1.5*etasq+eeta*(4.0+etasq))+0.75*ck2*tsi/psisq*x3thm1*(8.0+3.0*etasq*(8.0+etasq)));
    var c1=bstar*c2;
    var sinio=Math.sin(xincl);
    var a3ovk2=-xj3/ck2*Math.pow(ae,3);
    var c3=coef*tsi*a3ovk2*xnodp*ae*sinio/eo;
    var x1mth2=1.0-theta2;
    var c4=2.0*xnodp*coef1*aodp*betao2*(eta*(2.0+0.5*etasq)+eo*(0.5+2.0*etasq)-2.0*ck2*tsi/(aodp*psisq)*(-3.0*x3thm1*(1.0-2.0*eeta+etasq*(1.5-0.5*eeta))+0.75*x1mth2*(2.0*etasq-eeta*(1.0+etasq))*Math.cos((2.0*omegao))));
    var c5=2.0*coef1*aodp*betao2*(1.0+2.75*(etasq+eeta)+eeta*etasq);

    var theta4=theta2*theta2;
    var temp1=3.0*ck2*pinvsq*xnodp;
    var temp2=temp1*ck2*pinvsq;
    var temp3=1.25*ck4*pinvsq*pinvsq*xnodp;
    var xmdot=xnodp+0.5*temp1*betao*x3thm1+0.0625*temp2*betao*(13.0-78.0*theta2+137.0*theta4);

    var x1m5th=1.0-5.0*theta2;
    var omgdot=-0.5*temp1*x1m5th+0.0625*temp2*(7.0-114.0*theta2+395.0*theta4)+temp3*(3.0-36.0*theta2+49.0*theta4);
    var xhdot1=-temp1*cosio;
    var xnodot=xhdot1+(0.5*temp2*(4.0-19.0*theta2)+2.0*temp3*(3.0-7.0*theta2))*cosio;
    var omgcof=bstar*c3*Math.cos(omegao);
    var xmcof=-tothrd*coef*bstar*ae/eeta;
    var xnodcf=3.5*betao2*xhdot1*c1;
    var t2cof=1.5*c1;
    var xlcof=0.125*a3ovk2*sinio*(3.0+5.0*cosio)/(1.0+cosio);
    var aycof=0.25*a3ovk2*sinio;
    var delmo=Math.pow((1.0+eta*Math.cos(xmo)),3);
    var sinmo=Math.sin(xmo);
    var x7thm1=7.0*theta2-1.0;

    if (isimp != 1){
      var c1sq=c1*c1;
      var d2=4.0*aodp*tsi*c1sq;
      var temp=d2*tsi*c1/3.0;
      var d3=(17.0*aodp+s4)*temp;
      var d4=0.5*temp*aodp*tsi*(221.0*aodp+31.0*s4)*c1;
      var t3cof=d2+2.0*c1sq;
      var t4cof=0.25*(3.0*d3+c1*(12.0*d2+10.0*c1sq));
      var t5cof=0.2*(3.0*d4+12.0*c1*d3+6.0*d2*d2+15.0*c1sq*(2.0*d2+c1sq));
    }  

  //set accesser
    return {
      orbital_elements: orbital_elements,
      apoge: apoge,
      perige: perige,
      orbital_period: orbital_period,
      epoch_year: epoch_year,
      epoch: epoch,
      xmo: xmo,
      xmdot: xmdot,
      omegao: omegao,
      omgdot: omgdot,
      xnodeo: xnodeo,
      xnodot: xnodot,
      xnodcf: xnodcf,
      bstar: bstar,
      t2cof: t2cof,
      omgcof: omgcof,
      isimp: isimp,
      xmcof: xmcof,
      eta: eta,
      delmo: delmo,
      c1: c1,
      c4: c4,
      c5: c5,
      d2: d2,
      d3: d3,
      d4: d4,
      sinmo: sinmo,
      t3cof: t3cof,
      t4cof: t4cof,
      t5cof: t5cof,
      aodp: aodp,
      eo: eo,
      xnodp: xnodp,
      xke: xke,
      xlcof: xlcof,
      aycof: aycof,
      x3thm1: x3thm1,
      x1mth2: x1mth2,
      xincl: xincl,
      cosio: cosio,
      sinio: sinio,
      e6a: e6a,
      ck2: ck2,
      x7thm1: x7thm1,
      xkmper: xkmper
    }
  }

  var _execSGP4 = function(time,sgp4){
    var rad = Math.PI/180;
    var orbital_elements = sgp4.orbital_elements;
    var tsince = (function(time,orbital_elements){
      var epoch_year = orbital_elements.epoch_year;
      var epoch = orbital_elements.epoch;
      var year2 = epoch_year-1;
      var now_sec=Date.UTC(time.year, time.month-1, time.day, time.hours, time.minutes, time.seconds);
      var epoch_sec=Date.UTC(year2, 11, 31, 0, 0, 0)+(epoch*24*60*60*1000);
      var elapsed_time=(now_sec-epoch_sec)/(60*1000);
      return elapsed_time;
    })(time,orbital_elements)
    
   
    var xmo=sgp4.xmo;
    var xmdot=sgp4.xmdot;
    var omegao=sgp4.omegao;
    var omgdot=sgp4.omgdot;
    var xnodeo=sgp4.xnodeo;
    var xnodot=sgp4.xnodot;
    var xnodcf = sgp4.xnodcf
    var bstar=sgp4.bstar;
    var t2cof=sgp4.t2cof;
    var omgcof=sgp4.omgcof;
    var isimp=sgp4.isimp;
    var xmcof=sgp4.xmcof;
    var eta=sgp4.eta;
    var delmo=sgp4.delmo;
    var c1=sgp4.c1;
    var c4=sgp4.c4;
    var c5=sgp4.c5;
    var d2=sgp4.d2;
    var d3=sgp4.d3;
    var d4=sgp4.d4;
    var sinmo=sgp4.sinmo;
    var t3cof=sgp4.t3cof;
    var t4cof=sgp4.t4cof;
    var t5cof=sgp4.t5cof;
    var aodp=sgp4.aodp;
    var eo=sgp4.eo;
    var xnodp=sgp4.xnodp;
    var xke=sgp4.xke;
    var xlcof=sgp4.xlcof;
    var aycof=sgp4.aycof;
    var x3thm1=sgp4.x3thm1;
    var x1mth2=sgp4.x1mth2;
    var xincl=sgp4.xincl;
    var cosio=sgp4.cosio;
    var sinio=sgp4.sinio;
    var e6a=sgp4.e6a;
    var ck2=sgp4.ck2;
    var x7thm1=sgp4.x7thm1;
    var xkmper = sgp4.xkmper;
    var epoch_year=sgp4.epoch_year;
    var epoch=sgp4.epoch;

    var xmdf=xmo+xmdot*tsince;
    var omgadf=omegao+omgdot*tsince;
    var xnoddf=xnodeo+xnodot*tsince;
    var omega=omgadf;
    var xmp=xmdf;
    var tsq=tsince*tsince;
    var xnode=xnoddf+xnodcf*tsq;
    var tempa=1.0-c1*tsince;
    var tempe=bstar*c4*tsince;
    var templ=t2cof*tsq;

    if (isimp != 1){
      var delomg=omgcof*tsince;
      var delm=xmcof*(Math.pow((1.0+eta*Math.cos(xmdf)),3)-delmo);
      var temp=delomg+delm;
      var xmp=xmdf+temp;
      var omega=omgadf-temp;
      var tcube=tsq*tsince;
      var tfour=tsince*tcube;
      var tempa=tempa-d2*tsq-d3*tcube-d4*tfour;
      var tempe=tempe+bstar*c5*(Math.sin(xmp)-sinmo);
      var templ=templ+t3cof*tcube+tfour*(t4cof+tsince*t5cof);
    }
    var a=aodp*tempa*tempa;
    var e=eo-tempe;
    var xl=xmp+omega+xnode+xnodp*templ;
    var beta=Math.sqrt(1.0-e*e);
    var xn=xke/Math.pow(a,1.5);

    // long period periodics
    var axn=e*Math.cos(omega);
    var temp=1.0/(a*beta*beta);
    var xll=temp*xlcof*axn;
    var aynl=temp*aycof;
    var xlt=xl+xll;
    var ayn=e*Math.sin(omega)+aynl;

    // solve keplers equation
    var capu = (xlt-xnode)%(2.0*Math.PI);
    var temp2=capu;
    for (var i=1; i<=10; i++){
      var sinepw=Math.sin(temp2);
      var cosepw=Math.cos(temp2);
      var temp3=axn*sinepw;
      var temp4=ayn*cosepw;
      var temp5=axn*cosepw;
      var temp6=ayn*sinepw;
      var epw=(capu-temp4+temp3-temp2)/(1.0-temp5-temp6)+temp2;
    if (Math.abs(epw-temp2) <= e6a){
      break
    };
    temp2=epw;
  }
       // short period preliminary quantities

    var ecose=temp5+temp6;
    var esine=temp3-temp4;
    var elsq=axn*axn+ayn*ayn;
    var temp=1.0-elsq;
    var pl=a*temp;
    var r=a*(1.0-ecose);
    var temp1=1.0/r;
    var rdot=xke*Math.sqrt(a)*esine*temp1;
    var rfdot=xke*Math.sqrt(pl)*temp1;
    var temp2=a*temp1;
    var betal=Math.sqrt(temp);
    var temp3=1.0/(1.0+betal);
    var cosu=temp2*(cosepw-axn+ayn*esine*temp3);
    var sinu=temp2*(sinepw-ayn-axn*esine*temp3);
    var u=Math.atan2(sinu,cosu);
    if (u<0){u+= 2* Math.PI;}
    var sin2u=2.0*sinu*cosu;
    var cos2u=2.0*cosu*cosu-1.;
    var temp=1.0/pl;
    var temp1=ck2*temp;
    var temp2=temp1*temp;

    // update for short periodics

    var rk=r*(1.0-1.5*temp2*betal*x3thm1)+0.5*temp1*x1mth2*cos2u;
    var uk=u-0.25*temp2*x7thm1*sin2u;
    var xnodek=xnode+1.5*temp2*cosio*sin2u;
    var xinck=xincl+1.5*temp2*cosio*sinio*cos2u;
    var rdotk=rdot-xn*temp1*x1mth2*sin2u;
    var rfdotk=rfdot+xn*temp1*(x1mth2*cos2u+1.5*x3thm1);

    // orientation vectors

    var sinuk=Math.sin(uk);
    var cosuk=Math.cos(uk);
    var sinik=Math.sin(xinck);
    var cosik=Math.cos(xinck);
    var sinnok=Math.sin(xnodek);
    var cosnok=Math.cos(xnodek);
    var xmx=-sinnok*cosik;
    var xmy=cosnok*cosik;
    var ux=xmx*sinuk+cosnok*cosuk;
    var uy=xmy*sinuk+sinnok*cosuk;
    var uz=sinik*sinuk;
    var vx=xmx*cosuk-cosnok*sinuk;
    var vy=xmy*cosuk-sinnok*sinuk;
    var vz=sinik*cosuk;
    var x=rk*ux;
    var y=rk*uy;
    var z=rk*uz;
    var xdot=rdotk*ux+rfdotk*vx;
    var ydot=rdotk*uy+rfdotk*vy;
    var zdot=rdotk*uz+rfdotk*vz;

    var xkm = (x*xkmper);
    var ykm = (y*xkmper);
    var zkm = (z*xkmper);
    var xdotkmps = (xdot*xkmper/60);
    var ydotkmps = (ydot*xkmper/60);
    var zdotkmps = (zdot*xkmper/60);
    
    return {
      x: xkm,
      y: ykm,
      z: zkm,
      xdot: xdotkmps,
      ydot: ydotkmps,
      zdot: zdotkmps,
    }
  }
  
  var _toGeographic = function(time,rect){
    var time = time;
    var xkm = rect.x;
    var ykm = rect.y;
    var zkm = rect.z;
    var xdotkmps = rect.xdot;
    var ydotkmps = rect.ydot;
    var zdotkmps = rect.zdot;
    var rad = Math.PI/180;
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
    return {
      longitude : lng,
      latitude : lat/rad,
      altitude : alt,
      velocity : v
    }
  }
  
  //initialize;
  var elements = _decodeTLE(tle);
  var sgp4 = _setSGP4(elements);
  
  // Public members.
  return {
    "orbital_elements" : elements,
    "orbital_period" : sgp4.orbital_period,
    "position" :{
      "rectangular": function(time){
         var rect = _execSGP4(time,sgp4);
         return {
           x: rect.x,
           y: rect.y,
           z: rect.z,
           xdot: rect.xdot,
           ydot: rect.ydot,
           zdot: rect.zdot
         }
      },
      "geographic": function(time){
        var rect = _execSGP4(time,sgp4);
        var geo = _toGeographic(time,rect);
        return {
          latitude : geo.latitude,
          longitude : geo.longitude,
          altitude : geo.altitude
        }
      }
    }
  } //end return Orb.Satellite.
}

}(this))

