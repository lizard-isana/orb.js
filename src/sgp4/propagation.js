//orb-sgp4-propagation.js
//
//SGP4/SDP4 propagation core, ported from the reference implementation:
//  Vallado, Crawford, Hujsak, Kelso, "Revisiting Spacetrack Report #3",
//  AIAA 2006-6753, as distributed in python-sgp4 (Brandon Rhodes, MIT
//  license), which is itself a direct translation of Vallado's code.
//Includes the deep-space (SDP4) secular and lunar-solar periodic terms
//and the 12h/24h geopotential resonance handling. Verified numerically
//against the python-sgp4 reference implementation.

const pi = Math.PI;
const twopi = 2.0 * pi;

//WGS-72 gravity constants: TLEs are fitted with these; do not substitute
//WGS-84 values here (Vallado, AIAA 2006-6753).
const mu = 398600.8; //km3/s2
const radiusearthkm = 6378.135; //km
const xke = 60.0 / Math.sqrt(radiusearthkm * radiusearthkm * radiusearthkm / mu);
const tumin = 1.0 / xke;
const j2 = 0.001082616;
const j3 = -0.00000253881;
const j4 = -0.00000165597;
const j3oj2 = j3 / j2;

export const wgs72 = { mu, radiusearthkm, xke, tumin, j2, j3, j4, j3oj2 };

//Greenwich sidereal time (IAU 1982) from a UT1 Julian date, radians
export const gstime = (jdut1) => {
  const tut1 = (jdut1 - 2451545.0) / 36525.0;
  let temp = -6.2e-6 * tut1 * tut1 * tut1 + 0.093104 * tut1 * tut1 +
    (876600.0 * 3600 + 8640184.812866) * tut1 + 67310.54841; //sec
  temp = (temp * (pi / 180.0) / 240.0) % twopi; //360/86400 = 1/240, to deg, to rad
  if (temp < 0.0) {
    temp += twopi;
  }
  return temp;
}

//deep space lunar-solar periodics
const _dpper = (satrec, inclo, init, ep, inclp, nodep, argpp, mp, opsmode) => {
  const e3 = satrec.e3, ee2 = satrec.ee2, peo = satrec.peo, pgho = satrec.pgho,
    pho = satrec.pho, pinco = satrec.pinco, plo = satrec.plo, se2 = satrec.se2,
    se3 = satrec.se3, sgh2 = satrec.sgh2, sgh3 = satrec.sgh3, sgh4 = satrec.sgh4,
    sh2 = satrec.sh2, sh3 = satrec.sh3, si2 = satrec.si2, si3 = satrec.si3,
    sl2 = satrec.sl2, sl3 = satrec.sl3, sl4 = satrec.sl4, t = satrec.t,
    xgh2 = satrec.xgh2, xgh3 = satrec.xgh3, xgh4 = satrec.xgh4, xh2 = satrec.xh2,
    xh3 = satrec.xh3, xi2 = satrec.xi2, xi3 = satrec.xi3, xl2 = satrec.xl2,
    xl3 = satrec.xl3, xl4 = satrec.xl4, zmol = satrec.zmol, zmos = satrec.zmos;

  //constants
  const zns = 1.19459e-5;
  const zes = 0.01675;
  const znl = 1.5835218e-4;
  const zel = 0.05490;

  //calculate time varying periodics
  let zm = zmos + zns * t;
  if (init === 'y') {
    zm = zmos;
  }
  let zf = zm + 2.0 * zes * Math.sin(zm);
  let sinzf = Math.sin(zf);
  let f2 = 0.5 * sinzf * sinzf - 0.25;
  let f3 = -0.5 * sinzf * Math.cos(zf);
  const ses = se2 * f2 + se3 * f3;
  const sis = si2 * f2 + si3 * f3;
  const sls = sl2 * f2 + sl3 * f3 + sl4 * sinzf;
  const sghs = sgh2 * f2 + sgh3 * f3 + sgh4 * sinzf;
  const shs = sh2 * f2 + sh3 * f3;
  zm = zmol + znl * t;
  if (init === 'y') {
    zm = zmol;
  }
  zf = zm + 2.0 * zel * Math.sin(zm);
  sinzf = Math.sin(zf);
  f2 = 0.5 * sinzf * sinzf - 0.25;
  f3 = -0.5 * sinzf * Math.cos(zf);
  const sel = ee2 * f2 + e3 * f3;
  const sil = xi2 * f2 + xi3 * f3;
  const sll = xl2 * f2 + xl3 * f3 + xl4 * sinzf;
  const sghl = xgh2 * f2 + xgh3 * f3 + xgh4 * sinzf;
  const shll = xh2 * f2 + xh3 * f3;
  let pe = ses + sel;
  let pinc = sis + sil;
  let pl = sls + sll;
  let pgh = sghs + sghl;
  let ph = shs + shll;

  if (init === 'n') {
    pe = pe - peo;
    pinc = pinc - pinco;
    pl = pl - plo;
    pgh = pgh - pgho;
    ph = ph - pho;
    inclp = inclp + pinc;
    ep = ep + pe;
    const sinip = Math.sin(inclp);
    const cosip = Math.cos(inclp);

    //apply periodics directly (lyddane modification below 0.2 rad)
    if (inclp >= 0.2) {
      ph = ph / sinip;
      pgh = pgh - cosip * ph;
      argpp = argpp + pgh;
      nodep = nodep + ph;
      mp = mp + pl;
    } else {
      const sinop = Math.sin(nodep);
      const cosop = Math.cos(nodep);
      let alfdp = sinip * sinop;
      let betdp = sinip * cosop;
      const dalf = ph * cosop + pinc * cosip * sinop;
      const dbet = -ph * sinop + pinc * cosip * cosop;
      alfdp = alfdp + dalf;
      betdp = betdp + dbet;
      nodep = nodep % twopi;
      if (nodep < 0.0 && opsmode === 'a') {
        nodep = nodep + twopi;
      }
      let xls = mp + argpp + pl + pgh + (cosip - pinc * sinip) * nodep;
      const xnoh = nodep;
      nodep = Math.atan2(alfdp, betdp);
      if (nodep < 0.0 && opsmode === 'a') {
        nodep = nodep + twopi;
      }
      if (Math.abs(xnoh - nodep) > pi) {
        if (nodep < xnoh) {
          nodep = nodep + twopi;
        } else {
          nodep = nodep - twopi;
        }
      }
      mp = mp + pl;
      argpp = xls - mp - cosip * nodep;
    }
  }
  return { ep, inclp, nodep, argpp, mp };
}

