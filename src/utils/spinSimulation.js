// Spin simulator: how many spins can a wheel serve at an event? One pure function, no dependency, no network: the screen calls it on
// every slider move and the tests (tests/spinSimulation.test.mjs) call the very same one.
//
// The estimate is the capacity of the wheels (the demand is not guessed):
//   capacity = days x hours x 3600 / seconds per spin x wheels x operational utilization
// The attendance is only context: it gives the share of visitors who could play (and warns when the figure exceeds it).

export const LIMITS = {
  visitors: { min: 100, max: 100000, step: 100 },
  days: { min: 1, max: 15, step: 1 },
  hoursPerDay: { min: 1, max: 16, step: 1 },
  secondsPerSpin: { min: 10, max: 180, step: 1 },
  wheels: { min: 1, max: 10, step: 1 },
  utilization: { min: 10, max: 100, step: 1 },
  spinsPerParticipant: { min: 1, max: 3, step: 0.1 },
};

export const DEFAULTS = { visitors: 20000, days: 3, hoursPerDay: 10, secondsPerSpin: 45, wheels: 1, utilization: 75, spinsPerParticipant: 1 };

// Scenarios move the operational utilization only (capped at 100 %).
export const DEFAULT_FACTORS = { pessimistic: 0.7, realistic: 1, optimistic: 1.3 };

const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : fallback);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Keeps every input inside its documented range (a typed value, an empty field or NaN never breaks a calculation).
export function sanitize(input = {}) {
  const out = {};
  for (const [k, lim] of Object.entries(LIMITS)) out[k] = clamp(num(input[k], DEFAULTS[k]), lim.min, lim.max);
  return out;
}

export function simulate(input = {}) {
  const i = sanitize(input);
  const openingHours = i.days * i.hoursPerDay;
  const theoretical = (openingHours * 3600 / i.secondsPerSpin) * i.wheels; // at 100 % utilization (seconds >= 10: no division by zero)
  const spins = theoretical * (i.utilization / 100);
  const participants = spins / i.spinsPerParticipant; // unique people served
  return {
    inputs: i, openingHours, theoretical, capacity: spins, spins, participants,
    spinsPerDay: spins / i.days,
    spinsPerHour: spins / openingHours,
    activeHoursPerWheel: (spins * i.secondsPerSpin) / 3600 / i.wheels, // time a wheel really spins
    shareOfVisitors: participants / i.visitors,
    daily: Array.from({ length: i.days }, () => spins / i.days), // uniform split: no attendance curve is invented
    rounded: { spins: Math.round(spins), participants: Math.round(participants), theoretical: Math.round(theoretical), spinsPerDay: Math.round(spins / i.days), spinsPerHour: Math.round(spins / openingHours) },
  };
}

export function simulateScenarios(input = {}, factors = DEFAULT_FACTORS) {
  const base = sanitize(input);
  const f = { ...DEFAULT_FACTORS, ...factors };
  const make = (factor) => simulate({ ...base, utilization: Math.min(100, base.utilization * Math.max(0, num(factor, 1))) });
  return { pessimistic: make(f.pessimistic), realistic: make(f.realistic), optimistic: make(f.optimistic), factors: f };
}

export const SLOW_SPIN_SECONDS = 60;
// Contextual messages (codes translated by the screen).
export function alertsFor(sim) {
  const out = [];
  if (sim.inputs.secondsPerSpin > SLOW_SPIN_SECONDS) out.push('slowSpin');
  if (sim.participants > sim.inputs.visitors) out.push('exceedsVisitors');
  return out;
}
