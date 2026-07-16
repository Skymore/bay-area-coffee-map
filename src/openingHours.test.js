import test from "node:test";
import assert from "node:assert/strict";
import { isCafeOpenAt, openingSegmentsByDay } from "./openingHours.js";

function cafeWithPeriods(periods, placeBusinessStatus = "OPERATIONAL") {
  return {
    placeBusinessStatus,
    regularOpeningHours: { periods },
    utcOffsetMinutes: -420
  };
}

test("recognizes a cafe during a regular daytime period", () => {
  const cafe = cafeWithPeriods([
    { open: { day: 2, hour: 9 }, close: { day: 2, hour: 17 } }
  ]);

  assert.equal(isCafeOpenAt(cafe, new Date("2026-07-14T17:00:00Z")), true);
});

test("treats the closing minute as closed", () => {
  const cafe = cafeWithPeriods([
    { open: { day: 2, hour: 9 }, close: { day: 2, hour: 17 } }
  ]);

  assert.equal(isCafeOpenAt(cafe, new Date("2026-07-15T00:00:00Z")), false);
});

test("splits and recognizes an overnight period", () => {
  const periods = [
    { open: { day: 5, hour: 22 }, close: { day: 6, hour: 2 } }
  ];
  const segments = openingSegmentsByDay(periods);
  const cafe = cafeWithPeriods(periods);

  assert.deepEqual(segments[5], [{ start: 1320, end: 1440 }]);
  assert.deepEqual(segments[6], [{ start: 0, end: 120 }]);
  assert.equal(isCafeOpenAt(cafe, new Date("2026-07-18T06:30:00Z")), true);
  assert.equal(isCafeOpenAt(cafe, new Date("2026-07-18T09:30:00Z")), false);
});

test("supports a continuously open period", () => {
  const cafe = cafeWithPeriods([
    { open: { day: 0, hour: 0, minute: 0 } }
  ]);

  assert.equal(isCafeOpenAt(cafe, new Date("2026-07-15T12:00:00Z")), true);
});

test("excludes unavailable cafes and cafes without hours", () => {
  const periods = [
    { open: { day: 2, hour: 9 }, close: { day: 2, hour: 17 } }
  ];
  const now = new Date("2026-07-14T17:00:00Z");

  assert.equal(isCafeOpenAt(cafeWithPeriods(periods, "CLOSED_TEMPORARILY"), now), false);
  assert.equal(isCafeOpenAt(cafeWithPeriods(periods, "CLOSED_PERMANENTLY"), now), false);
  assert.equal(isCafeOpenAt({}, now), false);
});
