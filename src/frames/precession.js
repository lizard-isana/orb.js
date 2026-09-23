import { ARCSEC } from './angles.js';
import { multiplyMatrices, rotationX, rotationZ } from './vector.js';
import { meanObliquity2006, nutation2000B } from './nutation.js';

export function precessionAngles2006(instant) {
  if (!instant || typeof instant.julianCenturies !== 'function') {
    throw new TypeError('precessionAngles2006: expected an AstroInstant');
  }
  const t = instant.julianCenturies();
  const gamb = (-0.052928
    + (10.556378
      + (0.4932044
        + (-0.00031238
          + (-0.000002788
            + 0.0000000260 * t) * t) * t) * t) * t) * ARCSEC;
  const phib = (84381.412819
    + (-46.811016
      + (0.0511268
        + (0.00053289
          + (-0.000000440
            - 0.0000000176 * t) * t) * t) * t) * t) * ARCSEC;
  const psib = (-0.041775
    + (5038.481484
      + (1.5584175
        + (-0.00018522
          + (-0.000026452
            - 0.0000000148 * t) * t) * t) * t) * t) * ARCSEC;
  return { gamb, phib, psib, epsa: meanObliquity2006(instant) };
}

export const precessionAngles = precessionAngles2006;

export function precessionMatrix2006(instant) {
  const { gamb, phib, psib, epsa } = precessionAngles2006(instant);
  return multiplyMatrices(
    rotationX(-epsa),
    multiplyMatrices(rotationZ(-psib), multiplyMatrices(rotationX(phib), rotationZ(gamb)))
  );
}

export const precessionMatrix = precessionMatrix2006;

export function nutationMatrix2000B(instant) {
  const { dpsi, deps } = nutation2000B(instant);
  const epsa = meanObliquity2006(instant);
  return multiplyMatrices(
    rotationX(-(epsa + deps)),
    multiplyMatrices(rotationZ(-dpsi), rotationX(epsa))
  );
}

export const nutationMatrix = nutationMatrix2000B;

export function precessionNutationMatrix(instant) {
  return multiplyMatrices(nutationMatrix2000B(instant), precessionMatrix2006(instant));
}