//deep space common items for the secular and periodic routines.
//Persistent coefficients are written into satrec; transient locals are
//returned for sgp4init to hand on to _dsinit.
const _dscom = (satrec, epoch, ep, argpp, tc, inclp, nodep, np) => {
  //constants
  const zes = 0.01675;
  const zel = 0.05490;
  const c1ss = 2.9864797e-6;
  const c1l = 4.7968065e-7;
  const zsinis = 0.39785416;
  const zcosis = 0.91744867;
  const zcosgs = 0.1945905;
  const zsings = -0.98088458;

  const nm = np;
  const em = ep;
  const snodm = Math.sin(nodep);
  const cnodm = Math.cos(nodep);
  const sinomm = Math.sin(argpp);
  const cosomm = Math.cos(argpp);
  const sinim = Math.sin(inclp);
  const cosim = Math.cos(inclp);
  const emsq = em * em;
  const betasq = 1.0 - emsq;
  const rtemsq = Math.sqrt(betasq);

  //initialize lunar solar terms
  satrec.peo = 0.0;
  satrec.pinco = 0.0;
  satrec.plo = 0.0;
  satrec.pgho = 0.0;
  satrec.pho = 0.0;
  const day = epoch + 18261.5 + tc / 1440.0;
  const xnodce = (4.5236020 - 9.2422029e-4 * day) % twopi;
  const stem = Math.sin(xnodce);
  const ctem = Math.cos(xnodce);
  const zcosil = 0.91375164 - 0.03568096 * ctem;
  const zsinil = Math.sqrt(1.0 - zcosil * zcosil);
  const zsinhl = 0.089683511 * stem / zsinil;
  const zcoshl = Math.sqrt(1.0 - zsinhl * zsinhl);
  const gam = 5.8351514 + 0.0019443680 * day;
  let zx = 0.39785416 * stem / zsinil;
  const zy = zcoshl * ctem + 0.91744867 * zsinhl * stem;
  zx = Math.atan2(zx, zy);
  zx = gam + zx - xnodce;
  const zcosgl = Math.cos(zx);
  const zsingl = Math.sin(zx);

  //do solar terms
  let zcosg = zcosgs;
  let zsing = zsings;
  let zcosi = zcosis;
  let zsini = zsinis;
  let zcosh = cnodm;
  let zsinh = snodm;
  let cc = c1ss;
  const xnoi = 1.0 / nm;

  let s1, s2, s3, s4, s5, s6, s7;
  let ss1, ss2, ss3, ss4, ss5, ss6, ss7;
  let sz1, sz2, sz3, sz11, sz12, sz13, sz21, sz22, sz23, sz31, sz32, sz33;
  let z1, z2, z3, z11, z12, z13, z21, z22, z23, z31, z32, z33;

  for (let lsflg = 1; lsflg <= 2; lsflg++) {
    const a1 = zcosg * zcosh + zsing * zcosi * zsinh;
    const a3 = -zsing * zcosh + zcosg * zcosi * zsinh;
    const a7 = -zcosg * zsinh + zsing * zcosi * zcosh;
    const a8 = zsing * zsini;
    const a9 = zsing * zsinh + zcosg * zcosi * zcosh;
    const a10 = zcosg * zsini;
    const a2 = cosim * a7 + sinim * a8;
    const a4 = cosim * a9 + sinim * a10;
    const a5 = -sinim * a7 + cosim * a8;
    const a6 = -sinim * a9 + cosim * a10;

    const x1 = a1 * cosomm + a2 * sinomm;
    const x2 = a3 * cosomm + a4 * sinomm;
    const x3 = -a1 * sinomm + a2 * cosomm;
    const x4 = -a3 * sinomm + a4 * cosomm;
    const x5 = a5 * sinomm;
    const x6 = a6 * sinomm;
    const x7 = a5 * cosomm;
    const x8 = a6 * cosomm;

    z31 = 12.0 * x1 * x1 - 3.0 * x3 * x3;
    z32 = 24.0 * x1 * x2 - 6.0 * x3 * x4;
    z33 = 12.0 * x2 * x2 - 3.0 * x4 * x4;
    z1 = 3.0 * (a1 * a1 + a2 * a2) + z31 * emsq;
    z2 = 6.0 * (a1 * a3 + a2 * a4) + z32 * emsq;
    z3 = 3.0 * (a3 * a3 + a4 * a4) + z33 * emsq;
    z11 = -6.0 * a1 * a5 + emsq * (-24.0 * x1 * x7 - 6.0 * x3 * x5);
    z12 = -6.0 * (a1 * a6 + a3 * a5) + emsq *
      (-24.0 * (x2 * x7 + x1 * x8) - 6.0 * (x3 * x6 + x4 * x5));
    z13 = -6.0 * a3 * a6 + emsq * (-24.0 * x2 * x8 - 6.0 * x4 * x6);
    z21 = 6.0 * a2 * a5 + emsq * (24.0 * x1 * x5 - 6.0 * x3 * x7);
    z22 = 6.0 * (a4 * a5 + a2 * a6) + emsq *
      (24.0 * (x2 * x5 + x1 * x6) - 6.0 * (x4 * x7 + x3 * x8));
    z23 = 6.0 * a4 * a6 + emsq * (24.0 * x2 * x6 - 6.0 * x4 * x8);
    z1 = z1 + z1 + betasq * z31;
    z2 = z2 + z2 + betasq * z32;
    z3 = z3 + z3 + betasq * z33;
    s3 = cc * xnoi;
    s2 = -0.5 * s3 / rtemsq;
    s4 = s3 * rtemsq;
    s1 = -15.0 * em * s4;
    s5 = x1 * x3 + x2 * x4;
    s6 = x2 * x3 + x1 * x4;
    s7 = x2 * x4 - x1 * x3;

    //do lunar terms
    if (lsflg === 1) {
      ss1 = s1;
      ss2 = s2;
      ss3 = s3;
      ss4 = s4;
      ss5 = s5;
      ss6 = s6;
      ss7 = s7;
      sz1 = z1;
      sz2 = z2;
      sz3 = z3;
      sz11 = z11;
      sz12 = z12;
      sz13 = z13;
      sz21 = z21;
      sz22 = z22;
      sz23 = z23;
      sz31 = z31;
      sz32 = z32;
      sz33 = z33;
      zcosg = zcosgl;
      zsing = zsingl;
      zcosi = zcosil;
      zsini = zsinil;
      zcosh = zcoshl * cnodm + zsinhl * snodm;
      zsinh = snodm * zcoshl - cnodm * zsinhl;
      cc = c1l;
    }
  }

  satrec.zmol = (((4.7199672 + 0.22997150 * day - gam) % twopi) + twopi) % twopi;
  satrec.zmos = ((6.2565837 + 0.017201977 * day) % twopi + twopi) % twopi;

  //do solar terms
  satrec.se2 = 2.0 * ss1 * ss6;
  satrec.se3 = 2.0 * ss1 * ss7;
  satrec.si2 = 2.0 * ss2 * sz12;
  satrec.si3 = 2.0 * ss2 * (sz13 - sz11);
  satrec.sl2 = -2.0 * ss3 * sz2;
  satrec.sl3 = -2.0 * ss3 * (sz3 - sz1);
  satrec.sl4 = -2.0 * ss3 * (-21.0 - 9.0 * emsq) * zes;
  satrec.sgh2 = 2.0 * ss4 * sz32;
  satrec.sgh3 = 2.0 * ss4 * (sz33 - sz31);
  satrec.sgh4 = -18.0 * ss4 * zes;
  satrec.sh2 = -2.0 * ss2 * sz22;
  satrec.sh3 = -2.0 * ss2 * (sz23 - sz21);

  //do lunar terms
  satrec.ee2 = 2.0 * s1 * s6;
  satrec.e3 = 2.0 * s1 * s7;
  satrec.xi2 = 2.0 * s2 * z12;
  satrec.xi3 = 2.0 * s2 * (z13 - z11);
  satrec.xl2 = -2.0 * s3 * z2;
  satrec.xl3 = -2.0 * s3 * (z3 - z1);
  satrec.xl4 = -2.0 * s3 * (-21.0 - 9.0 * emsq) * zel;
  satrec.xgh2 = 2.0 * s4 * z32;
  satrec.xgh3 = 2.0 * s4 * (z33 - z31);
  satrec.xgh4 = -18.0 * s4 * zel;
  satrec.xh2 = -2.0 * s2 * z22;
  satrec.xh3 = -2.0 * s2 * (z23 - z21);

  return {
    snodm, cnodm, sinim, cosim, sinomm, cosomm, day, em, emsq, gam, rtemsq,
    s1, s2, s3, s4, s5, s6, s7,
    ss1, ss2, ss3, ss4, ss5, ss6, ss7,
    sz1, sz2, sz3, sz11, sz12, sz13, sz21, sz22, sz23, sz31, sz32, sz33,
    z1, z2, z3, z11, z12, z13, z21, z22, z23, z31, z32, z33, nm
  };
}

