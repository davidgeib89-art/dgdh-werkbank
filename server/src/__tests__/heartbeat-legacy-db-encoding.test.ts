import { describe, expect, it } from "vitest";

import {
  isLegacyDatabaseEncodingError,
  sanitizeLegacyDatabaseValue,
} from "../services/heartbeat";

describe("legacy database encoding fallback", () => {
  it("detects PostgreSQL encoding translation failures", () => {
    expect(isLegacyDatabaseEncodingError({ code: "22P05" })).toBe(true);
    expect(isLegacyDatabaseEncodingError({ code: "23505" })).toBe(false);
    expect(isLegacyDatabaseEncodingError(new Error("boom"))).toBe(false);
  });

  it("sanitizes nested values down to ASCII-safe text", () => {
    const input = {
      summary: "Done \u2713 \u2014 \u0394 review",
      nested: {
        arrow: "CEO \u2192 Codex \u2192 David",
        quotes: "\u201csmart\u201d and \u2018careful\u2019",
      },
      list: ["line one\u2026", "emoji \ud83d\ude42"],
    };

    expect(sanitizeLegacyDatabaseValue(input)).toEqual({
      summary: "Done [ok] - Delta review",
      nested: {
        arrow: "CEO -> Codex -> David",
        quotes: '"smart" and \'careful\'',
      },
      list: ["line one...", "emoji ?"],
    });
  });
});
