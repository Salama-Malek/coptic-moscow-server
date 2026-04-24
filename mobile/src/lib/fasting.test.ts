// Golden-day tests for the Coptic fasting engine.
//
// Uses Node's built-in test runner (node:test, Node 18+) + tsx so no jest.
// Run: `npm run test:fasting` from mobile/.
//
// If you add a new rule to fasting.ts and a case below fails, check if the
// rule is correct AND whether the golden truth itself needs updating; don't
// just bump expectations blindly.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFastingDay, orthodoxPaschaFor, type FastType } from './fasting';

function expect(dateIso: string, expected: { type: FastType; period?: string; feastKey?: string | null }): void {
  const d = new Date(dateIso);
  const fd = getFastingDay(d);
  assert.equal(fd.type, expected.type, `type mismatch for ${dateIso}: got ${fd.type}`);
  if (expected.period) assert.equal(fd.period, expected.period, `period mismatch for ${dateIso}: got ${fd.period}`);
  if (expected.feastKey !== undefined) {
    assert.equal(fd.feastKey, expected.feastKey, `feastKey mismatch for ${dateIso}: got ${fd.feastKey}`);
  }
}

test('Orthodox Pascha 2025 is Apr 20', () => {
  const p = orthodoxPaschaFor(2025);
  assert.equal(p.getFullYear(), 2025);
  assert.equal(p.getMonth(), 3); // April (0-indexed)
  assert.equal(p.getDate(), 20);
});

test('Orthodox Pascha 2026 is Apr 12', () => {
  const p = orthodoxPaschaFor(2026);
  assert.equal(p.getFullYear(), 2026);
  assert.equal(p.getMonth(), 3);
  assert.equal(p.getDate(), 12);
});

test('Orthodox Pascha 2024 is May 5', () => {
  // Sanity check a third year — Meeus formula should hold.
  const p = orthodoxPaschaFor(2024);
  assert.equal(p.getFullYear(), 2024);
  assert.equal(p.getMonth(), 4); // May
  assert.equal(p.getDate(), 5);
});

test('Pascha day is a feast (no fast)', () => {
  expect('2026-04-12T10:00:00+03:00', { type: 'none', period: 'feast_major', feastKey: 'feast_pascha' });
});

test('Bright Week Tuesday has no fast', () => {
  expect('2026-04-14T10:00:00+03:00', { type: 'none', period: 'bright_week' });
});

test('Good Friday (Pascha-2) is strict Holy Week', () => {
  expect('2026-04-10T10:00:00+03:00', { type: 'strict', period: 'holy_week' });
});

test('Clean Monday 2026 (Feb 16) is strict Great Lent', () => {
  expect('2026-02-16T10:00:00+03:00', { type: 'strict', period: 'great_lent' });
});

test('Great Lent Saturday relaxed to wine_oil', () => {
  // Feb 21 2026 is a Saturday inside Great Lent.
  expect('2026-02-21T10:00:00+03:00', { type: 'wine_oil', period: 'great_lent' });
});

test("Jonah's Fast Monday (Pascha-69)", () => {
  // 2026 Pascha Apr 12; Jonah's Fast Mon = Feb 2.
  expect('2026-02-02T10:00:00+03:00', { type: 'strict', period: 'jonah_fast' });
});

test("Jonah's Fast Wednesday (Pascha-67)", () => {
  expect('2026-02-04T10:00:00+03:00', { type: 'strict', period: 'jonah_fast' });
});

test('Pentecost period Wednesday has no fast (not weekly)', () => {
  // 2026 Pascha Apr 12; a Wed during Pentecost period: Apr 29.
  expect('2026-04-29T10:00:00+03:00', { type: 'none', period: 'pentecost_period' });
});

test("Day after Pentecost (Pascha+50) is Apostles' Fast", () => {
  // Pascha 2026 + 50 = Jun 1 (Monday).
  expect('2026-06-01T10:00:00+03:00', { type: 'fish', period: 'apostles_fast' });
});

test("Apostles' Fast last day Jul 11 (if after Pascha+50)", () => {
  expect('2026-07-11T10:00:00+03:00', { type: 'fish', period: 'apostles_fast' });
});

test('Jul 12 is ordinary (Sunday, outside Apostles)', () => {
  // Jul 12 2026 is a Sunday; not a feast, not Apostles (ended Jul 11).
  expect('2026-07-12T10:00:00+03:00', { type: 'none', period: 'ordinary' });
});

test('Aug 7 is strict Dormition Fast', () => {
  expect('2026-08-07T10:00:00+03:00', { type: 'strict', period: 'dormition_fast' });
});

test('Aug 19 is Transfiguration feast (overrides Dormition Fast)', () => {
  expect('2026-08-19T10:00:00+03:00', { type: 'none', period: 'feast_major', feastKey: 'feast_transfiguration' });
});

test('Aug 22 is Dormition feast', () => {
  expect('2026-08-22T10:00:00+03:00', { type: 'none', period: 'feast_major', feastKey: 'feast_dormition' });
});

test('Nov 25 is first day of Nativity Fast', () => {
  expect('2026-11-25T10:00:00+03:00', { type: 'fish', period: 'nativity_fast' });
});

test('Dec 25 is Nativity Fast (not Christmas in Coptic calendar)', () => {
  expect('2026-12-25T10:00:00+03:00', { type: 'fish', period: 'nativity_fast' });
});

test('Jan 7 is Coptic Nativity feast (overrides Nativity Fast)', () => {
  expect('2026-01-07T10:00:00+03:00', { type: 'none', period: 'feast_major', feastKey: 'feast_nativity' });
});

test('Jan 19 is Theophany feast', () => {
  expect('2026-01-19T10:00:00+03:00', { type: 'none', period: 'feast_major', feastKey: 'feast_theophany' });
});

test('Weekly Wednesday outside fast periods = fish', () => {
  // A Wednesday that isn't inside any fast period and isn't a feast.
  // Jul 22 2026 is a Wednesday (Apostles' fast ended Jul 11, Dormition starts Aug 7).
  expect('2026-07-22T10:00:00+03:00', { type: 'fish', period: 'weekly_wed_fri' });
});

test('Weekly Friday outside fast periods = fish', () => {
  // Jul 24 2026 is a Friday, similar ordinary window.
  expect('2026-07-24T10:00:00+03:00', { type: 'fish', period: 'weekly_wed_fri' });
});

test('Ordinary Tuesday outside fasts = no fast', () => {
  // Jul 21 2026 is a Tuesday.
  expect('2026-07-21T10:00:00+03:00', { type: 'none', period: 'ordinary' });
});

test('Nayrouz Sep 11 is a feast', () => {
  expect('2026-09-11T10:00:00+03:00', { type: 'none', period: 'feast_major', feastKey: 'feast_nayrouz' });
});

test('Feast of the Cross Sep 27', () => {
  expect('2026-09-27T10:00:00+03:00', { type: 'none', period: 'feast_major', feastKey: 'feast_cross' });
});