//deep space contributions to mean motion dot due to geopotential resonance
//with half day and one day orbits. Persistent outputs go into satrec.
const _dsinit = (satrec, d, xpidot, eccsq, emsq, tc,
  em, argpm, inclm, mm, nm, nodem) => {

  const q22 = 1.7891679e-6;
  const q31 = 2.1460748e-6;
  const q33 = 2.2123015e-7;
  const root22 = 1.7891679e-6;
  const root44 = 7.3636953e-9;
  const root54 = 2.1765803e-9;
  const rptim = 4.37526908801129966e-3; //equates to 7.29211514668855e-5 rad/sec
  const root32 = 3.7393792e-7;
  const root52 = 1.1428639e-7;
  const x2o3 = 2.0 / 3.0;
  const znl = 1.5835218e-4;
  const zns = 1.19459e-5;

  const cosim = d.cosim, sinim = d.sinim;
  const s1 = d.s1, s2 = d.s2, s3 = d.s3, s4 = d.s4, s5 = d.s5;
  const ss1 = d.ss1, ss2 = d.ss2, ss3 = d.ss3, ss4 = d.ss4, ss5 = d.ss5;
  const sz1 = d.sz1, sz3 = d.sz3, sz11 = d.sz11, sz13 = d.sz13;
  const sz21 = d.sz21, sz23 = d.sz23, sz31 = d.sz31, sz33 = d.sz33;
  const z1 = d.z1, z3 = d.z3, z11 = d.z11, z13 = d.z13;
  const z21 = d.z21, z23 = d.z23, z31 = d.z31, z33 = d.z33;
  const t = satrec.t, gsto = satrec.gsto;
  const mo = satrec.mo, mdot = satrec.mdot, no = satrec.no_unkozai;
  const nodeo = satrec.nodeo, nodedot = satrec.nodedot;
  const argpo = satrec.argpo, ecco = satrec.ecco;

  //deep space initialization
  satrec.irez = 0;
  if (0.0034906585 < nm && nm < 0.0052359877) {
    satrec.irez = 1;
  }
  if (8.26e-3 <= nm && nm <= 9.24e-3 && em >= 0.5) {
    satrec.irez = 2;
  }

  //do solar terms
  const ses = ss1 * zns * ss5;
  const sis = ss2 * zns * (sz11 + sz13);
  const sls = -zns * ss3 * (sz1 + sz3 - 14.0 - 6.0 * emsq);
  const sghs = ss4 * zns * (sz31 + sz33 - 6.0);
  let shs = -zns * ss2 * (sz21 + sz23);
  //sgp4fix for 180 deg incl
  if (inclm < 5.2359877e-2 || inclm > pi - 5.2359877e-2) {
    shs = 0.0;
  }
  if (sinim !== 0.0) {
    shs = shs / sinim;
  }
  const sgs = sghs - cosim * shs;

  //do lunar terms
  satrec.dedt = ses + s1 * znl * s5;
  satrec.didt = sis + s2 * znl * (z11 + z13);
  satrec.dmdt = sls - znl * s3 * (z1 + z3 - 14.0 - 6.0 * emsq);
  const sghl = s4 * znl * (z31 + z33 - 6.0);
  let shll = -znl * s2 * (z21 + z23);
  //sgp4fix for 180 deg incl
  if (inclm < 5.2359877e-2 || inclm > pi - 5.2359877e-2) {
    shll = 0.0;
  }
  satrec.domdt = sgs + sghl;
  satrec.dnodt = shs;
  if (sinim !== 0.0) {
    satrec.domdt = satrec.domdt - cosim / sinim * shll;
    satrec.dnodt = satrec.dnodt + shll / sinim;
  }

  //calculate deep space resonance effects
  const dndt = 0.0;
  const theta = (gsto + tc * rptim) % twopi;
  em = em + satrec.dedt * t;
  inclm = inclm + satrec.didt * t;
  argpm = argpm + satrec.domdt * t;
  nodem = nodem + satrec.dnodt * t;
  mm = mm + satrec.dmdt * t;

  //initialize the resonance terms
  if (satrec.irez !== 0) {
    const aonv = Math.pow(nm / satrec.xke, x2o3);

    //geopotential resonance for 12 hour orbits
    if (satrec.irez === 2) {
      const cosisq = cosim * cosim;
      const emo = em;
      em = ecco;
      const emsqo = emsq;
      emsq = eccsq;
      const eoc = em * emsq;
      const g201 = -0.306 - (em - 0.64) * 0.440;

      let g211, g310, g322, g410, g422, g520, g533, g521, g532;
      if (em <= 0.65) {
        g211 = 3.616 - 13.2470 * em + 16.2900 * emsq;
        g310 = -19.302 + 117.3900 * em - 228.4190 * emsq + 156.5910 * eoc;
        g322 = -18.9068 + 109.7927 * em - 214.6334 * emsq + 146.5816 * eoc;
        g410 = -41.122 + 242.6940 * em - 471.0940 * emsq + 313.9530 * eoc;
        g422 = -146.407 + 841.8800 * em - 1629.014 * emsq + 1083.4350 * eoc;
        g520 = -532.114 + 3017.977 * em - 5740.032 * emsq + 3708.2760 * eoc;
      } else {
        g211 = -72.099 + 331.819 * em - 508.738 * emsq + 266.724 * eoc;
        g310 = -346.844 + 1582.851 * em - 2415.925 * emsq + 1246.113 * eoc;
        g322 = -342.585 + 1554.908 * em - 2366.899 * emsq + 1215.972 * eoc;
        g410 = -1052.797 + 4758.686 * em - 7193.992 * emsq + 3651.957 * eoc;
        g422 = -3581.690 + 16178.110 * em - 24462.770 * emsq + 12422.520 * eoc;
        if (em > 0.715) {
          g520 = -5149.66 + 29936.92 * em - 54087.36 * emsq + 31324.56 * eoc;
        } else {
          g520 = 1464.74 - 4664.75 * em + 3763.64 * emsq;
        }
      }
      if (em < 0.7) {
        g533 = -919.22770 + 4988.6100 * em - 9064.7700 * emsq + 5542.21 * eoc;
        g521 = -822.71072 + 4568.6173 * em - 8491.4146 * emsq + 5337.524 * eoc;
        g532 = -853.66600 + 4690.2500 * em - 8624.7700 * emsq + 5341.4 * eoc;
      } else {
        g533 = -37995.780 + 161616.52 * em - 229838.20 * emsq + 109377.94 * eoc;
        g521 = -51752.104 + 218913.95 * em - 309468.16 * emsq + 146349.42 * eoc;
        g532 = -40023.880 + 170470.89 * em - 242699.48 * emsq + 115605.82 * eoc;
      }

      const sini2 = sinim * sinim;
      const f220 = 0.75 * (1.0 + 2.0 * cosim + cosisq);
      const f221 = 1.5 * sini2;
      const f321 = 1.875 * sinim * (1.0 - 2.0 * cosim - 3.0 * cosisq);
      const f322 = -1.875 * sinim * (1.0 + 2.0 * cosim - 3.0 * cosisq);
      const f441 = 35.0 * sini2 * f220;
      const f442 = 39.3750 * sini2 * sini2;
      const f522 = 9.84375 * sinim * (sini2 * (1.0 - 2.0 * cosim - 5.0 * cosisq) +
        0.33333333 * (-2.0 + 4.0 * cosim + 6.0 * cosisq));
      const f523 = sinim * (4.92187512 * sini2 * (-2.0 - 4.0 * cosim +
        10.0 * cosisq) + 6.56250012 * (1.0 + 2.0 * cosim - 3.0 * cosisq));
      const f542 = 29.53125 * sinim * (2.0 - 8.0 * cosim + cosisq *
        (-12.0 + 8.0 * cosim + 10.0 * cosisq));
      const f543 = 29.53125 * sinim * (-2.0 - 8.0 * cosim + cosisq *
        (12.0 + 8.0 * cosim - 10.0 * cosisq));
      const xno2 = nm * nm;
      const ainv2 = aonv * aonv;
      let temp1 = 3.0 * xno2 * ainv2;
      let temp = temp1 * root22;
      satrec.d2201 = temp * f220 * g201;
      satrec.d2211 = temp * f221 * g211;
      temp1 = temp1 * aonv;
      temp = temp1 * root32;
      satrec.d3210 = temp * f321 * g310;
      satrec.d3222 = temp * f322 * g322;
      temp1 = temp1 * aonv;
      temp = 2.0 * temp1 * root44;
      satrec.d4410 = temp * f441 * g410;
      satrec.d4422 = temp * f442 * g422;
      temp1 = temp1 * aonv;
      temp = temp1 * root52;
      satrec.d5220 = temp * f522 * g520;
      satrec.d5232 = temp * f523 * g532;
      temp = 2.0 * temp1 * root54;
      satrec.d5421 = temp * f542 * g521;
      satrec.d5433 = temp * f543 * g533;
      satrec.xlamo = (mo + nodeo + nodeo - theta - theta) % twopi;
      satrec.xfact = mdot + satrec.dmdt + 2.0 * (nodedot + satrec.dnodt - rptim) - no;
      em = emo;
      emsq = emsqo;
    }

    //synchronous resonance terms
    if (satrec.irez === 1) {
      const g200 = 1.0 + emsq * (-2.5 + 0.8125 * emsq);
      const g310 = 1.0 + 2.0 * emsq;
      const g300 = 1.0 + emsq * (-6.0 + 6.60937 * emsq);
      const f220 = 0.75 * (1.0 + cosim) * (1.0 + cosim);
      const f311 = 0.9375 * sinim * sinim * (1.0 + 3.0 * cosim) - 0.75 * (1.0 + cosim);
      let f330 = 1.0 + cosim;
      f330 = 1.875 * f330 * f330 * f330;
      satrec.del1 = 3.0 * nm * nm * aonv * aonv;
      satrec.del2 = 2.0 * satrec.del1 * f220 * g200 * q22;
      satrec.del3 = 3.0 * satrec.del1 * f330 * g300 * q33 * aonv;
      satrec.del1 = satrec.del1 * f311 * g310 * q31 * aonv;
      satrec.xlamo = (mo + nodeo + argpo - theta) % twopi;
      satrec.xfact = mdot + xpidot - rptim + satrec.dmdt + satrec.domdt + satrec.dnodt - no;
    }

    //for sgp4, initialize the integrator
    satrec.xli = satrec.xlamo;
    satrec.xni = no;
    satrec.atime = 0.0;
    nm = no + dndt;
  }

  return { em, argpm, inclm, mm, nm, nodem, dndt };
}

