const genericNameTokens = new Set([
  "a", "and", "at", "cafe", "caffe", "coffee", "co", "company", "roaster", "roasters", "the"
]);

export function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(first|1st)\b/g, "1")
    .replace(/\b(second|2nd)\b/g, "2")
    .replace(/\b(third|3rd)\b/g, "3")
    .replace(/\b(fourth|4th)\b/g, "4")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value, { dropGeneric = false } = {}) {
  const result = normalize(value).split(" ").filter(Boolean);
  return dropGeneric ? result.filter(token => !genericNameTokens.has(token)) : result;
}

function dice(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  if (!a.size && !b.size) return 1;
  const shared = [...a].filter(token => b.has(token)).length;
  return (2 * shared) / (a.size + b.size || 1);
}

export function addressParts(address) {
  const normalized = normalize(address);
  const firstLine = normalize(String(address ?? "").split(",")[0]);
  return {
    normalized,
    number: firstLine.match(/^\s*(\d+)/)?.[1] ?? null,
    zip: normalized.match(/\b(\d{5})(?:\s\d{4})?$/)?.[1] ?? null,
    streetTokens: tokens(firstLine).filter(token =>
      !/^\d+$/.test(token) &&
      !["n", "s", "e", "w", "st", "street", "ave", "avenue", "blvd", "boulevard", "rd", "road", "dr", "drive", "ln", "lane", "ste", "suite", "unit"].includes(token)
    )
  };
}

export function distanceMeters(origin, target) {
  if (!origin || !target || !Number.isFinite(origin.latitude) || !Number.isFinite(target.latitude)) {
    return null;
  }
  const rad = value => (value * Math.PI) / 180;
  const radius = 6_371_000;
  const dLat = rad(target.latitude - origin.latitude);
  const dLng = rad(target.longitude - origin.longitude);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(origin.latitude)) * Math.cos(rad(target.latitude)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function scoreCandidate(expected, candidate) {
  const expectedAddress = addressParts(expected.address);
  const actualAddress = addressParts(candidate.formattedAddress);
  const expectedNameTokens = tokens(expected.name, { dropGeneric: true });
  const actualNameTokens = tokens(candidate.displayName?.text ?? candidate.name, { dropGeneric: true });
  const nameScore = dice(expectedNameTokens, actualNameTokens);
  const streetScore = dice(expectedAddress.streetTokens, actualAddress.streetTokens);
  const numberMatches = Boolean(expectedAddress.number && actualAddress.number && expectedAddress.number === actualAddress.number);
  const zipMatches = Boolean(expectedAddress.zip && actualAddress.zip && expectedAddress.zip === actualAddress.zip);
  const distance = distanceMeters(
    Array.isArray(expected.coords) ? { latitude: expected.coords[0], longitude: expected.coords[1] } : null,
    candidate.location
  );
  const distanceScore = distance == null ? 0.5 : distance <= 80 ? 1 : distance <= 250 ? 0.8 : distance <= 700 ? 0.4 : 0;
  const score = 0.3 * nameScore + 0.2 * streetScore + 0.15 * Number(numberMatches) +
    0.15 * Number(zipMatches) + 0.2 * distanceScore;
  const hardFailures = [];
  if (expectedAddress.number && actualAddress.number && !numberMatches) hardFailures.push("street-number-mismatch");
  if (expectedAddress.zip && actualAddress.zip && !zipMatches) hardFailures.push("zip-mismatch");
  if (distance != null && distance > 1_500) hardFailures.push("distance-over-1500m");
  if (nameScore < 0.25) hardFailures.push("name-similarity-too-low");

  return {
    score: Number(score.toFixed(4)),
    nameScore: Number(nameScore.toFixed(4)),
    streetScore: Number(streetScore.toFixed(4)),
    numberMatches,
    zipMatches,
    distanceMeters: distance == null ? null : Math.round(distance),
    hardFailures
  };
}

export function chooseCandidate(expected, candidates, { minScore = 0.72, minMargin = 0.06 } = {}) {
  const ranked = candidates
    .map(candidate => ({ candidate, match: scoreCandidate(expected, candidate) }))
    .sort((a, b) => b.match.score - a.match.score);
  const best = ranked[0] ?? null;
  const runnerUp = ranked[1] ?? null;
  const margin = best ? best.match.score - (runnerUp?.match.score ?? 0) : 0;
  let status = "matched";
  const reasons = [];
  if (!best) {
    status = "not-found";
    reasons.push("no-candidates");
  } else {
    reasons.push(...best.match.hardFailures);
    if (best.match.score < minScore) reasons.push(`score-below-${minScore}`);
    if (runnerUp && margin < minMargin) reasons.push(`ambiguous-margin-below-${minMargin}`);
    if (reasons.length) status = "needs-review";
  }
  return {
    status,
    reasons,
    margin: Number(margin.toFixed(4)),
    selected: best,
    candidates: ranked
  };
}
