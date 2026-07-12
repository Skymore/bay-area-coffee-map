import test from "node:test";
import assert from "node:assert/strict";
import { chooseCandidate, scoreCandidate } from "./lib/google-place-matcher.mjs";

const expected = {
  name: "The Coffee Movement",
  address: "1030 Washington St, San Francisco, CA 94108",
  coords: [37.7954, -122.4101]
};

test("accepts the exact branch even when it is not the first result", () => {
  const wrongBranch = {
    id: "wrong",
    displayName: { text: "The Coffee Movement" },
    formattedAddress: "1737 Balboa St, San Francisco, CA 94121",
    location: { latitude: 37.776, longitude: -122.479 },
    rating: 4.8,
    userRatingCount: 900
  };
  const exactBranch = {
    id: "exact",
    displayName: { text: "The Coffee Movement" },
    formattedAddress: "1030 Washington St, San Francisco, CA 94108, USA",
    location: { latitude: 37.7954, longitude: -122.4101 },
    rating: 4.7,
    userRatingCount: 400
  };
  const result = chooseCandidate(expected, [wrongBranch, exactBranch]);
  assert.equal(result.status, "matched");
  assert.equal(result.selected.candidate.id, "exact");
});

test("rejects a same-name result at a different street number", () => {
  const candidate = {
    displayName: { text: "The Coffee Movement" },
    formattedAddress: "1737 Washington St, San Francisco, CA 94108",
    location: { latitude: 37.7955, longitude: -122.4102 }
  };
  const result = scoreCandidate(expected, candidate);
  assert.ok(result.hardFailures.includes("street-number-mismatch"));
});

test("normalizes ordinal street names", () => {
  const candidate = {
    displayName: { text: "Example Coffee" },
    formattedAddress: "370 Fourth St, San Francisco, CA 94107",
    location: { latitude: 37.78, longitude: -122.4 }
  };
  const result = scoreCandidate({ name: "Example Coffee", address: "370 4th St, San Francisco, CA 94107" }, candidate);
  assert.equal(result.numberMatches, true);
  assert.equal(result.zipMatches, true);
  assert.equal(result.streetScore, 1);
});