//deep space secular effects (third body, averaged) and resonance update by
//numerical (euler-maclaurin) integration
const _dspace = (satrec, t, tc, em, argpm, inclm, mm, nodem, nm) => {
  const fasx2 = 0.13130908;
  const fasx4 = 2.8843198;
  const fasx6 = 0.37448087;
  const g22 = 5.7686396;
  const g32 = 0.95240898;
  const g44 = 1.8014998;
  const g52 = 1.0508330;
  const g54 = 4.4108898;
  const rptim = 4.37526908801129966e-3; //equates to 7.29211514668855e-5 rad/sec
  const stepp = 720.0;
  const stepn = -720.0;
  const step2 = 259200.0;

  const irez = satrec.irez, argpo = satrec.argpo, argpdot = satrec.argpdot;
  const gsto = satrec.gsto, xfact = satrec.xfact, xlamo = satrec.xlamo;
  const no = satrec.no_unkozai;
  let atime = satrec.atime, xli = satrec.xli, xni = satrec.xni;

  //calculate deep space resonance effects
  let dndt = 0.0;
  const theta = (gsto + tc * rptim) % twopi;
  em = em + satrec.dedt * t;
  inclm = inclm + satrec.didt * t;
  argpm = argpm + satrec.domdt * t;
  nodem = nodem + satrec.dnodt * t;
  mm = mm + satrec.dmdt * t;

  //update resonances: numerical (euler-maclaurin) integration
  let ft = 0.0;
  if (irez !== 0) {
    //epoch restart
    if (atime === 0.0 || t * atime <= 0.0 || Math.abs(t) < Math.abs(atime)) {
      atime = 0.0;
      xni = no;
      xli = xlamo;
    }
    let delt;
    if (t > 0.0) {
      delt = stepp;
    } else {
      delt = stepn;
    }

    let xndt = 0.0, xldot = 0.0, xnddt = 0.0;
    let iretn = 381;
    while (iretn === 381) {
      //dot terms calculated
      //near-synchronous resonance terms
      if (irez !== 2) {
        xndt = satrec.del1 * Math.sin(xli - fasx2) + satrec.del2 * Math.sin(2.0 * (xli - fasx4)) +
          satrec.del3 * Math.sin(3.0 * (xli - fasx6));
        xldot = xni + xfact;
        xnddt = satrec.del1 * Math.cos(xli - fasx2) +
          2.0 * satrec.del2 * Math.cos(2.0 * (xli - fasx4)) +
          3.0 * satrec.del3 * Math.cos(3.0 * (xli - fasx6));
        xnddt = xnddt * xldot;
      } else {
        //near-half-day resonance terms
        const xomi = argpo + argpdot * atime;
        const x2omi = xomi + xomi;
        const x2li = xli + xli;
        xndt = (satrec.d2201 * Math.sin(x2omi + xli - g22) + satrec.d2211 * Math.sin(xli - g22) +
          satrec.d3210 * Math.sin(xomi + xli - g32) + satrec.d3222 * Math.sin(-xomi + xli - g32) +
          satrec.d4410 * Math.sin(x2omi + x2li - g44) + satrec.d4422 * Math.sin(x2li - g44) +
          satrec.d5220 * Math.sin(xomi + xli - g52) + satrec.d5232 * Math.sin(-xomi + xli - g52) +
          satrec.d5421 * Math.sin(xomi + x2li - g54) + satrec.d5433 * Math.sin(-xomi + x2li - g54));
        xldot = xni + xfact;
        xnddt = (satrec.d2201 * Math.cos(x2omi + xli - g22) + satrec.d2211 * Math.cos(xli - g22) +
          satrec.d3210 * Math.cos(xomi + xli - g32) + satrec.d3222 * Math.cos(-xomi + xli - g32) +
          satrec.d5220 * Math.cos(xomi + xli - g52) + satrec.d5232 * Math.cos(-xomi + xli - g52) +
          2.0 * (satrec.d4410 * Math.cos(x2omi + x2li - g44) +
            satrec.d4422 * Math.cos(x2li - g44) + satrec.d5421 * Math.cos(xomi + x2li - g54) +
            satrec.d5433 * Math.cos(-xomi + x2li - g54)));
        xnddt = xnddt * xldot;
      }

      //integrator
      if (Math.abs(t - atime) >= stepp) {
        iretn = 381;
      } else {
        ft = t - atime;
        iretn = 0;
      }
      if (iretn === 381) {
        xli = xli + xldot * delt + xndt * step2;
        xni = xni + xndt * delt + xnddt * step2;
        atime = atime + delt;
      }
    }

    nm = xni + xndt * ft + xnddt * ft * ft * 0.5;
    const xl = xli + xldot * ft + xndt * ft * ft * 0.5;
    if (irez !== 1) {
      mm = xl - 2.0 * nodem + 2.0 * theta;
      dndt = nm - no;
    } else {
      mm = xl - nodem - argpm + theta;
      dndt = nm - no;
    }
    nm = no + dndt;
  }

  return { em, argpm, inclm, mm, nodem, dndt, nm };
}

