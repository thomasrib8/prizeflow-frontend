// Spin simulator calculations: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, simulateScenarios, sanitize, alertsFor, DEFAULTS, LIMITS } from '../src/utils/spinSimulation.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('the default hypotheses: demand is the limit', () => {
  const s = simulate(DEFAULTS);
  near(s.exposed, 6000);                 // 20 000 x 30 %
  near(s.participants, 900);             // x 15 %
  near(s.demand, 900);                   // x 1 spin each
  near(s.capacity, 3 * 10 * 3600 / 45 * 0.75); // 1 800 spins over 3 days of 10 h
  near(s.capacity, 1800);
  near(s.spins, 900); assert.equal(s.limitedBy, 'demand');
  near(s.saturation, 0.5); near(s.unmetSpins, 0);
  near(s.servedParticipants, 900);
  near(s.spinsPerDay, 300); near(s.spinsPerHour, 30);
  near(s.shareOfVisitors, 0.045);
});

test('the attendance is the whole event: the number of days only changes the capacity, never the demand', () => {
  const a = simulate({ ...DEFAULTS, days: 1 }); const b = simulate({ ...DEFAULTS, days: 15 });
  near(a.demand, b.demand); near(a.participants, b.participants);
  near(b.capacity, 15 * a.capacity);
});

test('capacity is the limit: spins are capped, the rest is unmet demand, saturation is full', () => {
  const s = simulate({ ...DEFAULTS, visitors: 100000, passRate: 100, participationRate: 50, days: 1, hoursPerDay: 4, secondsPerSpin: 60, utilization: 50 });
  near(s.capacity, 4 * 3600 / 60 * 0.5);      // 120
  near(s.demand, 50000);
  near(s.spins, 120); assert.equal(s.limitedBy, 'capacity');
  near(s.saturation, 1); assert.ok(s.demandToCapacity > 400);
  near(s.unmetSpins, 50000 - 120);
  assert.equal(s.rounded.spins + s.rounded.unmetSpins, s.rounded.demand);
});

test('several wheels multiply the capacity; the number of wheels needed covers all the demand', () => {
  const one = simulate({ ...DEFAULTS, visitors: 100000, passRate: 60, participationRate: 30 });
  const three = simulate({ ...DEFAULTS, visitors: 100000, passRate: 60, participationRate: 30, wheels: 3 });
  near(three.capacity, 3 * one.capacity);
  assert.ok(three.spins > one.spins);
  const need = one.wheelsNeeded;
  assert.ok(need >= 2);
  const enough = simulate({ ...DEFAULTS, visitors: 100000, passRate: 60, participationRate: 30, wheels: need });
  assert.equal(enough.limitedBy, 'demand', 'that many wheels serve everybody');
  if (need > 1) assert.equal(simulate({ ...DEFAULTS, visitors: 100000, passRate: 60, participationRate: 30, wheels: need - 1 }).limitedBy, 'capacity', 'one fewer does not');
});

test('several spins per participant: spins grow, unique participants do not, and a limiting capacity serves fewer people', () => {
  const s = simulate({ ...DEFAULTS, spinsPerParticipant: 2 });
  near(s.demand, 1800); near(s.participants, 900); near(s.servedParticipants, 900);
  const limited = simulate({ ...DEFAULTS, spinsPerParticipant: 3, visitors: 100000 });
  assert.equal(limited.limitedBy, 'capacity');
  near(limited.servedParticipants, limited.capacity / 3);
  assert.ok(limited.servedParticipants < limited.participants);
});

test('participation at 100 %: everybody exposed plays', () => {
  const s = simulate({ ...DEFAULTS, participationRate: 100 });
  near(s.participants, s.exposed);
});

test('no division by zero, no NaN, whatever is typed', () => {
  for (const bad of [{}, { visitors: 0, days: 0, hoursPerDay: 0, secondsPerSpin: 0, wheels: 0, utilization: 0 }, { visitors: 'abc', passRate: null, secondsPerSpin: NaN }, { wheels: -5, spinsPerParticipant: 0 }, undefined]) {
    const s = simulate(bad);
    for (const [k, v] of Object.entries(s)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} ${JSON.stringify(bad)}`);
    for (const v of s.daily) assert.ok(Number.isFinite(v));
  }
  // out-of-range values are pulled back to the documented limits
  const c = sanitize({ visitors: 1e9, days: 99, secondsPerSpin: 1, wheels: 50, utilization: 0 });
  assert.equal(c.visitors, LIMITS.visitors.max); assert.equal(c.days, LIMITS.days.max); assert.equal(c.secondsPerSpin, LIMITS.secondsPerSpin.min);
  assert.equal(c.wheels, LIMITS.wheels.max); assert.equal(c.utilization, LIMITS.utilization.min);
});

test('rounding stays coherent: pieces add up, daily split is uniform and sums to the total', () => {
  const s = simulate({ ...DEFAULTS, visitors: 12345, passRate: 33, participationRate: 17, spinsPerParticipant: 1.3 });
  assert.equal(s.rounded.spins + s.rounded.unmetSpins, s.rounded.demand);
  assert.equal(s.daily.length, 3);
  near(s.daily.reduce((a, b) => a + b, 0), s.spins);
  assert.ok(s.rounded.spins <= s.rounded.capacity + 1);
  near(s.spinsPerHour * s.inputs.days * s.inputs.hoursPerDay, s.spins);
});

test('the three scenarios: rates x 0.7 / 1 / 1.3, capped at 100 %, never above the capacity', () => {
  const sc = simulateScenarios(DEFAULTS);
  near(sc.pessimistic.inputs.passRate, 21); near(sc.pessimistic.inputs.participationRate, 10.5);
  near(sc.realistic.inputs.passRate, 30); near(sc.optimistic.inputs.passRate, 39); near(sc.optimistic.inputs.participationRate, 19.5);
  assert.ok(sc.pessimistic.spins < sc.realistic.spins && sc.realistic.spins < sc.optimistic.spins);
  near(sc.realistic.spins, simulate(DEFAULTS).spins);
  // capped at 100 %
  const high = simulateScenarios({ ...DEFAULTS, passRate: 90, participationRate: 95 });
  assert.equal(high.optimistic.inputs.passRate, 100); assert.equal(high.optimistic.inputs.participationRate, 100);
  // capacity is never exceeded in any scenario, and is the same in the three (only the rates move)
  const sat = simulateScenarios({ ...DEFAULTS, visitors: 100000, passRate: 80, participationRate: 60 });
  for (const k of ['pessimistic', 'realistic', 'optimistic']) { assert.ok(sat[k].spins <= sat[k].capacity + 1e-9); near(sat[k].capacity, sat.realistic.capacity); }
  // custom coefficients
  near(simulateScenarios(DEFAULTS, { pessimistic: 0.5 }).pessimistic.inputs.passRate, 15);
});

test('alerts: saturated, slow spin, spare capacity', () => {
  assert.ok(alertsFor(simulate({ ...DEFAULTS, visitors: 100000 })).includes('saturated'));
  assert.ok(alertsFor(simulate({ ...DEFAULTS, visitors: 100000, secondsPerSpin: 120 })).includes('slowSpin'));
  assert.ok(!alertsFor(simulate({ ...DEFAULTS, visitors: 5000, secondsPerSpin: 120 })).includes('slowSpin'), 'a slow spin only matters when the wheel is busy');
  assert.ok(alertsFor(simulate({ ...DEFAULTS, visitors: 1000 })).includes('spare'));
  assert.deepEqual(alertsFor(simulate({ ...DEFAULTS, visitors: 40000, passRate: 30, participationRate: 15 })), []);
});
