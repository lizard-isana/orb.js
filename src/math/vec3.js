// vec3.js — minimal 3-vector operations on plain arrays / Float64Array.
//
// orb.js v4 stores every position in km and every velocity in km/s as a
// 3-element Float64Array. These helpers are deliberately tiny and
// allocation-conscious: astronomy code calls them in tight loops (series
// evaluation, root finding for rise/set), and a dedicated vector class
// would add nothing but indirection.
//
// Rotation convention: rotx/rotz rotate the COORDINATE FRAME by +angle
// about the axis (passive rotation), which is the convention used
// throughout classical astronomy texts (Meeus, Explanatory Supplement).
// Rotating a frame by +e about x maps ecliptic coordinates to equatorial
// coordinates when e is the obliquity, matching the formulas found in
// textbooks. If you need to rotate the VECTOR instead, pass -angle.

export const vec3 = (x = 0, y = 0, z = 0) => Float64Array.of(x, y, z);

export const add = (a, b) => Float64Array.of(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
export const sub = (a, b) => Float64Array.of(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const scale = (a, s) => Float64Array.of(a[0] * s, a[1] * s, a[2] * s);

export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const cross = (a, b) => Float64Array.of(
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
);

export const norm = (a) => Math.hypot(a[0], a[1], a[2]);

//#region edu:frame-rotation
// A passive rotation about the x-axis by angle e (radians):
//   x' = x
//   y' =  cos(e) y + sin(e) z
//   z' = -sin(e) y + cos(e) z
// With e = obliquity of the ecliptic this is exactly the classical
// "equatorial from ecliptic" transformation and its inverse (negate e).
export const rotx = (v, e) => {
  const c = Math.cos(e), s = Math.sin(e);
  return Float64Array.of(
    v[0],
    c * v[1] + s * v[2],
    -s * v[1] + c * v[2]
  );
};

// Passive rotation about the z-axis by angle a (radians). With
// a = sidereal time this maps inertial equatorial coordinates to
// Earth-fixed coordinates.
export const rotz = (v, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return Float64Array.of(
    c * v[0] + s * v[1],
    -s * v[0] + c * v[1],
    v[2]
  );
};
//#endregion

// 3x3 matrices as row-major Float64Array(9), for the precession/nutation
// rotations where composing three axis rotations each call would waste work.
export const matVec = (m, v) => Float64Array.of(
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
);

// Transpose-multiply: because rotation matrices are orthogonal, the
// transpose IS the inverse. This is how every frame edge gets its reverse
// direction for free.
export const matTVec = (m, v) => Float64Array.of(
  m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
  m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
  m[2] * v[0] + m[5] * v[1] + m[8] * v[2]
);

export const matMul = (a, b) => {
  const r = new Float64Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    }
  }
  return r;
};

export const matIdentity = () => Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);

// Frame rotation matrices about each axis (passive, same convention as
// rotx/rotz above).
export const matRotX = (e) => {
  const c = Math.cos(e), s = Math.sin(e);
  return Float64Array.of(1, 0, 0, 0, c, s, 0, -s, c);
};

export const matRotZ = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return Float64Array.of(c, s, 0, -s, c, 0, 0, 0, 1);
};