//initialization consolidated from the original loops in other routines
const _initl = (ecco, epoch, inclo, no, opsmode) => {
  const x2o3 = 2.0 / 3.0;

  //calculate auxillary epoch quantities
  const eccsq = ecco * ecco;
  const omeosq = 1.0 - eccsq;
  const rteosq = Math.sqrt(omeosq);
  const cosio = Math.cos(inclo);
  const cosio2 = cosio * cosio;

  //un-kozai the mean motion
  const ak = Math.pow(xke / no, x2o3);
  const d1 = 0.75 * j2 * (3.0 * cosio2 - 1.0) / (rteosq * omeosq);
  let del_ = d1 / (ak * ak);
  const adel = ak * (1.0 - del_ * del_ - del_ *
    (1.0 / 3.0 + 134.0 * del_ * del_ / 81.0));
  del_ = d1 / (adel * adel);
  no = no / (1.0 + del_);

  const ao = Math.pow(xke / no, x2o3);
  const sinio = Math.sin(inclo);
  const po = ao * omeosq;
  const con42 = 1.0 - 5.0 * cosio2;
  const con41 = -con42 - cosio2 - cosio2;
  const ainv = 1.0 / ao;
  const posq = po * po;
  const rp = ao * (1.0 - ecco);

  let gsto;
  if (opsmode === 'a') {
    //sgp4fix use old way of finding gst: count integer number of days from
    //0 jan 1970
    const ts70 = epoch - 7305.0;
    const ds70 = Math.floor(ts70 + 1.0e-8);
    const tfrac = ts70 - ds70;
    //find greenwich location at epoch
    const c1 = 1.72027916940703639e-2;
    const thgr70 = 1.7321343856509374;
    const fk5r = 5.07551419432269442e-15;
    const c1p2p = c1 + twopi;
    gsto = (thgr70 + c1 * ds70 + c1p2p * tfrac + ts70 * ts70 * fk5r) % twopi;
    if (gsto < 0.0) {
      gsto = gsto + twopi;
    }
  } else {
    gsto = gstime(epoch + 2433281.5);
  }

  return { no, ainv, ao, con41, con42, cosio, cosio2, eccsq, omeosq, posq, rp, rteosq, sinio, gsto };
}

/*
 * sgp4init: initialize a satrec for sgp4().
 *   opsmode  - 'a' (afspc) or 'i' (improved)
 *   epoch    - epoch time in days from jan 0, 1950. 0 hr
 *   remaining angles in radians, no_kozai in radians/minute
 * The satrec object is populated in place; satrec.error carries any error
 * code (see sgp4 below).
 */
