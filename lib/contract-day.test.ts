import { expect, test } from "vitest";

import { contractDayLabel } from "./contract-day";

test("DT-01 Day N of M when both dates are set", () => {
  const label = contractDayLabel("2026-09-23", {
    contractStart: "2026-09-19",
    contractEnd: "2026-12-18",
  });
  expect(label).toBe("Day 5 of 91");
});

test("DT-01 Day N with no end date", () => {
  const label = contractDayLabel("2026-09-23", {
    contractStart: "2026-09-19",
    contractEnd: null,
  });
  expect(label).toBe("Day 5");
});

test("DT-01 counts down before the contract starts", () => {
  const label = contractDayLabel("2026-09-16", {
    contractStart: "2026-09-19",
    contractEnd: null,
  });
  expect(label).toBe("Contract starts in 3 days");
});

test("DT-01 singular day when starting tomorrow", () => {
  const label = contractDayLabel("2026-09-18", {
    contractStart: "2026-09-19",
    contractEnd: null,
  });
  expect(label).toBe("Contract starts in 1 day");
});

test("DT-01 reads the end date once the contract is over", () => {
  const label = contractDayLabel("2026-12-20", {
    contractStart: "2026-09-19",
    contractEnd: "2026-12-18",
  });
  expect(label).toBe("Contract ended December 18");
});

test("no contract start set yields no label", () => {
  expect(
    contractDayLabel("2026-09-16", { contractStart: null, contractEnd: null }),
  ).toBeNull();
});
