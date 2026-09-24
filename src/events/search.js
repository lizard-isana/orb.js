const SEARCH_OPTION_KEYS = new Set([
  'stepSeconds',
  'toleranceSeconds',
  'maxIterations',
  'maxEvaluations'
]);

export const SEARCH_LIMITS = Object.freeze({
  minimumStepSeconds: 0.001,
  maximumStepSeconds: 86400,
  minimumToleranceSeconds: 0.000001,
  maximumToleranceSeconds: 3600,
  maximumIterations: 128,
  maximumEvaluations: 1000000
});

function requireInstant(value, label) {
  if (!value || typeof value.addSeconds !== 'function'
      || typeof value.differenceSeconds !== 'function'
      || !Number.isFinite(value.utcMs)) {
    throw new TypeError(`events: ${label} must be an AstroInstant`);
  }
  return value;
}

function requireFinite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`events: ${label} must be finite`);
  return value;
}

function requireBounded(value, minimum, maximum, label) {
  requireFinite(value, label);
  if (value < minimum || value > maximum) {
    throw new RangeError(`events: ${label} must be between ${minimum} and ${maximum}`);
  }
  return value;
}

function requireInteger(value, minimum, maximum, label) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`events: ${label} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

export function parseSearchOptions(options = {}, defaults = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('events: search options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!SEARCH_OPTION_KEYS.has(key)) throw new RangeError(`events: unknown search option '${key}'`);
  }
  const stepSeconds = requireBounded(
    options.stepSeconds ?? defaults.stepSeconds ?? 600,
    SEARCH_LIMITS.minimumStepSeconds,
    SEARCH_LIMITS.maximumStepSeconds,
    'stepSeconds'
  );
  const toleranceSeconds = requireBounded(
    options.toleranceSeconds ?? defaults.toleranceSeconds ?? 0.1,
    SEARCH_LIMITS.minimumToleranceSeconds,
    SEARCH_LIMITS.maximumToleranceSeconds,
    'toleranceSeconds'
  );
  if (toleranceSeconds >= stepSeconds) {
    throw new RangeError('events: toleranceSeconds must be smaller than stepSeconds');
  }
  const maxIterations = requireInteger(
    options.maxIterations ?? defaults.maxIterations ?? 64,
    1,
    SEARCH_LIMITS.maximumIterations,
    'maxIterations'
  );
  const maxEvaluations = requireInteger(
    options.maxEvaluations ?? defaults.maxEvaluations ?? 100000,
    2,
    SEARCH_LIMITS.maximumEvaluations,
    'maxEvaluations'
  );
  return Object.freeze({ stepSeconds, toleranceSeconds, maxIterations, maxEvaluations });
}

function searchContext(fn, from, to, options, defaults) {
  if (typeof fn !== 'function') throw new TypeError('events: search function must be callable');
  requireInstant(from, 'from');
  requireInstant(to, 'to');
  const durationSeconds = to.differenceSeconds(from);
  if (!(durationSeconds > 0)) throw new RangeError('events: to must be later than from');
  const parsed = parseSearchOptions(options, defaults);
  const segments = Math.ceil(durationSeconds / parsed.stepSeconds);
  if (segments + 1 > parsed.maxEvaluations) {
    throw new RangeError('events: interval and stepSeconds exceed maxEvaluations');
  }
  let evaluations = 0;
  const evaluate = (instant) => {
    if (evaluations >= parsed.maxEvaluations) {
      throw new RangeError('events: search exceeded maxEvaluations');
    }
    const value = fn(instant);
    evaluations += 1;
    if (!Number.isFinite(value)) throw new TypeError('events: search function must return finite numbers');
    return value;
  };
  return {
    from,
    to,
    durationSeconds,
    segments,
    options: parsed,
    evaluate,
    evaluations: () => evaluations
  };
}

function sample(context) {
  const points = [];
  for (let index = 0; index <= context.segments; index += 1) {
    const seconds = Math.min(
      index * context.options.stepSeconds,
      context.durationSeconds
    );
    const instant = index === context.segments
      ? context.to
      : context.from.addSeconds(seconds);
    points.push({ instant, value: context.evaluate(instant) });
  }
  return points;
}

function refineRoot(context, left, right) {
  let lo = left.instant;
  let hi = right.instant;
  let flo = left.value;
  let fhi = right.value;
  if (flo === 0) return { instant: lo, value: flo };
  if (fhi === 0) return { instant: hi, value: fhi };
  if ((flo < 0) === (fhi < 0)) throw new RangeError('events: root is not bracketed');
  for (let iteration = 0; iteration < context.options.maxIterations; iteration += 1) {
    if (hi.differenceSeconds(lo) <= context.options.toleranceSeconds) break;
    const mid = lo.addSeconds(hi.differenceSeconds(lo) / 2);
    const fmid = context.evaluate(mid);
    if (fmid === 0) return { instant: mid, value: fmid };
    if ((flo < 0) === (fmid < 0)) {
      lo = mid;
      flo = fmid;
    } else {
      hi = mid;
      fhi = fmid;
    }
  }
  if (hi.differenceSeconds(lo) > context.options.toleranceSeconds) {
    throw new RangeError('events: root search did not converge within maxIterations');
  }
  const instant = lo.addSeconds(hi.differenceSeconds(lo) / 2);
  return { instant, value: context.evaluate(instant) };
}

function refineMaximum(context, left, right, sampledCandidates = []) {
  let lo = left;
  let hi = right;
  const ratio = (Math.sqrt(5) - 1) / 2;
  let x1 = hi.addSeconds(-hi.differenceSeconds(lo) * ratio);
  let x2 = lo.addSeconds(hi.differenceSeconds(lo) * ratio);
  let f1 = context.evaluate(x1);
  let f2 = context.evaluate(x2);
  for (let iteration = 0; iteration < context.options.maxIterations; iteration += 1) {
    if (hi.differenceSeconds(lo) <= context.options.toleranceSeconds) break;
    if (f1 < f2) {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo.addSeconds(hi.differenceSeconds(lo) * ratio);
      f2 = context.evaluate(x2);
    } else {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi.addSeconds(-hi.differenceSeconds(lo) * ratio);
      f1 = context.evaluate(x1);
    }
  }
  if (hi.differenceSeconds(lo) > context.options.toleranceSeconds) {
    throw new RangeError('events: maximum search did not converge within maxIterations');
  }
  let best = f1 >= f2
    ? { instant: x1, value: f1 }
    : { instant: x2, value: f2 };
  for (const candidate of sampledCandidates) {
    if (candidate.value > best.value) best = candidate;
  }
  return best;
}

export function findCrossings(fn, from, to, options = {}) {
  const context = searchContext(fn, from, to, options);
  const points = sample(context);
  const crossings = [];
  for (let index = 1; index < points.length;) {
    const left = points[index - 1];
    const right = points[index];

    if (right.value === 0) {
      let zeroEnd = index;
      while (zeroEnd + 1 < points.length && points[zeroEnd + 1].value === 0) {
        zeroEnd += 1;
      }
      const after = points[zeroEnd + 1];
      const rising = left.value < 0 && (!after || after.value > 0);
      const falling = left.value > 0 && (!after || after.value < 0);
      if (rising || falling) {
        crossings.push(Object.freeze({
          instant: right.instant,
          value: right.value,
          direction: rising ? 1 : -1
        }));
      }
      index = zeroEnd + 1;
      continue;
    }

    const rising = left.value < 0 && right.value > 0;
    const falling = left.value > 0 && right.value < 0;
    if (!rising && !falling) {
      index += 1;
      continue;
    }
    const root = refineRoot(context, left, right);
    crossings.push(Object.freeze({
      instant: root.instant,
      value: root.value,
      direction: rising ? 1 : -1
    }));
    index += 1;
  }
  return Object.freeze(crossings);
}

export function findMaximum(fn, from, to, options = {}) {
  const context = searchContext(fn, from, to, options);
  const points = sample(context);
  let bestIndex = 0;
  for (let index = 1; index < points.length; index += 1) {
    if (points[index].value > points[bestIndex].value) bestIndex = index;
  }
  const leftIndex = Math.max(0, bestIndex - 1);
  const rightIndex = Math.min(points.length - 1, bestIndex + 1);
  const peak = refineMaximum(
    context,
    points[leftIndex].instant,
    points[rightIndex].instant,
    points.slice(leftIndex, rightIndex + 1)
  );
  return Object.freeze({ ...peak, evaluations: context.evaluations() });
}

export function findLocalMaxima(fn, from, to, options = {}) {
  const context = searchContext(fn, from, to, options);
  const points = sample(context);
  const maxima = [];
  for (let index = 0; index < points.length;) {
    let endIndex = index;
    while (endIndex + 1 < points.length
        && points[endIndex + 1].value === points[index].value) {
      endIndex += 1;
    }

    const leftIndex = index - 1;
    const rightIndex = endIndex + 1;
    const hasLeft = leftIndex >= 0;
    const hasRight = rightIndex < points.length;
    let bracketLeft;
    let bracketRight;
    let requireImprovement = false;

    if (hasLeft && hasRight
        && points[index].value > points[leftIndex].value
        && points[index].value > points[rightIndex].value) {
      bracketLeft = leftIndex;
      bracketRight = rightIndex;
    } else if (!hasLeft && hasRight
        && points[index].value > points[rightIndex].value) {
      bracketLeft = index;
      bracketRight = rightIndex;
      requireImprovement = true;
    } else if (hasLeft && !hasRight
        && points[index].value > points[leftIndex].value) {
      bracketLeft = leftIndex;
      bracketRight = endIndex;
      requireImprovement = true;
    }

    if (bracketLeft != undefined) {
      const peak = refineMaximum(
        context,
        points[bracketLeft].instant,
        points[bracketRight].instant,
        points.slice(index, endIndex + 1)
      );
      if (!requireImprovement || peak.value > points[index].value) {
        maxima.push(Object.freeze({ instant: peak.instant, value: peak.value }));
      }
    }
    index = endIndex + 1;
  }
  maxima.sort((left, right) => left.instant.differenceSeconds(right.instant));
  return Object.freeze(maxima);
}