export const sgp4init = (satrec, opsmode, epoch,
  xbstar, xndot, xnddot, xecco, xargpo, xinclo, xmo, xno_kozai, xnodeo) => {

  const temp4 = 1.5e-12;

  //set all near earth variables to zero
  satrec.isimp = 0; satrec.method = 'n'; satrec.aycof = 0.0;
  satrec.con41 = 0.0; satrec.cc1 = 0.0; satrec.cc4 = 0.0;
  satrec.cc5 = 0.0; satrec.d2 = 0.0; satrec.d3 = 0.0;
  satrec.d4 = 0.0; satrec.delmo = 0.0; satrec.eta = 0.0;
  satrec.argpdot = 0.0; satrec.omgcof = 0.0; satrec.sinmao = 0.0;
  satrec.t = 0.0; satrec.t2cof = 0.0; satrec.t3cof = 0.0;
  satrec.t4cof = 0.0; satrec.t5cof = 0.0; satrec.x1mth2 = 0.0;
  satrec.x7thm1 = 0.0; satrec.mdot = 0.0; satrec.nodedot = 0.0;
  satrec.xlcof = 0.0; satrec.xmcof = 0.0; satrec.nodecf = 0.0;

  //set all deep space variables to zero
  satrec.irez = 0; satrec.d2201 = 0.0; satrec.d2211 = 0.0;
  satrec.d3210 = 0.0; satrec.d3222 = 0.0; satrec.d4410 = 0.0;
  satrec.d4422 = 0.0; satrec.d5220 = 0.0; satrec.d5232 = 0.0;
  satrec.d5421 = 0.0; satrec.d5433 = 0.0; satrec.dedt = 0.0;
  satrec.del1 = 0.0; satrec.del2 = 0.0; satrec.del3 = 0.0;
  satrec.didt = 0.0; satrec.dmdt = 0.0; satrec.dnodt = 0.0;
  satrec.domdt = 0.0; satrec.e3 = 0.0; satrec.ee2 = 0.0;
  satrec.peo = 0.0; satrec.pgho = 0.0; satrec.pho = 0.0;
  satrec.pinco = 0.0; satrec.plo = 0.0; satrec.se2 = 0.0;
  satrec.se3 = 0.0; satrec.sgh2 = 0.0; satrec.sgh3 = 0.0;
  satrec.sgh4 = 0.0; satrec.sh2 = 0.0; satrec.sh3 = 0.0;
  satrec.si2 = 0.0; satrec.si3 = 0.0; satrec.sl2 = 0.0;
  satrec.sl3 = 0.0; satrec.sl4 = 0.0; satrec.gsto = 0.0;
  satrec.xfact = 0.0; satrec.xgh2 = 0.0; satrec.xgh3 = 0.0;
  satrec.xgh4 = 0.0; satrec.xh2 = 0.0; satrec.xh3 = 0.0;
  satrec.xi2 = 0.0; satrec.xi3 = 0.0; satrec.xl2 = 0.0;
  satrec.xl3 = 0.0; satrec.xl4 = 0.0; satrec.xlamo = 0.0;
  satrec.zmol = 0.0; satrec.zmos = 0.0; satrec.atime = 0.0;
  satrec.xli = 0.0; satrec.xni = 0.0;

  //earth constants (WGS-72)
  satrec.tumin = tumin; satrec.mu = mu; satrec.radiusearthkm = radiusearthkm;
  satrec.xke = xke; satrec.j2 = j2; satrec.j3 = j3; satrec.j4 = j4;
  satrec.j3oj2 = j3oj2;

  satrec.error = 0;
  satrec.operationmode = opsmode;

  satrec.bstar = xbstar;
  satrec.ndot = xndot;
  satrec.nddot = xnddot;
  satrec.ecco = xecco;
  satrec.argpo = xargpo;
  satrec.inclo = xinclo;
  satrec.mo = xmo;
  satrec.no_kozai = xno_kozai;
  satrec.nodeo = xnodeo;

  //single averaged mean elements
  satrec.am = 0.0; satrec.em = 0.0; satrec.im = 0.0;
  satrec.Om = 0.0; satrec.mm = 0.0; satrec.nm = 0.0;

  const ss = 78.0 / radiusearthkm + 1.0;
  const qzms2ttemp = (120.0 - 78.0) / radiusearthkm;
  const qzms2t = qzms2ttemp * qzms2ttemp * qzms2ttemp * qzms2ttemp;
  const x2o3 = 2.0 / 3.0;

  satrec.init = 'y';
  satrec.t = 0.0;

  const il = _initl(satrec.ecco, epoch, satrec.inclo, satrec.no_kozai, satrec.operationmode);
  satrec.no_unkozai = il.no;
  satrec.con41 = il.con41;
  satrec.gsto = il.gsto;
  const ao = il.ao, con42 = il.con42, cosio = il.cosio, cosio2 = il.cosio2;
  const eccsq = il.eccsq, omeosq = il.omeosq, posq = il.posq;
  const rp = il.rp, rteosq = il.rteosq, sinio = il.sinio;

  satrec.a = Math.pow(satrec.no_unkozai * tumin, -2.0 / 3.0);
  satrec.alta = satrec.a * (1.0 + satrec.ecco) - 1.0;
  satrec.altp = satrec.a * (1.0 - satrec.ecco) - 1.0;

  if (omeosq >= 0.0 || satrec.no_unkozai >= 0.0) {
    satrec.isimp = 0;
    if (rp < 220.0 / radiusearthkm + 1.0) {
      satrec.isimp = 1;
    }
    let sfour = ss;
    let qzms24 = qzms2t;
    const perige = (rp - 1.0) * radiusearthkm;

    //for perigees below 156 km, s and qoms2t are altered
    if (perige < 156.0) {
      sfour = perige - 78.0;
      if (perige < 98.0) {
        sfour = 20.0;
      }
      const qzms24temp = (120.0 - sfour) / radiusearthkm;
      qzms24 = qzms24temp * qzms24temp * qzms24temp * qzms24temp;
      sfour = sfour / radiusearthkm + 1.0;
    }
    const pinvsq = 1.0 / posq;

    const tsi = 1.0 / (ao - sfour);
    satrec.eta = ao * satrec.ecco * tsi;
    const etasq = satrec.eta * satrec.eta;
    const eeta = satrec.ecco * satrec.eta;
    const psisq = Math.abs(1.0 - etasq);
    const coef = qzms24 * Math.pow(tsi, 4.0);
    const coef1 = coef / Math.pow(psisq, 3.5);
    const cc2 = coef1 * satrec.no_unkozai * (ao * (1.0 + 1.5 * etasq + eeta *
      (4.0 + etasq)) + 0.375 * j2 * tsi / psisq * satrec.con41 *
      (8.0 + 3.0 * etasq * (8.0 + etasq)));
    satrec.cc1 = satrec.bstar * cc2;
    let cc3 = 0.0;
    if (satrec.ecco > 1.0e-4) {
      cc3 = -2.0 * coef * tsi * j3oj2 * satrec.no_unkozai * sinio / satrec.ecco;
    }
    satrec.x1mth2 = 1.0 - cosio2;
    satrec.cc4 = 2.0 * satrec.no_unkozai * coef1 * ao * omeosq *
      (satrec.eta * (2.0 + 0.5 * etasq) + satrec.ecco *
        (0.5 + 2.0 * etasq) - j2 * tsi / (ao * psisq) *
        (-3.0 * satrec.con41 * (1.0 - 2.0 * eeta + etasq *
          (1.5 - 0.5 * eeta)) + 0.75 * satrec.x1mth2 *
          (2.0 * etasq - eeta * (1.0 + etasq)) * Math.cos(2.0 * satrec.argpo)));
    satrec.cc5 = 2.0 * coef1 * ao * omeosq * (1.0 + 2.75 *
      (etasq + eeta) + eeta * etasq);
    const cosio4 = cosio2 * cosio2;
    const temp1 = 1.5 * j2 * pinvsq * satrec.no_unkozai;
    const temp2 = 0.5 * temp1 * j2 * pinvsq;
    const temp3 = -0.46875 * j4 * pinvsq * pinvsq * satrec.no_unkozai;
    satrec.mdot = satrec.no_unkozai + 0.5 * temp1 * rteosq * satrec.con41 + 0.0625 *
      temp2 * rteosq * (13.0 - 78.0 * cosio2 + 137.0 * cosio4);
    satrec.argpdot = (-0.5 * temp1 * con42 + 0.0625 * temp2 *
      (7.0 - 114.0 * cosio2 + 395.0 * cosio4) +
      temp3 * (3.0 - 36.0 * cosio2 + 49.0 * cosio4));
    const xhdot1 = -temp1 * cosio;
    satrec.nodedot = xhdot1 + (0.5 * temp2 * (4.0 - 19.0 * cosio2) +
      2.0 * temp3 * (3.0 - 7.0 * cosio2)) * cosio;
    const xpidot = satrec.argpdot + satrec.nodedot;
    satrec.omgcof = satrec.bstar * cc3 * Math.cos(satrec.argpo);
    satrec.xmcof = 0.0;
    if (satrec.ecco > 1.0e-4) {
      satrec.xmcof = -x2o3 * coef * satrec.bstar / eeta;
    }
    satrec.nodecf = 3.5 * omeosq * xhdot1 * satrec.cc1;
    satrec.t2cof = 1.5 * satrec.cc1;
    //sgp4fix for divide by zero with xinco = 180 deg
    if (Math.abs(cosio + 1.0) > 1.5e-12) {
      satrec.xlcof = -0.25 * j3oj2 * sinio * (3.0 + 5.0 * cosio) / (1.0 + cosio);
    } else {
      satrec.xlcof = -0.25 * j3oj2 * sinio * (3.0 + 5.0 * cosio) / temp4;
    }
    satrec.aycof = -0.5 * j3oj2 * sinio;
    const delmotemp = 1.0 + satrec.eta * Math.cos(satrec.mo);
    satrec.delmo = delmotemp * delmotemp * delmotemp;
    satrec.sinmao = Math.sin(satrec.mo);
    satrec.x7thm1 = 7.0 * cosio2 - 1.0;

    //deep space initialization
    if (2 * pi / satrec.no_unkozai >= 225.0) {
      satrec.method = 'd';
      satrec.isimp = 1;
      const tc = 0.0;
      const inclm = satrec.inclo;

      const ds = _dscom(satrec, epoch, satrec.ecco, satrec.argpo, tc,
        satrec.inclo, satrec.nodeo, satrec.no_unkozai);
      const em_ = ds.em, emsq_ = ds.emsq;

      const dp = _dpper(satrec, inclm, satrec.init,
        satrec.ecco, satrec.inclo, satrec.nodeo, satrec.argpo, satrec.mo,
        satrec.operationmode);
      satrec.ecco = dp.ep;
      satrec.inclo = dp.inclp;
      satrec.nodeo = dp.nodep;
      satrec.argpo = dp.argpp;
      satrec.mo = dp.mp;

      const di = _dsinit(satrec, ds, xpidot, eccsq, emsq_, tc,
        em_, 0.0, inclm, 0.0, ds.nm, 0.0);
      void di;
    }

    //set variables if not deep space
    if (satrec.isimp !== 1) {
      const cc1sq = satrec.cc1 * satrec.cc1;
      satrec.d2 = 4.0 * ao * tsi * cc1sq;
      const temp = satrec.d2 * tsi * satrec.cc1 / 3.0;
      satrec.d3 = (17.0 * ao + sfour) * temp;
      satrec.d4 = 0.5 * temp * ao * tsi * (221.0 * ao + 31.0 * sfour) * satrec.cc1;
      satrec.t3cof = satrec.d2 + 2.0 * cc1sq;
      satrec.t4cof = 0.25 * (3.0 * satrec.d3 + satrec.cc1 *
        (12.0 * satrec.d2 + 10.0 * cc1sq));
      satrec.t5cof = 0.2 * (3.0 * satrec.d4 +
        12.0 * satrec.cc1 * satrec.d3 +
        6.0 * satrec.d2 * satrec.d2 +
        15.0 * cc1sq * (2.0 * satrec.d2 + cc1sq));
    }
  }

  //finally propagate to zero epoch to initialize all others
  sgp4(satrec, 0.0);
  satrec.init = 'n';
  return true;
}

