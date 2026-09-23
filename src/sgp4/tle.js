import { AstroInstant } from '../time/index.js';
import {
  computeTleChecksum,
  normalizeOmm,
  normalizeTleInput,
  parseCatalogNumber,
  parseImpliedDecimal,
  parseOmmRecord,
  parseTleRecord,
  tleChecksumStatus,
  tleRecordToOmm,
  validateTleChecksum
} from './parser.js';

function structuredElements(record) {
  return Object.freeze({
    sourceFormat: record.sourceFormat,
    name: record.name,
    catalogNumber: record.catalogNumber,
    classification: record.classification,
    internationalDesignator: record.internationalDesignator,
    epoch: AstroInstant.fromUnixMs(record.epochUnixMs),
    epochYear: record.epochYear,
    epochDay: record.epochDay,
    meanMotionDot: record.meanMotionDot,
    meanMotionDdot: record.meanMotionDdot,
    bstar: record.bstar,
    ephemerisType: record.ephemerisType,
    elementSetNumber: record.elementSetNumber,
    inclination: record.inclination,
    rightAscension: record.rightAscension,
    eccentricity: record.eccentricity,
    argumentOfPerigee: record.argumentOfPerigee,
    meanAnomaly: record.meanAnomaly,
    meanMotionRevPerDay: record.meanMotionRevPerDay,
    meanMotion: record.meanMotion,
    revolutionsAtEpoch: record.revolutionsAtEpoch,
    checksums: record.checksums,
    elementType: record.elementType,
    bstarType: record.bstarType,
    gravityModel: record.gravityModel
  });
}

export function parseTle(input, options) {
  return structuredElements(parseTleRecord(input, options));
}

export function parseOmm(input) {
  return structuredElements(parseOmmRecord(input));
}

export function tleToOmm(input, options) {
  if (options !== undefined && (!options || typeof options !== 'object' || Array.isArray(options))) {
    throw new TypeError('sgp4: TLE-to-OMM options must be an object');
  }
  const { validateChecksum = false, creationDate, fractionDigits } = options ?? {};
  for (const key of Object.keys(options ?? {})) {
    if (!['validateChecksum', 'creationDate', 'fractionDigits'].includes(key)) {
      throw new RangeError(`sgp4: unknown TLE-to-OMM option '${key}'`);
    }
  }
  return tleRecordToOmm(
    parseTleRecord(input, { validateChecksum }),
    {
      ...(creationDate === undefined ? {} : { creationDate }),
      ...(fractionDigits === undefined ? {} : { fractionDigits })
    }
  );
}

export {
  computeTleChecksum,
  normalizeOmm,
  normalizeTleInput,
  parseCatalogNumber,
  parseImpliedDecimal,
  tleChecksumStatus,
  validateTleChecksum
};
