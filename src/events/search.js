// search.js — root finding over time for astronomical events.
//
//#region edu:event-search
// Every "event" in this library — rise, set, culmination, moon phase,
// satellite pass — is the same mathematical problem: find where some
// smooth function of time crosses zero (elevation minus horizon,
// elongation minus 90 degrees, ...). So there is one searcher:
//
//   1. sample the function on a coarse grid and look for sign changes,
//   2. shrink each bracket by bisection until the time is pinned to
//      well under a second.
//
// Bisection is deliberately chosen over faster methods: it cannot
// diverge, needs no derivative, and 25 halvings of a 10-minute bracket
// already reach ~1 ms. The step size is the only knob that matters —
// it must be shorter than half the shortest feature you want to catch
// (a satellite pass can be 4 minutes wide; a moonrise is hours from
// the next event).
//#endregion

// f: (Instant) -> number. Returns [{ t, direction }] for each zero
// crossing; direction +1 for rising through zero, -1 for falling.
export const findCrossings = (f, from, to, stepSeconds) => {
  const out = [];
  let t0 = from;
  let f0 = f(t0);
  while (t0.utcMs < to.utcMs) {
    let t1 = t0.addSeconds(stepSeconds);
    if (t1.utcMs > to.utcMs) t1 = to;
    const f1 = f(t1);
    if ((f0 < 0 && f1 >= 0) || (f0 >= 0 && f1 < 0)) {
      let lo = t0, hi = t1, flo = f0;
      for (let i = 0; i < 30; i++) {
        const mid = lo.addSeconds((hi.utcMs - lo.utcMs) / 2000);
        const fm = f(mid);
        if ((flo < 0) === (fm < 0)) { lo = mid; flo = fm; } else { hi = mid; }
      }
      out.push({ t: hi, direction: f1 >= f0 ? 1 : -1 });
    }
    t0 = t1;
    f0 = f1;
    if (t1 === to) break;
  }
  return out;
};

// Maximum of f in [from, to] by golden-section search on a bracket
// around the coarse-grid peak. Good enough for pass culminations.
export const findMaximum = (f, from, to, stepSeconds) => {
  let best = from, bestV = f(from);
  for (let t = from; t.utcMs <= to.utcMs; t = t.addSeconds(stepSeconds)) {
    const v = f(t);
    if (v > bestV) { best = t; bestV = v; }
  }
  let lo = best.addSeconds(-stepSeconds), hi = best.addSeconds(stepSeconds);
  for (let i = 0; i < 40; i++) {
    const m1 = lo.addSeconds((hi.utcMs - lo.utcMs) * 0.382 / 1000);
    const m2 = lo.addSeconds((hi.utcMs - lo.utcMs) * 0.618 / 1000);
    if (f(m1) < f(m2)) lo = m1; else hi = m2;
  }
  const t = lo.addSeconds((hi.utcMs - lo.utcMs) / 2000);
  return { t, value: f(t) };
};
