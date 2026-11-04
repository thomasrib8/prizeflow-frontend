// Spin simulator calculations: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, simulateScenarios, sanitize, alertsFor, DEFAULTS, LIMITS } from '../src/utils/spinSimulation.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('default hypotheses: 3 days x 10 h, 45 s per spin, 75 % utilization', () => {
  const s = simulate(DEFAULTS);
  near(s.openingHours, 30);
  near(s.theoretical, 2400);           // 30 h x 3600 / 45
  near(s.spins, 1800); near(s.capacity, 1800);
  near(s.participants, 1800);
  near(s.spinsPerDay, 600); near(s.spinsPerHour, 60);
  near(s.activeHoursPerWheel, 22.5);   // 1 800 x 45 s
  near(s.shareOfVisitors, 0.09);
});

test('several wheels multiply the capacity', () => {
  near(simulate({ ...DEFAULTS, wheels: 3 }).spins, 3 * simulate(DEFAULTS).spins);
});

test('shorter spin, longer opening and higher utilization all raise the figure', () => {
  const base = simulate(DEFAULTS).spins;
  assert.ok(simulate({ ...DEFAULTS, secondsPerSpin: 30 }).spins > base);
  assert.ok(simulate({ ...DEFAULTS, days: 5 }).spins > base);
  assert.ok(simulate({ ...DEFAULTS, utilization: 100 }).spins > base);
  near(simulate({ ...DEFAULTS, utilization: 100 }).spins, simulate(DEFAULTS).theoretical);
});

test('several spins per participant: same spins, fewer unique people', () => {
  const s = simulate({ ...DEFAULTS, spinsPerParticipant: 2 });
  near(s.spins, 1800); near(s.participants, 900);
});

test('the attendance never limits the spins, it only gives the share of visitors', () => {
  const s = simulate({ ...DEFAULTS, visitors: 100 });
  near(s.spins, 1800); assert.ok(s.shareOfVisitors > 1);
  assert.ok(alertsFor(s).includes('exceedsVisitors'));
  assert.ok(!alertsFor(simulate(DEFAULTS)).includes('exceedsVisitors'));
});

test('no division by zero, no NaN, whatever is typed', () => {
  for (const bad of [{}, { visitors: 0, days: 0, hoursPerDay: 0, secondsPerSpin: 0, wheels: 0, utilization: 0 }, { visitors: 'abc', secondsPerSpin: NaN, days: null }, { wheels: -5, spinsPerParticipant: 0 }, undefined]) {
    const s = simulate(bad);
    for (const [k, v] of Object.entries(s)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} ${JSON.stringify(bad)}`);
    for (const v of s.daily) assert.ok(Number.isFinite(v));
  }
  const c = sanitize({ visitors: 1e9, days: 99, secondsPerSpin: 1, wheels: 50, utilization: 0 });
  assert.equal(c.visitors, LIMITS.visitors.max); assert.equal(c.days, LIMITS.days.max); assert.equal(c.secondsPerSpin, LIMITS.secondsPerSpin.min);
  assert.equal(c.wheels, LIMITS.wheels.max); assert.equal(c.utilization, LIMITS.utilization.min);
});

test('daily split is uniform and adds up; rounding stays coherent', () => {
  const s = simulate({ ...DEFAULTS, days: 7, secondsPerSpin: 35, utilization: 65 });
  assert.equal(s.daily.length, 7);
  near(s.daily.reduce((a, b) => a + b, 0), s.spins);
  near(s.spinsPerHour * s.openingHours, s.spins);
});

test('scenarios only move the utilization: x0.7 / x1 / x1.3, capped at 100 %', () => {
  const sc = simulateScenarios(DEFAULTS);
  near(sc.pessimistic.inputs.utilization, 52.5); near(sc.realistic.inputs.utilization, 75); near(sc.optimistic.inputs.utilization, 97.5);
  assert.ok(sc.pessimistic.spins < sc.realistic.spins && sc.realistic.spins < sc.optimistic.spins);
  near(sc.realistic.spins, simulate(DEFAULTS).spins);
  const high = simulateScenarios({ ...DEFAULTS, utilization: 90 });
  assert.equal(high.optimistic.inputs.utilization, 100);
  near(high.optimistic.spins, high.optimistic.theoretical);       // never above 100 % of the capacity
  for (const k of ['pessimistic', 'realistic', 'optimistic']) near(sc[k].theoretical, sc.realistic.theoretical); // everything else is unchanged
  near(simulateScenarios(DEFAULTS, { pessimistic: 0.5 }).pessimistic.inputs.utilization, 37.5);
});

test('alert: a long player journey', () => {
  assert.ok(alertsFor(simulate({ ...DEFAULTS, secondsPerSpin: 90 })).includes('slowSpin'));
  assert.ok(!alertsFor(simulate(DEFAULTS)).includes('slowSpin'));
});
