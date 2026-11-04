// Spin simulator: how many spins can a wheel expect at an event? One pure function, no dependency, no network: the screen calls it on
// every slider move and the tests (tests/spinSimulation.test.mjs) call the very same one.
//
// visitors is the attendance of the WHOLE event (never a per-day figure: the number of days only matters for the capacity).
//   exposed      = visitors x pass rate
//   participants = exposed x participation rate                  (people who want to play)
//   demand       = participants x spins per participant          (spins they would like)
//   capacity     = days x hours x 3600 / seconds per spin x wheels x operational use
//   spins        = min(demand, capacity)

export const LIMITS = {
  visitors: { min: 100, max: 100000, step: 100 },
  days: { min: 1, max: 15, step: 1 },
  hoursPerDay: { min: 1, max: 16, step: 1 },
  passRate: { min: 1, max: 100, step: 1 },
  participationRate: { min: 1, max: 100, step: 1 },
  secondsPerSpin: { min: 10, max: 180, step: 5 },
  wheels: { min: 1, max: 10, step: 1 },
  utilization: { min: 10, max: 100, step: 5 },
  spinsPerParticipant: { min: 1, max: 3, step: 0.1 },
};

export const DEFAULTS = {
  visitors: 20000, days: 3, hoursPerDay: 10, passRate: 30, participationRate: 15,
  secondsPerSpin: 45, wheels: 1, utilization: 75, spinsPerParticipant: 1,
};

// Scenario coefficients applied to the pass rate and the participation rate (each capped at 100 %).
export const DEFAULT_FACTORS = { pessimistic: 0.7, realistic: 1, optimistic: 1.3 };

const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Keeps every input inside its documented range (a typed value, an empty field or NaN never breaks a calculation).
export function sanitize(input = {}) {
  const out = {};
  for (const [k, lim] of Object.entries(LIMITS)) out[k] = clamp(num(input[k], DEFAULTS[k]), lim.min, lim.max);
  return out;
}

// One scenario. `input` is sanitised here: the result is always finite.
export function simulate(input = {}) {
  const i = sanitize(input);
  const exposed = i.visitors * (i.passRate / 100);
  const participants = exposed * (i.participationRate / 100);
  const demand = participants * i.spinsPerParticipant;

  const openingHours = i.days * i.hoursPerDay;
  // seconds >= 10 after sanitising, so the division is safe; wheels and utilisation are >= 1 and >= 10 %
  const capacity = (openingHours * 3600 / i.secondsPerSpin) * i.wheels * (i.utilization / 100);

  const spins = Math.min(demand, capacity);
  const limitedBy = demand <= capacity ? 'demand' : 'capacity';
  const servedParticipants = i.spinsPerParticipant > 0 ? spins / i.spinsPerParticipant : 0; // unique people actually served
  const unmetSpins = Math.max(0, demand - capacity);
  const unmetParticipants = Math.max(0, participants - servedParticipants);

  // effective playing time per wheel, then the opening time that would need (the wheels are only usable `utilization` of the time)
  const activeHoursNeeded = i.wheels > 0 ? (spins * i.secondsPerSpin) / 3600 / i.wheels : 0;
  const openingHoursNeeded = activeHoursNeeded / (i.utilization / 100);

  // wheels needed to serve all the demand, everything else unchanged
  const perWheelCapacity = (openingHours * 3600 / i.secondsPerSpin) * (i.utilization / 100);
  const wheelsNeeded = perWheelCapacity > 0 ? Math.max(1, Math.ceil(demand / perWheelCapacity - 1e-9)) : 1;

  const days = i.days;
  // uniform split, the only honest default: no attendance curve is invented
  const daily = Array.from({ length: days }, () => spins / days);

  // integers for the screen: the pieces always add up (served + unmet = demand)
  const roundedDemand = Math.round(demand);
  const roundedSpins = Math.min(roundedDemand, Math.round(spins));

  return {
    inputs: i,
    exposed, participants, demand, capacity, spins, limitedBy,
    servedParticipants, unmetSpins, unmetParticipants,
    saturation: capacity > 0 ? spins / capacity : 0,        // share of the capacity really used, 0..1
    demandToCapacity: capacity > 0 ? demand / capacity : 0, // above 1: more people want to play than the wheels can serve
    spinsPerDay: spins / days,
    spinsPerHour: spins / openingHours,
    activeHoursNeeded, openingHoursNeeded,
    shareOfVisitors: i.visitors > 0 ? servedParticipants / i.visitors : 0,
    wheelsNeeded, daily,
    rounded: {
      spins: roundedSpins, demand: roundedDemand, unmetSpins: roundedDemand - roundedSpins,
      capacity: Math.round(capacity), participants: Math.round(servedParticipants), exposed: Math.round(exposed),
      spinsPerDay: Math.round(spins / days), spinsPerHour: Math.round(spins / openingHours),
    },
  };
}

// The three scenarios: pass and participation rates x coefficient, each capped at 100 %, then the full calculation again.
export function simulateScenarios(input = {}, factors = DEFAULT_FACTORS) {
  const base = sanitize(input);
  const f = { ...DEFAULT_FACTORS, ...factors };
  const make = (factor) => {
    const k = Math.max(0, num(factor, 1));
    return simulate({ ...base, passRate: Math.min(100, base.passRate * k), participationRate: Math.min(100, base.participationRate * k) });
  };
  return { pessimistic: make(f.pessimistic), realistic: make(f.realistic), optimistic: make(f.optimistic), factors: f };
}

// Contextual messages (codes translated by the screen). Thresholds are deliberately simple and stated in the tests.
export const SLOW_SPIN_SECONDS = 60;
export const LOW_DEMAND_RATIO = 0.4;
export function alertsFor(sim) {
  const out = [];
  if (sim.demandToCapacity > 1) out.push('saturated');
  if (sim.inputs.secondsPerSpin > SLOW_SPIN_SECONDS && sim.demandToCapacity > 0.8) out.push('slowSpin');
  if (sim.demandToCapacity < LOW_DEMAND_RATIO) out.push('spare');
  return out;
}
