import { ttMinusUtc } from './scales.js';

const MS_PER_DAY = 86400000;
const SECONDS_PER_DAY = 86400;
const UNIX_EPOCH_JD = 2440587.5;
const VALID_SCALES = new Set(['utc', 'ut1', 'tt']);

function requireFinite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`AstroInstant: ${label} must be finite`);
  return value;
}

function parseOptions(options) {
  const dut1 = options?.dut1 ?? 0;
  requireFinite(dut1, 'dut1');
  if (Math.abs(dut1) > 0.9) {
    throw new RangeError('AstroInstant: dut1 must be within -0.9 and +0.9 seconds');
  }
  return { dut1 };
}

function normalizeParts(jd1, jd2) {
  requireFinite(jd1, 'jd1');
  requireFinite(jd2, 'jd2');
  const carry = Math.floor(jd2 + 0.5);
  return [jd1 + carry, jd2 - carry];
}

function millisecondsFromParts(jd1, jd2) {
  return (jd1 - UNIX_EPOCH_JD) * MS_PER_DAY + jd2 * MS_PER_DAY;
}

export class AstroInstant {
  constructor(jd1, jd2, utcMs, dut1 = 0) {
    this.jd1 = jd1;
    this.jd2 = jd2;
    this.utcMs = utcMs;
    this.dut1 = dut1;
    Object.freeze(this);
  }

  static from(value, options) {
    if (value instanceof AstroInstant) return value;
    if (value instanceof Date) return AstroInstant.fromDate(value, options);
    if (typeof value === 'string') return AstroInstant.fromISO(value, options);
    if (typeof value === 'number') return AstroInstant.fromUnixMs(value, options);
    throw new TypeError('AstroInstant.from: expected an AstroInstant, Date, ISO string, or Unix milliseconds');
  }

  static fromDate(date, options) {
    if (!(date instanceof Date)) throw new TypeError('AstroInstant.fromDate: expected a Date');
    return AstroInstant.fromUnixMs(date.getTime(), options);
  }

  static fromISO(iso, options) {
    if (typeof iso !== 'string' || iso.trim() === '') {
      throw new TypeError('AstroInstant.fromISO: expected a non-empty ISO string');
    }
    let value = iso.trim();
    if (/T/.test(value) && !/(?:Z|[+-]\d\d(?::?\d\d)?)$/i.test(value)) value += 'Z';
    return AstroInstant.fromUnixMs(Date.parse(value), options);
  }

  static fromUnixMs(ms, options) {
    requireFinite(ms, 'Unix milliseconds');
    const { dut1 } = parseOptions(options);
    const wholeDays = Math.floor(ms / MS_PER_DAY);
    const fraction = (ms - wholeDays * MS_PER_DAY) / MS_PER_DAY;
    const ttOffset = ttMinusUtc(ms) / SECONDS_PER_DAY;
    const [jd1, jd2] = normalizeParts(UNIX_EPOCH_JD + wholeDays, fraction + ttOffset);
    return new AstroInstant(jd1, jd2, ms, dut1);
  }

  static fromJD(jd, scale = 'tt', options) {
    return AstroInstant.fromJD2(jd, 0, scale, options);
  }

  static fromJD2(jd1, jd2, scale = 'tt', options) {
    requireFinite(jd1, 'jd1');
    requireFinite(jd2, 'jd2');
    if (!VALID_SCALES.has(scale)) throw new RangeError(`AstroInstant.fromJD: unknown scale '${scale}'`);
    const { dut1 } = parseOptions(options);
    let utcMs;
    if (scale === 'utc') {
      utcMs = millisecondsFromParts(jd1, jd2);
    } else if (scale === 'ut1') {
      utcMs = millisecondsFromParts(jd1, jd2) - dut1 * 1000;
    } else {
      const ttMs = millisecondsFromParts(jd1, jd2);
      let estimate = ttMs - ttMinusUtc(ttMs) * 1000;
      estimate = ttMs - ttMinusUtc(estimate) * 1000;
      utcMs = estimate;
    }
    requireFinite(utcMs, 'derived UTC milliseconds');
    if (scale === 'tt') {
      const [tt1, tt2] = normalizeParts(jd1, jd2);
      return new AstroInstant(tt1, tt2, utcMs, dut1);
    }
    return AstroInstant.fromUnixMs(utcMs, { dut1 });
  }

  jd(scale = 'tt') {
    const [jd1, jd2] = this.jd2parts(scale);
    return jd1 + jd2;
  }

  jd2parts(scale = 'tt') {
    if (!VALID_SCALES.has(scale)) throw new RangeError(`AstroInstant.jd: unknown scale '${scale}'`);
    if (scale === 'tt') return [this.jd1, this.jd2];
    const adjustedMs = scale === 'ut1' ? this.utcMs + this.dut1 * 1000 : this.utcMs;
    const wholeDays = Math.floor(adjustedMs / MS_PER_DAY);
    return [
      UNIX_EPOCH_JD + wholeDays,
      (adjustedMs - wholeDays * MS_PER_DAY) / MS_PER_DAY
    ];
  }

  julianCenturies() {
    return (this.jd1 - 2451545.0 + this.jd2) / 36525.0;
  }

  ttMinusUtc() {
    return ttMinusUtc(this.utcMs);
  }

  toDate() {
    return new Date(this.utcMs);
  }

  toISOString() {
    return this.toDate().toISOString();
  }

  addSeconds(seconds) {
    requireFinite(seconds, 'seconds');
    return AstroInstant.fromUnixMs(this.utcMs + seconds * 1000, { dut1: this.dut1 });
  }

  addDays(days) {
    requireFinite(days, 'days');
    return this.addSeconds(days * SECONDS_PER_DAY);
  }

  differenceSeconds(other) {
    const instant = AstroInstant.from(other);
    return (this.jd1 - instant.jd1 + this.jd2 - instant.jd2) * SECONDS_PER_DAY;
  }
}

export const timeConstants = Object.freeze({
  MS_PER_DAY,
  SECONDS_PER_DAY,
  UNIX_EPOCH_JD
});
