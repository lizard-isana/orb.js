function requireVector(value, label = 'vector') {
  if (!value || value.length !== 3) throw new TypeError(`${label}: expected a 3-vector`);
  for (let index = 0; index < 3; index++) {
    if (!Number.isFinite(value[index])) throw new TypeError(`${label}: components must be finite`);
  }
  return value;
}

function requireMatrix(value, label = 'matrix') {
  if (!value || value.length !== 9) throw new TypeError(`${label}: expected a 3x3 matrix`);
  for (let index = 0; index < 9; index++) {
    if (!Number.isFinite(value[index])) throw new TypeError(`${label}: components must be finite`);
  }
  return value;
}

export function vec3(x = 0, y = 0, z = 0) {
  requireVector([x, y, z]);
  return Float64Array.of(x, y, z);
}

export function add(a, b) {
  requireVector(a, 'add: a');
  requireVector(b, 'add: b');
  return Float64Array.of(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
}

export function subtract(a, b) {
  requireVector(a, 'subtract: a');
  requireVector(b, 'subtract: b');
  return Float64Array.of(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export const sub = subtract;

export function scale(a, scalar) {
  requireVector(a, 'scale: vector');
  if (!Number.isFinite(scalar)) throw new TypeError('scale: scalar must be finite');
  return Float64Array.of(a[0] * scalar, a[1] * scalar, a[2] * scalar);
}

export function dot(a, b) {
  requireVector(a, 'dot: a');
  requireVector(b, 'dot: b');
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a, b) {
  requireVector(a, 'cross: a');
  requireVector(b, 'cross: b');
  return Float64Array.of(
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  );
}

export function norm(a) {
  requireVector(a, 'norm: vector');
  return Math.hypot(a[0], a[1], a[2]);
}

export function normalize(a) {
  const magnitude = norm(a);
  if (magnitude === 0) throw new RangeError('normalize: zero vector has no direction');
  return scale(a, 1 / magnitude);
}

export function matrixVector(matrix, vector) {
  requireMatrix(matrix, 'matrixVector: matrix');
  requireVector(vector, 'matrixVector: vector');
  return Float64Array.of(
    matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
    matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2],
    matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2]
  );
}

export const matVec = matrixVector;

export function transposeMatrixVector(matrix, vector) {
  requireMatrix(matrix, 'transposeMatrixVector: matrix');
  requireVector(vector, 'transposeMatrixVector: vector');
  return Float64Array.of(
    matrix[0] * vector[0] + matrix[3] * vector[1] + matrix[6] * vector[2],
    matrix[1] * vector[0] + matrix[4] * vector[1] + matrix[7] * vector[2],
    matrix[2] * vector[0] + matrix[5] * vector[1] + matrix[8] * vector[2]
  );
}

export const matTVec = transposeMatrixVector;

export function multiplyMatrices(a, b) {
  requireMatrix(a, 'multiplyMatrices: a');
  requireMatrix(b, 'multiplyMatrices: b');
  const result = new Float64Array(9);
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      result[row * 3 + column] = a[row * 3] * b[column]
        + a[row * 3 + 1] * b[3 + column]
        + a[row * 3 + 2] * b[6 + column];
    }
  }
  return result;
}

export const matMul = multiplyMatrices;

export function transposeMatrix(matrix) {
  requireMatrix(matrix, 'transposeMatrix: matrix');
  return Float64Array.of(
    matrix[0], matrix[3], matrix[6],
    matrix[1], matrix[4], matrix[7],
    matrix[2], matrix[5], matrix[8]
  );
}

export const identityMatrix = () => Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);
export const matIdentity = identityMatrix;

export function rotationX(angle) {
  if (!Number.isFinite(angle)) throw new TypeError('rotationX: angle must be finite');
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return Float64Array.of(1, 0, 0, 0, cosine, sine, 0, -sine, cosine);
}

export const matRotX = rotationX;

export function rotationY(angle) {
  if (!Number.isFinite(angle)) throw new TypeError('rotationY: angle must be finite');
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return Float64Array.of(cosine, 0, -sine, 0, 1, 0, sine, 0, cosine);
}

export const matRotY = rotationY;

export function rotationZ(angle) {
  if (!Number.isFinite(angle)) throw new TypeError('rotationZ: angle must be finite');
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return Float64Array.of(cosine, sine, 0, -sine, cosine, 0, 0, 0, 1);
}

export const matRotZ = rotationZ;

export function rotateX(vector, angle) {
  return matrixVector(rotationX(angle), vector);
}

export const rotx = rotateX;

export function rotateY(vector, angle) {
  return matrixVector(rotationY(angle), vector);
}

export const roty = rotateY;

export function rotateZ(vector, angle) {
  return matrixVector(rotationZ(angle), vector);
}

export const rotz = rotateZ;
