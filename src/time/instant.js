// instant.js — the single time type used throughout orb.js v4.
//
// Every public function in the library takes an Instant. Raw Date objects
// and bare Julian-date numbers are converted once, at the boundary, and
// never passed around internally. Two v3 bugs motivated this rule:
// Date.UTC() silently truncates fractional seconds, and a Julian date in
// one double loses sub-millisecond precision — both produced real
// position errors before they were found.
//
//#region edu:two-part-jd
// Internal representation: a Julian date in TT, split into two doubles
// (jd1 + jd2). A single double holding ~2.46 million days has a machine
// epsilon of about 20 microseconds; splitting the value into a large
// integer-ish part and a small fractional part keeps the resolution far
// below a microsecond. The same trick is used by SOFA/ERFA and
// python-sgp4.
//#endregion

import { ttMinusUtc } from './scales.js';

const MS_PER_DAY = 86400000;
const UNIX_EPOCH_JD = 2440587.5; // JD of 1970-01-01T00:00:00 UTC

export class Instant {
  // Do not call directly; use the static constructors below.
  constructor(jd1, jd2, utcMs) {
    this.jd1 = jd1;       // TT Julian date, major part
    this.jd2 = jd2;       // TT Julian date, minor part
    this.utcMs = utcMs;   // original UTC epoch in ms (exact round-trip)
    Object.freeze(this);
  }

  // From a JavaScript Date (or anything with getTime). The Date's absolute
  // instant is used — the host timezone plays no role.
  static fromDate(date) {
    return Instant.fromUnixMs(date.getTime());
  }

  // From a UTC Unix epoch in milliseconds.
  static fromUnixMs(ms) {
    if (!Number.isFinite(ms)) {
      throw new TypeError('Instant: invalid date');
    }
    // Split so that jd2 stays below ~1: the whole days go into jd1 and
    // only the fraction of a day (plus the small TT offset) into jd2.
    // With jd2 of order 1 the representable resolution is ~1e-16 day,
    // i.e. about 10 picoseconds.
    const wholeDays = Math.floor(ms / MS_PER_DAY);
    const frac = (ms - wholeDays * MS_PER_DAY) / MS_PER_DAY;
    const dtt = ttMinusUtc(ms) / 86400; // days
    return new Instant(UNIX_EPOCH_JD + wholeDays, frac + dtt, ms);
  }

  // From an ISO 8601 string, e.g. "2026-07-18T12:00:00Z". Interpreted by
  // the Date parser; strings without an offset are taken as UTC, so always
  // include the trailing "Z" (or an explicit offset) to avoid ambiguity.
  static fromISO(iso) {
    let s = String(iso);
    // Date-time strings without timezone are parsed as LOCAL time by
    // ECMA-262; force UTC unless an offset is present.
    if (/T/.test(s) && !/(Z|[+-]\d\d:?\d\d)$/.test(s)) {
      s += 'Z';
    }
    return Instant.fromUnixMs(Date.parse(s));
  }

  // From a Julian date. scale: 'tt' (default) or 'utc'.
  static fromJD(jd, scale = 'tt') {
    return Instant.fromJD2(jd, 0.0, scale);
  }

  static fromJD2(jd1, jd2, scale = 'tt') {
    if (scale === 'utc') {
      const ms = (jd1 - UNIX_EPOCH_JD + jd2) * MS_PER_DAY;
      return Instant.fromUnixMs(ms);
    }
    if (scale !== 'tt') {
      throw new RangeError('Instant.fromJD: unknown scale ' + scale);
    }
    // Recover the UTC epoch. TT-UTC itself depends on the (UTC) date, but
    // it only changes at day boundaries and by whole seconds, so using the
    // TT value as the first guess and refining once converges.
    let ms = (jd1 - UNIX_EPOCH_JD + jd2) * MS_PER_DAY;
    ms -= ttMinusUtc(ms) * 1000;
    ms = (jd1 - UNIX_EPOCH_JD + jd2) * MS_PER_DAY - ttMinusUtc(ms) * 1000;
    return new Instant(jd1, jd2, ms);
  }

  // Julian date in the requested timescale, as a single number.
  // 'ut1' is approximated by UTC (|UT1-UTC| < 0.9 s by construction of UTC).
  jd(scale = 'tt') {
    const [a, b] = this.jd2parts(scale);
    return a + b;
  }

  // Two-part Julian date [major, minor] for precision-sensitive consumers.
  jd2parts(scale = 'tt') {
    if (scale === 'tt') {
      return [this.jd1, this.jd2];
    }
    if (scale === 'utc' || scale === 'ut1') {
      const wholeDays = Math.floor(this.utcMs / MS_PER_DAY);
      return [UNIX_EPOCH_JD + wholeDays, (this.utcMs - wholeDays * MS_PER_DAY) / MS_PER_DAY];
    }
    throw new RangeError('Instant.jd: unknown scale ' + scale);
  }

  // Julian centuries of TT since J2000.0 — the time argument of most
  // ephemeris series (precession, nutation, solar and lunar theories).
  julianCenturies() {
    return (this.jd1 - 2451545.0 + this.jd2) / 36525.0;
  }

  ttMinusUtc() {
    return ttMinusUtc(this.utcMs);
  }

  toDate() {
    return new Date(this.utcMs);
  }

  // A new Instant offset by the given amount. Useful for search loops
  // (rise/set, satellite passes).
  addSeconds(sec) {
    return Instant.fromUnixMs(this.utcMs + sec * 1000);
  }

  addDays(days) {
    return Instant.fromUnixMs(this.utcMs + days * MS_PER_DAY);
  }
}
