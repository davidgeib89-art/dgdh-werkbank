// @vitest-environment node

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "../context/ThemeContext";
import { NeedsInputNotice } from "./NeedsInputNotice";

describe("NeedsInputNotice", () => {
  it("renders the worker-readiness warning and extracted lines", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <NeedsInputNotice
          lines={[
            { lineNumber: 2, text: "[NEEDS INPUT] Confirm customer domain" },
            { lineNumber: 5, text: "- [NEEDS INPUT] Need logo colors" },
          ]}
          onEditDescription={() => {}}
          onAddComment={() => {}}
        />
      </ThemeProvider>,
    );

    expect(html).toContain("Needs Input");
    expect(html).toContain("Dieses Packet braucht noch Input, bevor ein Worker starten sollte.");
    expect(html).toContain("Line 2");
    expect(html).toContain("Line 5");
    expect(html).toContain("[NEEDS INPUT] Confirm customer domain");
    expect(html).toContain("- [NEEDS INPUT] Need logo colors");
    expect(html).toContain("Edit issue");
    expect(html).toContain("Add comment");
  });

  it("renders nothing when no lines are present", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <NeedsInputNotice lines={[]} onEditDescription={() => {}} />
      </ThemeProvider>,
    );

    expect(html).toBe("");
  });
});