/*
 * sgp4: propagate a satrec to tsince minutes from epoch.
 * Returns {x, y, z, xdot, ydot, zdot} in km and km/s (TEME), or null when
 * propagation fails; satrec.error / satrec.error_message describe the cause:
 *   1 - mean elements, ecc >= 1.0 or ecc < -0.001 or a < 0.95 er
 *   2 - mean motion less than 0.0
 *   3 - pert elements, ecc < 0.0 or ecc > 1.0
 *   4 - semi-latus rectum < 0.0
 *   6 - satellite has decayed (state is still returned)
 */
export const sgp4 = (satrec, tsince) => {
  let mrt = 0.0;
  const temp4 = 1.5e-12;
  const x2o3 = 2.0 / 3.0;
  const vkmpersec = radiusearthkm * satrec.xke / 60.0;

  //clear sgp4 error flag
  satrec.t = tsince;
  satrec.error = 0;
  satrec.error_message = null;

  //update for secular gravity and atmospheric drag
  const xmdf = satrec.mo + satrec.mdot * satrec.t;
  const argpdf = satrec.argpo + satrec.argpdot * satrec.t;
  const nodedf = satrec.nodeo + satrec.nodedot * satrec.t;
  let argpm = argpdf;
  let mm = xmdf;
  const t2 = satrec.t * satrec.t;
  let nodem = nodedf + satrec.nodecf * t2;
  let tempa = 1.0 - satrec.cc1 * satrec.t;
  let tempe = satrec.bstar * satrec.cc4 * satrec.t;
  let templ = satrec.t2cof * t2;

  if (satrec.isimp !== 1) {
    const delomg = satrec.omgcof * satrec.t;
    const delmtemp = 1.0 + satrec.eta * Math.cos(xmdf);
    const delm = satrec.xmcof *
      (delmtemp * delmtemp * delmtemp - satrec.delmo);
    const temp_ = delomg + delm;
    mm = xmdf + temp_;
    argpm = argpdf - temp_;
    const t3 = t2 * satrec.t;
    const t4 = t3 * satrec.t;
    tempa = tempa - satrec.d2 * t2 - satrec.d3 * t3 - satrec.d4 * t4;
    tempe = tempe + satrec.bstar * satrec.cc5 * (Math.sin(mm) - satrec.sinmao);
    templ = templ + satrec.t3cof * t3 + t4 * (satrec.t4cof + satrec.t * satrec.t5cof);
  }

  let nm = satrec.no_unkozai;
  let em = satrec.ecco;
  let inclm = satrec.inclo;
  if (satrec.method === 'd') {
    const tc = satrec.t;
    const dsp = _dspace(satrec, satrec.t, tc, em, argpm, inclm, mm, nodem, nm);
    em = dsp.em;
    argpm = dsp.argpm;
    inclm = dsp.inclm;
    mm = dsp.mm;
    nodem = dsp.nodem;
    nm = dsp.nm;
  }

  if (nm <= 0.0) {
    satrec.error_message = 'mean motion ' + nm + ' is less than zero';
    satrec.error = 2;
    return null;
  }
  const am = Math.pow(satrec.xke / nm, x2o3) * tempa * tempa;
  nm = satrec.xke / Math.pow(am, 1.5);
  em = em - tempe;

  //fix tolerance for error recognition
  if (em >= 1.0 || em < -0.001) {
    satrec.error_message = 'mean eccentricity ' + em + ' not within range 0.0 <= e < 1.0';
    satrec.error = 1;
    return null;
  }
  //sgp4fix fix tolerance to avoid a divide by zero
  if (em < 1.0e-6) {
    em = 1.0e-6;
  }
  mm = mm + satrec.no_unkozai * templ;
  let xlm = mm + argpm + nodem;
  const emsq = em * em;
  let temp = 1.0 - emsq;

  nodem = nodem % twopi;
  argpm = ((argpm % twopi) + twopi) % twopi;
  xlm = ((xlm % twopi) + twopi) % twopi;
  mm = (((xlm - argpm - nodem) % twopi) + twopi) % twopi;

  //recover singly averaged mean elements
  satrec.am = am;
  satrec.em = em;
  satrec.im = inclm;
  satrec.Om = nodem;
  satrec.om = argpm;
  satrec.mm = mm;
  satrec.nm = nm;

  //compute extra mean quantities
  const sinim = Math.sin(inclm);
  const cosim = Math.cos(inclm);

  //add lunar-solar periodics
  let ep = em;
  let xincp = inclm;
  let argpp = argpm;
  let nodep = nodem;
  let mp = mm;
  let sinip = sinim;
  let cosip = cosim;
  if (satrec.method === 'd') {
    const dp = _dpper(satrec, satrec.inclo, 'n', ep, xincp, nodep, argpp, mp,
      satrec.operationmode);
    ep = dp.ep;
    xincp = dp.inclp;
    nodep = dp.nodep;
    argpp = dp.argpp;
    mp = dp.mp;
    if (xincp < 0.0) {
      xincp = -xincp;
      nodep = nodep + pi;
      argpp = argpp - pi;
    }
    if (ep < 0.0 || ep > 1.0) {
      satrec.error_message = 'perturbed eccentricity ' + ep + ' not within range 0.0 <= e <= 1.0';
      satrec.error = 3;
      return null;
    }
  }

  //long period periodics
  if (satrec.method === 'd') {
    sinip = Math.sin(xincp);
    cosip = Math.cos(xincp);
    satrec.aycof = -0.5 * j3oj2 * sinip;
    //sgp4fix for divide by zero for xincp = 180 deg
    if (Math.abs(cosip + 1.0) > 1.5e-12) {
      satrec.xlcof = -0.25 * j3oj2 * sinip * (3.0 + 5.0 * cosip) / (1.0 + cosip);
    } else {
      satrec.xlcof = -0.25 * j3oj2 * sinip * (3.0 + 5.0 * cosip) / temp4;
    }
  }

  const axnl = ep * Math.cos(argpp);
  temp = 1.0 / (am * (1.0 - ep * ep));
  const aynl = ep * Math.sin(argpp) + temp * satrec.aycof;
  const xl = mp + argpp + nodep + temp * satrec.xlcof * axnl;

  //solve kepler's equation
  const u = (((xl - nodep) % twopi) + twopi) % twopi;
  let eo1 = u;
  let tem5 = 9999.9;
  let ktr = 1;
  let sineo1 = 0.0, coseo1 = 0.0;
  while (Math.abs(tem5) >= 1.0e-12 && ktr <= 10) {
    sineo1 = Math.sin(eo1);
    coseo1 = Math.cos(eo1);
    tem5 = 1.0 - coseo1 * axnl - sineo1 * aynl;
    tem5 = (u - aynl * coseo1 + axnl * sineo1 - eo1) / tem5;
    if (Math.abs(tem5) >= 0.95) {
      tem5 = tem5 > 0.0 ? 0.95 : -0.95;
    }
    eo1 = eo1 + tem5;
    ktr = ktr + 1;
  }

  //short period preliminary quantities
  const ecose = axnl * coseo1 + aynl * sineo1;
  const esine = axnl * sineo1 - aynl * coseo1;
  const el2 = axnl * axnl + aynl * aynl;
  const pl = am * (1.0 - el2);
  if (pl < 0.0) {
    satrec.error_message = 'semilatus rectum ' + pl + ' is less than zero';
    satrec.error = 4;
    return null;
  }

  const rl = am * (1.0 - ecose);
  const rdotl = Math.sqrt(am) * esine / rl;
  const rvdotl = Math.sqrt(pl) / rl;
  const betal = Math.sqrt(1.0 - el2);
  temp = esine / (1.0 + betal);
  const sinu = am / rl * (sineo1 - aynl - axnl * temp);
  const cosu = am / rl * (coseo1 - axnl + aynl * temp);
  let su = Math.atan2(sinu, cosu);
  const sin2u = (cosu + cosu) * sinu;
  const cos2u = 1.0 - 2.0 * sinu * sinu;
  temp = 1.0 / pl;
  const temp1 = 0.5 * j2 * temp;
  const temp2 = temp1 * temp;

  //update for short period periodics
  if (satrec.method === 'd') {
    const cosisq = cosip * cosip;
    satrec.con41 = 3.0 * cosisq - 1.0;
    satrec.x1mth2 = 1.0 - cosisq;
    satrec.x7thm1 = 7.0 * cosisq - 1.0;
  }

  mrt = rl * (1.0 - 1.5 * temp2 * betal * satrec.con41) +
    0.5 * temp1 * satrec.x1mth2 * cos2u;
  su = su - 0.25 * temp2 * satrec.x7thm1 * sin2u;
  const xnode = nodep + 1.5 * temp2 * cosip * sin2u;
  const xinc = xincp + 1.5 * temp2 * cosip * sinip * cos2u;
  const mvt = rdotl - nm * temp1 * satrec.x1mth2 * sin2u / satrec.xke;
  const rvdot = rvdotl + nm * temp1 * (satrec.x1mth2 * cos2u +
    1.5 * satrec.con41) / satrec.xke;

  //orientation vectors
  const sinsu = Math.sin(su);
  const cossu = Math.cos(su);
  const snod = Math.sin(xnode);
  const cnod = Math.cos(xnode);
  const sini = Math.sin(xinc);
  const cosi = Math.cos(xinc);
  const xmx = -snod * cosi;
  const xmy = cnod * cosi;
  const ux = xmx * sinsu + cnod * cossu;
  const uy = xmy * sinsu + snod * cossu;
  const uz = sini * sinsu;
  const vx = xmx * cossu - cnod * sinsu;
  const vy = xmy * cossu - snod * sinsu;
  const vz = sini * cossu;

  //position and velocity (in km and km/sec)
  const _mr = mrt * radiusearthkm;
  const result = {
    x: _mr * ux,
    y: _mr * uy,
    z: _mr * uz,
    xdot: (mvt * ux + rvdot * vx) * vkmpersec,
    ydot: (mvt * uy + rvdot * vy) * vkmpersec,
    zdot: (mvt * uz + rvdot * vz) * vkmpersec
  };

  //sgp4fix for decaying satellites
  if (mrt < 1.0) {
    satrec.error_message = 'mrt ' + mrt + ' is less than 1.0 indicating the satellite has decayed';
    satrec.error = 6;
  }

  return result;
}
