import type {
  CapabilityMaturityState,
  CapabilityVerifyMethod,
} from "../constants.js";

export interface CapabilityPrimitive {
  id: string;
  title: string;
  description: string;
  required: boolean;
  evidenceMarkers: string[];
}

export interface CapabilityContractBody {
  intent: string;
  scopeIn: string[];
  scopeOut: string[];
  inputsRequired: string[];
  allowedActions: string[];
  forbiddenActions: string[];
  successCriteria: string[];
  failureModes: string[];
  rollbackPlan: string;
}

export interface CapabilityVerificationSpec {
  method: CapabilityVerifyMethod;
  runIds: string[];
  requiredMarkers: string[];
  requiredPrimitiveIds: string[];
  minDistinctRuns: number;
  notes: string | null;
}

export interface CapabilitySkillContract {
  schemaVersion: "v1";
  capabilityId: string;
  title: string;
  summary: string;
  owners: string[];
  maturity: CapabilityMaturityState;
  updatedAt: string;
  contract: CapabilityContractBody;
  primitives: CapabilityPrimitive[];
  verify: CapabilityVerificationSpec;
}
