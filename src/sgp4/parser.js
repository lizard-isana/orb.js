const ALPHA5_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DEG = Math.PI / 180;
const MINUTES_PER_DAY = 1440;
const MS_PER_DAY = 86400000;

function fail(message, ErrorType = RangeError) {
  throw new ErrorType(`sgp4: ${message}`);
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`, TypeError);
  }
  return value;
}

function finiteNumber(value, label) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) {
    fail(`${label} must be a finite number`, TypeError);
  }
  return Number(value);
}

function boundedNumber(value, minimum, maximum, label, maximumInclusive = true) {
  const number = finiteNumber(value, label);
  if (number < minimum || (maximumInclusive ? number > maximum : number >= maximum)) {
    const upper = maximumInclusive ? '<=' : '<';
    fail(`${label} must satisfy ${minimum} <= value ${upper} ${maximum}`);
  }
  return number;
}

function integer(value, label, fallback) {
  if ((value === undefined || value === null || value === '') && fallback !== undefined) {
    return fallback;
  }
  const number = finiteNumber(value, label);
  if (!Number.isInteger(number)) fail(`${label} must be an integer`);
  return number;
}

export function parseCatalogNumber(value) {
  const text = String(value === null || value === undefined ? '' : value).trim();
  if (text.length === 0) return NaN;
  const alpha5 = text.toUpperCase();
  if (/^[A-HJ-NP-Z][0-9]{4}$/.test(alpha5)) {
    const letterIndex = ALPHA5_LETTERS.indexOf(alpha5[0]);
    if (letterIndex >= 0) return (letterIndex + 10) * 10000 + Number(alpha5.slice(1));
  }
  if (/^[0-9]+$/.test(text)) return Number(text);
  return NaN;
}

function requireTleCatalogNumber(value, label) {
  const number = parseCatalogNumber(value);
  if (!Number.isInteger(number) || number < 0 || number > 339999) {
    fail(`${label} is not a numeric or Alpha-5 catalogue number`);
  }
  return number;
}

function requireOmmCatalogNumber(value, label) {
  const text = String(value === null || value === undefined ? '' : value).trim();
  if (!/^[0-9]{1,9}$/.test(text)) {
    fail(`${label} must be an integer catalogue number with at most 9 digits`);
  }
  const number = Number(text);
  if (!Number.isSafeInteger(number)) fail(`${label} must be a safe integer catalogue number`);
  return number;
}

const OMM_ELEMENT_KEYS = Object.freeze([
  'EPOCH',
  'NORAD_CAT_ID',
  'MEAN_MOTION',
  'ECCENTRICITY',
  'INCLINATION',
  'RA_OF_ASC_NODE',
  'ARG_OF_PERICENTER',
  'MEAN_ANOMALY'
]);

export function isOmmLike(input) {
  return Boolean(input && typeof input === 'object' && !Array.isArray(input)
    && (input.CCSDS_OMM_VERS !== undefined
      || OMM_ELEMENT_KEYS.every((key) => input[key] !== undefined)));
}

export function parseImpliedDecimal(mantissa, exponent) {
  const mantissaText = String(mantissa);
  const exponentText = String(exponent);
  if (!/^[ +-][0-9]{5}$/.test(mantissaText)) {
    fail(`invalid implied-decimal mantissa '${mantissaText}'`);
  }
  if (!/^[+-][0-9]$/.test(exponentText)) {
    fail(`invalid implied-decimal exponent '${exponentText}'`);
  }
  return Number(mantissaText) * 1e-5 * 10 ** Number(exponentText);
}

export function normalizeTleInput(input) {
  requireObject(input, 'TLE');
  const firstLine = input.first_line;
  const secondLine = input.second_line;
  const line1 = input.line1 ?? firstLine;
  const line2 = input.line2 ?? secondLine;
  if (input.line1 !== undefined && firstLine !== undefined && input.line1 !== firstLine) {
    fail('line1 and first_line disagree');
  }
  if (input.line2 !== undefined && secondLine !== undefined && input.line2 !== secondLine) {
    fail('line2 and second_line disagree');
  }
  if (typeof line1 !== 'string' || typeof line2 !== 'string') {
    fail('TLE must provide string line1/line2 or first_line/second_line', TypeError);
  }
  if (line1.length < 69) fail('TLE line 1 must contain at least 69 columns');
  if (line2.length < 69) fail('TLE line 2 must contain at least 69 columns');
  if (line1[0] !== '1') fail("TLE line 1 must start with '1'");
  if (line2[0] !== '2') fail("TLE line 2 must start with '2'");
  return Object.freeze({
    name: input.name ?? null,
    line1,
    line2
  });
}

export function computeTleChecksum(line) {
  if (typeof line !== 'string' || line.length < 68) {
    fail('checksum requires at least the first 68 TLE columns', TypeError);
  }
  let sum = 0;
  for (const character of line.slice(0, 68)) {
    if (character >= '0' && character <= '9') sum += Number(character);
    else if (character === '-') sum += 1;
  }
  return sum % 10;
}

function checksumForLine(line) {
  const expected = computeTleChecksum(line);
  const character = line[68];
  const actual = /^[0-9]$/.test(character) ? Number(character) : null;
  return Object.freeze({ expected, actual, valid: actual === expected });
}

export function tleChecksumStatus(input) {
  const tle = normalizeTleInput(input);
  return Object.freeze({
    line1: checksumForLine(tle.line1),
    line2: checksumForLine(tle.line2)
  });
}

export function validateTleChecksum(input) {
  const status = tleChecksumStatus(input);
  for (const lineNumber of [1, 2]) {
    const result = status[`line${lineNumber}`];
    if (!result.valid) {
      fail(`TLE line ${lineNumber} checksum mismatch: expected ${result.expected}, got ${result.actual ?? 'none'}`);
    }
  }
  return true;
}

function numericField(text, pattern, label) {
  if (!pattern.test(text)) fail(`invalid ${label} field '${text}'`);
  return finiteNumber(text, label);
}

function parseInternationalDesignator(text) {
  const compact = text.trim();
  if (compact === '') return null;
  if (!/^[0-9]{5}[A-Z0-9]{0,3}$/i.test(compact)) {
    fail(`invalid international designator '${text}'`);
  }
  const shortYear = Number(compact.slice(0, 2));
  const year = shortYear < 57 ? shortYear + 2000 : shortYear + 1900;
  return `${year}-${compact.slice(2)}`;
}

function daysInYear(year) {
  return new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1 ? 366 : 365;
}

function epochFromTle(line1) {
  const yearText = line1.slice(18, 20);
  const dayText = line1.slice(20, 32);
  if (!/^[0-9]{2}$/.test(yearText)) fail(`invalid epoch year '${yearText}'`);
  const shortYear = Number(yearText);
  const year = shortYear < 57 ? 2000 + shortYear : 1900 + shortYear;
  const day = numericField(dayText, /^[0-9]{3}\.[0-9]{8}$/, 'epoch day');
  if (day < 1 || day >= daysInYear(year) + 1) fail(`epoch day ${day} is outside year ${year}`);
  return {
    epochYear: year,
    epochDay: day,
    epochUnixMs: Date.UTC(year, 0, 1) + (day - 1) * MS_PER_DAY
  };
}

function parseTleOptions(options) {
  if (options === undefined) return { validateChecksum: false };
  requireObject(options, 'TLE options');
  for (const key of Object.keys(options)) {
    if (key !== 'validateChecksum') fail(`unknown TLE option '${key}'`);
  }
  const validateChecksum = options.validateChecksum ?? false;
  if (typeof validateChecksum !== 'boolean') {
    fail('validateChecksum must be boolean', TypeError);
  }
  return { validateChecksum };
}

export function parseTleRecord(input, options) {
  const tle = normalizeTleInput(input);
  const parsedOptions = parseTleOptions(options);
  if (parsedOptions.validateChecksum) validateTleChecksum(tle);
  const catalogNumber1 = requireTleCatalogNumber(tle.line1.slice(2, 7), 'TLE line 1 catalogue number');
  const catalogNumber2 = requireTleCatalogNumber(tle.line2.slice(2, 7), 'TLE line 2 catalogue number');
  if (catalogNumber1 !== catalogNumber2) {
    fail(`TLE catalogue numbers do not match (${catalogNumber1} !== ${catalogNumber2})`);
  }
  const epoch = epochFromTle(tle.line1);
  const inclinationDeg = boundedNumber(
    numericField(tle.line2.slice(8, 16), /^ *[0-9]{1,3}\.[0-9]{4}$/, 'inclination'),
    0,
    180,
    'inclination'
  );
  const rightAscensionDeg = boundedNumber(
    numericField(tle.line2.slice(17, 25), /^ *[0-9]{1,3}\.[0-9]{4}$/, 'right ascension'),
    0,
    360,
    'right ascension',
    false
  );
  const eccentricityText = tle.line2.slice(26, 33);
  if (!/^[0-9]{7}$/.test(eccentricityText)) {
    fail(`invalid eccentricity field '${eccentricityText}'`);
  }
  const eccentricity = Number(`0.${eccentricityText}`);
  const argumentOfPerigeeDeg = boundedNumber(
    numericField(tle.line2.slice(34, 42), /^ *[0-9]{1,3}\.[0-9]{4}$/, 'argument of perigee'),
    0,
    360,
    'argument of perigee',
    false
  );
  const meanAnomalyDeg = boundedNumber(
    numericField(tle.line2.slice(43, 51), /^ *[0-9]{1,3}\.[0-9]{4}$/, 'mean anomaly'),
    0,
    360,
    'mean anomaly',
    false
  );
  const meanMotionRevPerDay = numericField(
    tle.line2.slice(52, 63),
    /^ *[0-9]{1,2}\.[0-9]{8}$/,
    'mean motion'
  );
  if (!(meanMotionRevPerDay > 0)) fail('mean motion must be positive');
  const checksums = tleChecksumStatus(tle);

  return Object.freeze({
    sourceFormat: 'tle',
    name: tle.name,
    line1: tle.line1,
    line2: tle.line2,
    catalogNumber: catalogNumber1,
    classification: tle.line1.slice(7, 8),
    internationalDesignator: parseInternationalDesignator(tle.line1.slice(9, 17)),
    legacyInternationalDesignator: (() => {
      const raw = tle.line1.slice(9, 18);
      const shortYear = Number(raw.slice(0, 2));
      const century = shortYear < 58 ? '20' : '19';
      return `${century}${raw.slice(0, 2)}-${raw.slice(2, 7)}`;
    })(),
    ...epoch,
    meanMotionDot: numericField(
      tle.line1.slice(33, 43),
      /^[ +-]\.[0-9]{8}$/,
      'mean motion first derivative'
    ),
    meanMotionDdot: parseImpliedDecimal(tle.line1.slice(44, 50), tle.line1.slice(50, 52)),
    bstar: parseImpliedDecimal(tle.line1.slice(53, 59), tle.line1.slice(59, 61)),
    ephemerisType: integer(tle.line1.slice(62, 63).trim() || 0, 'ephemeris type'),
    elementSetNumber: integer(tle.line1.slice(64, 68).trim() || 0, 'element set number'),
    inclination: inclinationDeg * DEG,
    inclinationDeg,
    rightAscension: rightAscensionDeg * DEG,
    rightAscensionDeg,
    eccentricity,
    argumentOfPerigee: argumentOfPerigeeDeg * DEG,
    argumentOfPerigeeDeg,
    meanAnomaly: meanAnomalyDeg * DEG,
    meanAnomalyDeg,
    meanMotionRevPerDay,
    meanMotion: meanMotionRevPerDay * 2 * Math.PI / MINUTES_PER_DAY,
    revolutionsAtEpoch: integer(tle.line2.slice(63, 68).trim() || 0, 'revolutions at epoch'),
    checksums,
    elementType: 'sgp4-mean-elements',
    bstarType: 'sgp4-drag-term',
    gravityModel: 'wgs72'
  });
}

function parseUtcEpoch(value) {
  if (typeof value !== 'string') fail('OMM EPOCH must be an ISO string', TypeError);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z)?$/.exec(value.trim());
  if (!match) fail(`invalid OMM EPOCH '${value}'`);
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = ''] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    fail(`invalid OMM EPOCH '${value}'`);
  }
  const whole = Date.UTC(year, month - 1, day, hour, minute, second);
  const date = new Date(whole);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    fail(`invalid OMM EPOCH '${value}'`);
  }
  const fractionalMilliseconds = fraction === '' ? 0 : Number(`0.${fraction}`) * 1000;
  return whole + fractionalMilliseconds;
}

function requireOmmConvention(omm, key, expected) {
  if (omm[key] !== undefined && String(omm[key]).toUpperCase() !== expected) {
    fail(`OMM ${key} must be '${expected}'`);
  }
}

export function normalizeOmm(input) {
  const omm = requireObject(input, 'OMM');
  if (!isOmmLike(omm)) {
    fail('OMM must provide CCSDS_OMM_VERS or the complete CelesTrak GP JSON element fields');
  }
  requireOmmConvention(omm, 'CENTER_NAME', 'EARTH');
  requireOmmConvention(omm, 'REF_FRAME', 'TEME');
  requireOmmConvention(omm, 'TIME_SYSTEM', 'UTC');
  requireOmmConvention(omm, 'MEAN_ELEMENT_THEORY', 'SGP4');
  const catalogNumber = requireOmmCatalogNumber(omm.NORAD_CAT_ID, 'OMM NORAD_CAT_ID');
  parseUtcEpoch(omm.EPOCH);
  const eccentricity = boundedNumber(omm.ECCENTRICITY, 0, 1, 'OMM ECCENTRICITY', false);
  const inclinationDeg = boundedNumber(omm.INCLINATION, 0, 180, 'OMM INCLINATION');
  const rightAscensionDeg = boundedNumber(omm.RA_OF_ASC_NODE, 0, 360, 'OMM RA_OF_ASC_NODE', false);
  const argumentOfPerigeeDeg = boundedNumber(omm.ARG_OF_PERICENTER, 0, 360, 'OMM ARG_OF_PERICENTER', false);
  const meanAnomalyDeg = boundedNumber(omm.MEAN_ANOMALY, 0, 360, 'OMM MEAN_ANOMALY', false);
  const meanMotionRevPerDay = finiteNumber(omm.MEAN_MOTION, 'OMM MEAN_MOTION');
  if (!(meanMotionRevPerDay > 0)) fail('OMM MEAN_MOTION must be positive');

  return Object.freeze({
    ...omm,
    CCSDS_OMM_VERS: String(omm.CCSDS_OMM_VERS ?? '2.0'),
    OBJECT_NAME: omm.OBJECT_NAME ?? null,
    OBJECT_ID: omm.OBJECT_ID ?? null,
    CENTER_NAME: 'EARTH',
    REF_FRAME: 'TEME',
    TIME_SYSTEM: 'UTC',
    MEAN_ELEMENT_THEORY: 'SGP4',
    EPOCH: omm.EPOCH,
    NORAD_CAT_ID: catalogNumber,
    CLASSIFICATION_TYPE: omm.CLASSIFICATION_TYPE ?? 'U',
    MEAN_MOTION: meanMotionRevPerDay,
    ECCENTRICITY: eccentricity,
    INCLINATION: inclinationDeg,
    RA_OF_ASC_NODE: rightAscensionDeg,
    ARG_OF_PERICENTER: argumentOfPerigeeDeg,
    MEAN_ANOMALY: meanAnomalyDeg,
    EPHEMERIS_TYPE: integer(omm.EPHEMERIS_TYPE, 'OMM EPHEMERIS_TYPE', 0),
    ELEMENT_SET_NO: integer(omm.ELEMENT_SET_NO, 'OMM ELEMENT_SET_NO', 0),
    REV_AT_EPOCH: integer(omm.REV_AT_EPOCH, 'OMM REV_AT_EPOCH', 0),
    BSTAR: finiteNumber(omm.BSTAR ?? 0, 'OMM BSTAR'),
    MEAN_MOTION_DOT: finiteNumber(omm.MEAN_MOTION_DOT ?? 0, 'OMM MEAN_MOTION_DOT'),
    MEAN_MOTION_DDOT: finiteNumber(omm.MEAN_MOTION_DDOT ?? 0, 'OMM MEAN_MOTION_DDOT')
  });
}

export function parseOmmRecord(input) {
  const sourceFormat = input.CCSDS_OMM_VERS === undefined
    ? 'celestrak-gp-json'
    : 'omm';
  const omm = normalizeOmm(input);
  const epochUnixMs = parseUtcEpoch(omm.EPOCH);
  return Object.freeze({
    sourceFormat,
    name: omm.OBJECT_NAME,
    line1: omm.USER_DEFINED_TLE_LINE1 ?? null,
    line2: omm.USER_DEFINED_TLE_LINE2 ?? null,
    catalogNumber: omm.NORAD_CAT_ID,
    classification: omm.CLASSIFICATION_TYPE,
    internationalDesignator: omm.OBJECT_ID,
    legacyInternationalDesignator: omm.OBJECT_ID,
    epochYear: new Date(epochUnixMs).getUTCFullYear(),
    epochDay: null,
    epochUnixMs,
    meanMotionDot: omm.MEAN_MOTION_DOT,
    meanMotionDdot: omm.MEAN_MOTION_DDOT,
    bstar: omm.BSTAR,
    ephemerisType: omm.EPHEMERIS_TYPE,
    elementSetNumber: omm.ELEMENT_SET_NO,
    inclination: omm.INCLINATION * DEG,
    inclinationDeg: omm.INCLINATION,
    rightAscension: omm.RA_OF_ASC_NODE * DEG,
    rightAscensionDeg: omm.RA_OF_ASC_NODE,
    eccentricity: omm.ECCENTRICITY,
    argumentOfPerigee: omm.ARG_OF_PERICENTER * DEG,
    argumentOfPerigeeDeg: omm.ARG_OF_PERICENTER,
    meanAnomaly: omm.MEAN_ANOMALY * DEG,
    meanAnomalyDeg: omm.MEAN_ANOMALY,
    meanMotionRevPerDay: omm.MEAN_MOTION,
    meanMotion: omm.MEAN_MOTION * 2 * Math.PI / MINUTES_PER_DAY,
    revolutionsAtEpoch: omm.REV_AT_EPOCH,
    checksums: null,
    elementType: 'sgp4-mean-elements',
    bstarType: 'sgp4-drag-term',
    gravityModel: 'wgs72',
    omm
  });
}

function formatCreationDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) fail('creationDate must be a valid Date', TypeError);
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function formatEpoch(epochUnixMs, fractionDigits, truncateFraction) {
  const wholeMilliseconds = Math.floor(epochUnixMs);
  let secondStart = Math.floor(wholeMilliseconds / 1000) * 1000;
  if (fractionDigits === 0) return new Date(secondStart).toISOString().slice(0, 19);
  const secondsFraction = (epochUnixMs - Math.floor(epochUnixMs / 1000) * 1000) / 1000;
  const scale = 10 ** fractionDigits;
  let units = truncateFraction
    ? Math.floor(secondsFraction * scale + 1e-7)
    : Math.round(secondsFraction * scale);
  if (units === scale) {
    secondStart += 1000;
    units = 0;
  }
  const secondBase = new Date(secondStart).toISOString().slice(0, 19);
  const fraction = String(units)
    .padStart(fractionDigits, '0');
  return `${secondBase}.${fraction}`;
}

export function tleRecordToOmm(record, options = {}) {
  requireObject(record, 'TLE record');
  requireObject(options, 'TLE-to-OMM options');
  for (const key of Object.keys(options)) {
    if (key !== 'creationDate' && key !== 'fractionDigits'
        && key !== 'truncateFraction' && key !== 'legacyFormatting') {
      fail(`unknown TLE-to-OMM option '${key}'`);
    }
  }
  const fractionDigits = options.fractionDigits ?? 6;
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 9) {
    fail('fractionDigits must be an integer between 0 and 9');
  }
  const truncateFraction = options.truncateFraction ?? false;
  if (typeof truncateFraction !== 'boolean') {
    fail('truncateFraction must be boolean', TypeError);
  }
  const legacyFormatting = options.legacyFormatting ?? false;
  if (typeof legacyFormatting !== 'boolean') {
    fail('legacyFormatting must be boolean', TypeError);
  }
  const name = record.name ?? 'N/A';
  const result = {
    CCSDS_OMM_VERS: '2.0',
    COMMENT: 'GENERATED VIA ORB.JS',
    ORIGINATOR: '',
    OBJECT_NAME: name,
    OBJECT_ID: legacyFormatting
      ? record.legacyInternationalDesignator ?? ''
      : record.internationalDesignator ?? '',
    CENTER_NAME: 'EARTH',
    REF_FRAME: 'TEME',
    TIME_SYSTEM: 'UTC',
    MEAN_ELEMENT_THEORY: 'SGP4',
    EPOCH: formatEpoch(record.epochUnixMs, fractionDigits, truncateFraction),
    MEAN_MOTION: record.meanMotionRevPerDay,
    ECCENTRICITY: record.eccentricity,
    INCLINATION: record.inclinationDeg,
    RA_OF_ASC_NODE: record.rightAscensionDeg,
    ARG_OF_PERICENTER: record.argumentOfPerigeeDeg,
    MEAN_ANOMALY: record.meanAnomalyDeg,
    EPHEMERIS_TYPE: record.ephemerisType,
    CLASSIFICATION_TYPE: record.classification,
    NORAD_CAT_ID: record.catalogNumber,
    ELEMENT_SET_NO: record.elementSetNumber,
    REV_AT_EPOCH: record.revolutionsAtEpoch,
    BSTAR: record.bstar,
    MEAN_MOTION_DOT: record.meanMotionDot,
    MEAN_MOTION_DDOT: record.meanMotionDdot,
    USER_DEFINED_TLE_LINE0: `0 ${name}`,
    USER_DEFINED_TLE_LINE1: record.line1,
    USER_DEFINED_TLE_LINE2: record.line2
  };
  if (options.creationDate !== undefined) {
    result.CREATION_DATE = formatCreationDate(options.creationDate);
  }
  return Object.freeze(result);
}
