import { describe, expect, test } from "vitest";
import { clockTime, hourLabel, longDate, num, peak, peakIndex, rupees, shiftHours } from "./format";

describe("hourLabel", () => {
  test("names the two hours that have no obvious 12-hour form", () => {
    expect(hourLabel(0)).toBe("12am");
    expect(hourLabel(12)).toBe("12pm");
  });

  test("converts morning and afternoon hours", () => {
    expect(hourLabel(1)).toBe("1am");
    expect(hourLabel(11)).toBe("11am");
    expect(hourLabel(13)).toBe("1pm");
    expect(hourLabel(23)).toBe("11pm");
  });

  test("wraps out-of-range hours instead of producing nonsense", () => {
    // shiftHours can hand this function an hour outside 0-23 during rotation.
    expect(hourLabel(24)).toBe("12am");
    expect(hourLabel(25)).toBe("1am");
    expect(hourLabel(-1)).toBe("11pm");
  });
});

describe("shiftHours", () => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  test("returns the histogram unchanged at zero offset", () => {
    expect(shiftHours(hours, 0)).toEqual(hours);
  });

  test("moves a peak forward by the offset", () => {
    // A spike at UTC midnight should read as 5am when the subject is at UTC+5.
    const spike = new Array(24).fill(0);
    spike[0] = 100;
    expect(peakIndex(shiftHours(spike, 5))).toBe(5);
  });

  test("moves a peak backward for negative offsets, wrapping past midnight", () => {
    const spike = new Array(24).fill(0);
    spike[2] = 100;
    expect(peakIndex(shiftHours(spike, -5))).toBe(21);
  });

  test("never loses or invents plays", () => {
    const total = hours.reduce((a, b) => a + b, 0);
    for (const offset of [-11, -5, 0, 1, 5, 12]) {
      const shifted = shiftHours(hours, offset);
      expect(shifted).toHaveLength(24);
      expect(shifted.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  test("a full 24-hour rotation is the identity", () => {
    expect(shiftHours(hours, 24)).toEqual(hours);
  });
});

describe("peak and peakIndex", () => {
  test("find the largest value and where it sits", () => {
    expect(peak([1, 9, 3])).toBe(9);
    expect(peakIndex([1, 9, 3])).toBe(1);
  });

  test("survive an empty list rather than returning -Infinity", () => {
    // Called during first paint, before any data has loaded.
    expect(peak([])).toBe(0);
  });
});

describe("num", () => {
  test("groups in thousands, not lakhs", () => {
    // en-IN would render this "1,62,588", which misreads for this audience.
    expect(num(162588)).toBe("162,588");
  });

  test("rounds rather than showing a fraction of a play", () => {
    expect(num(1499.6)).toBe("1,500");
  });
});

describe("rupees", () => {
  test("formats as INR with no decimals", () => {
    expect(rupees(199)).toContain("199");
    expect(rupees(199)).not.toContain(".");
  });

  test("shows magnitude only, because direction is carried by the label", () => {
    expect(rupees(-500)).toBe(rupees(500));
  });
});

describe("clockTime and longDate", () => {
  test("read the wall-clock time out of the timestamp", () => {
    expect(clockTime("2017-03-04T02:11:00")).toBe("02:11");
  });

  test("degrade to a placeholder rather than throwing on a bare date", () => {
    expect(clockTime("2017-03-04")).toBe("--:--");
  });

  test("renders a human date", () => {
    expect(longDate("2017-03-04T02:11:00")).toBe("4 Mar 2017");
  });

  test("falls back to the first ten characters when the timestamp is unparseable", () => {
    expect(longDate("not-a-date-at-all")).toBe("not-a-date");
  });
});
