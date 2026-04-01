import { describe, expect, it } from "vitest";
import { formatDuration } from "../utils/format.js";

describe("formatDuration", () => {
  it("formats milliseconds as seconds when less than a minute", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(1000)).toBe("1s");
    expect(formatDuration(45000)).toBe("45s");
    expect(formatDuration(59000)).toBe("59s");
  });

  it("formats milliseconds as minutes and seconds when less than an hour", () => {
    expect(formatDuration(60000)).toBe("1m");
    expect(formatDuration(90000)).toBe("1m 30s");
    expect(formatDuration(300000)).toBe("5m");
    expect(formatDuration(3540000)).toBe("59m");
  });

  it("formats milliseconds as hours and minutes when less than a day", () => {
    expect(formatDuration(3600000)).toBe("1h");
    expect(formatDuration(5400000)).toBe("1h 30m");
    expect(formatDuration(7200000)).toBe("2h");
    expect(formatDuration(86340000)).toBe("23h 59m");
  });

  it("formats milliseconds as days and hours when a day or more", () => {
    expect(formatDuration(86400000)).toBe("1d");
    expect(formatDuration(129600000)).toBe("1d 12h");
    expect(formatDuration(172800000)).toBe("2d");
    expect(formatDuration(604800000)).toBe("7d");
  });

  it("handles negative values by returning '0s'", () => {
    expect(formatDuration(-1)).toBe("0s");
    expect(formatDuration(-1000)).toBe("0s");
  });

  it("handles large durations", () => {
    expect(formatDuration(2592000000)).toBe("30d"); // 30 days
    expect(formatDuration(31536000000)).toBe("365d"); // 365 days
  });

  it("rounds to nearest whole unit when seconds/minutes/hours are partial", () => {
    // 1.5 minutes should show "1m 30s" (exact)
    expect(formatDuration(90000)).toBe("1m 30s");
    // 2.75 hours should show "2h 45m" (exact)
    expect(formatDuration(9900000)).toBe("2h 45m");
    // 1.25 days should show "1d 6h" (exact: 1 day + 6 hours)
    expect(formatDuration(108000000)).toBe("1d 6h");
  });

  it("omits zero components", () => {
    // 1 hour exactly should not show 0 minutes
    expect(formatDuration(3600000)).toBe("1h");
    // 1 day exactly should not show 0 hours
    expect(formatDuration(86400000)).toBe("1d");
    // 1 minute exactly should not show 0 seconds
    expect(formatDuration(60000)).toBe("1m");
  });
});
