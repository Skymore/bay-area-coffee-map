const minutesPerDay = 1440;
const daysPerWeek = 7;
const closedBusinessStatuses = new Set(["CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY"]);

export function openingSegmentsByDay(periods = []) {
  const segments = Array.from({ length: daysPerWeek }, () => []);

  for (const period of periods) {
    if (!period.open) continue;

    const start = period.open.day * minutesPerDay
      + period.open.hour * 60
      + (period.open.minute ?? 0);
    let end;

    if (!period.close) {
      end = start + daysPerWeek * minutesPerDay;
    } else {
      end = period.close.day * minutesPerDay
        + period.close.hour * 60
        + (period.close.minute ?? 0);
      if (end <= start) end += daysPerWeek * minutesPerDay;
    }

    for (
      let absoluteDay = Math.floor(start / minutesPerDay);
      absoluteDay <= Math.floor((end - 1) / minutesPerDay);
      absoluteDay += 1
    ) {
      const dayStart = absoluteDay * minutesPerDay;
      const segmentStart = Math.max(start, dayStart) - dayStart;
      const segmentEnd = Math.min(end, dayStart + minutesPerDay) - dayStart;
      const day = ((absoluteDay % daysPerWeek) + daysPerWeek) % daysPerWeek;
      segments[day].push({ start: segmentStart, end: segmentEnd });
    }
  }

  return segments;
}

export function mergeOpeningSegments(segments = []) {
  return [...segments]
    .sort((a, b) => a.start - b.start)
    .reduce((merged, segment) => {
      const current = {
        start: Math.max(0, segment.start),
        end: Math.min(minutesPerDay, segment.end)
      };
      const previous = merged.at(-1);
      if (!previous || current.start > previous.end) return [...merged, current];
      previous.end = Math.max(previous.end, current.end);
      return merged;
    }, []);
}

export function cafeLocalClock(cafe, now = new Date()) {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }).formatToParts(now).map(part => [part.type, part.value])
    );
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
    if (day >= 0) return { day, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  } catch {
    // Fall back to the place offset if the browser lacks IANA time-zone support.
  }

  const fallbackDate = new Date(now.getTime() + (cafe.utcOffsetMinutes ?? 0) * 60_000);
  return {
    day: fallbackDate.getUTCDay(),
    minute: fallbackDate.getUTCHours() * 60 + fallbackDate.getUTCMinutes()
  };
}

export function isCafeOpenAt(cafe, now = new Date()) {
  if (closedBusinessStatuses.has(cafe.placeBusinessStatus)) return false;

  const periods = cafe.regularOpeningHours?.periods ?? [];
  if (!periods.length) return false;

  const localClock = cafeLocalClock(cafe, now);
  const todaySegments = mergeOpeningSegments(openingSegmentsByDay(periods)[localClock.day]);
  return todaySegments.some(segment =>
    localClock.minute >= segment.start && localClock.minute < segment.end
  );
}
