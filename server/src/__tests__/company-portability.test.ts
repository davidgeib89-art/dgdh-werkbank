import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const companies = {
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const agents = {
  list: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
};

const access = {
  ensureMembership: vi.fn(),
};

vi.mock("../services/companies.js", () => ({
  companyService: () => companies,
}));

vi.mock("../services/agents.js", () => ({
  agentService: () => agents,
}));

vi.mock("../services/access.js", () => ({
  accessService: () => access,
}));

import { companyPortabilityService } from "../services/company-portability.js";

describe("company portability firm identity export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    companies.getById.mockResolvedValue({
      id: "company-1",
      name: "DGDH",
      description: "Digitales Handwerk",
      brandColor: null,
      requireBoardApprovalForNewAgents: true,
    });
    agents.list.mockResolvedValue([]);
  });

  it("exports firm identity metadata and durable files when requested", async () => {
    const svc = companyPortabilityService({} as never);

    const result = await svc.exportBundle("company-1", {
      include: {
        company: false,
        agents: false,
        firmIdentity: true,
      },
    });

    expect(result.manifest.includes.firmIdentity).toBe(true);
    expect(result.manifest.firmIdentity).toEqual(
      expect.objectContaining({
        path: "FIRM-IDENTITY.md",
        currentCarrier: "Paperclip runtime + portability carrier",
      }),
    );
    expect(result.manifest.firmIdentity?.files).toContain("CURRENT.md");
    expect(result.manifest.firmIdentity?.files).toContain("company-hq/ACTIVE-MISSION.md");
    expect(result.manifest.firmIdentity?.files).toContain("company-hq/CORE.md");
    expect(result.manifest.firmIdentity?.files).toContain(
      "company-hq/mission-contracts/mission-autonomy-lane-v1.md",
    );
    expect(result.manifest.firmIdentity?.files).toContain(
      "company-hq/mission-contracts/first-live-mission-cell-proof-v1.md",
    );
    expect(result.manifest.firmIdentity?.files).toContain(
      "company-hq/mission-contracts/repeatable-live-mission-cell-proof-v1.md",
    );
    expect(result.manifest.firmIdentity?.files).toContain(
      "company-hq/mission-contracts/long-autonomy-mission-template.md",
    );
    expect(result.manifest.firmIdentity?.files).toContain(
      "company-hq/mission-cells/first-live-mission-cell-proof-v1.json",
    );
    expect(result.manifest.firmIdentity?.files).toContain(
      "company-hq/mission-cells/repeatable-live-mission-cell-proof-v1.json",
    );
    expect(result.manifest.firmIdentity?.files).toContain(
      "company-hq/mission-contracts/mission-cell-starter-path-v1.md",
    );
    expect(result.manifest.firmIdentity?.files).toContain(
      "company-hq/mission-cells/mission-cell-starter-path-v1.json",
    );
    expect(result.files["FIRM-IDENTITY.md"]).toContain("Paperclip is the current carrier");
    expect(result.files["CURRENT.md"]).toContain("mission-autonomy-lane-v1");
    expect(result.files["company-hq/ACTIVE-MISSION.md"]).toContain(
      "first-live-mission-cell-proof-v1",
    );
    expect(result.files["company-hq/mission-contracts/mission-autonomy-lane-v1.md"]).toContain(
      "first-live-mission-cell-proof-v1",
    );
    expect(result.files["company-hq/mission-contracts/first-live-mission-cell-proof-v1.md"]).toContain(
      "proof-discovered hardening",
    );
    expect(result.files["company-hq/mission-contracts/repeatable-live-mission-cell-proof-v1.md"]).toContain(
      "live run B",
    );
    expect(result.files["company-hq/mission-cells/first-live-mission-cell-proof-v1.json"]).toContain(
      '"missionCellId": "first-live-mission-cell-proof-v1"',
    );
    expect(result.files["company-hq/mission-cells/repeatable-live-mission-cell-proof-v1.json"]).toContain(
      '"missionCellId": "repeatable-live-mission-cell-proof-v1"',
    );
    expect(result.files["company-hq/mission-cells/mission-cell-starter-path-v1.json"]).toContain(
      '"missionCellId": "mission-cell-starter-path-v1"',
    );
  });

  it("can read back a manifest folder that includes firm identity files", async () => {
    const svc = companyPortabilityService({} as never);
    const exported = await svc.exportBundle("company-1", {
      include: {
        company: false,
        agents: false,
        firmIdentity: true,
      },
    });

    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-firm-identity-export-"));
    await fs.writeFile(
      path.join(root, "paperclip.manifest.json"),
      JSON.stringify(exported.manifest, null, 2),
      "utf8",
    );
    for (const [relativePath, content] of Object.entries(exported.files)) {
      const target = path.join(root, relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf8");
    }

    const manifestRaw = JSON.parse(
      await fs.readFile(path.join(root, "paperclip.manifest.json"), "utf8"),
    ) as { firmIdentity?: { path: string; files: string[] } | null };

    expect(manifestRaw.firmIdentity?.path).toBe("FIRM-IDENTITY.md");
    const firmIdentityDoc = await fs.readFile(path.join(root, "FIRM-IDENTITY.md"), "utf8");
    expect(firmIdentityDoc).toContain("Durable recovery principles");
    const coreDoc = await fs.readFile(path.join(root, "company-hq/CORE.md"), "utf8");
    expect(coreDoc).toContain("Eternal mission");
  });
});
