export type MissionCellStatus = "draft" | "active" | "retired";

export interface MissionCellCharter {
  objective: string;
  primaryMetric: string;
  guardMetrics: string[];
  budget: string;
  runtime: string;
  blastRadius: string[];
  allowedZones: string[];
  forbiddenZones: string[];
}

export interface MissionCellDecisionPolicy {
  type2Autonomy: string[];
  type1Escalations: string[];
  escalationPath: string[];
}

export interface MissionCellRiskGate {
  oberreviewerTriggers: string[];
  requiredEvidence: string[];
  stopReasons: string[];
}

export interface MissionCellEvalSpec {
  replayChecks: string[];
  guardChecks: string[];
  successSignals: string[];
}

export interface MissionCellPromotionSpec {
  defaultTargets: string[];
  promoteWhen: string[];
  stayExperimentalWhen: string[];
  demoteWhen: string[];
}

export interface MissionCellBoundarySpec {
  firmBound: string[];
  carrierBound: string[];
}

export interface MissionCellStarterPath {
  trigger: string;
  issueTemplate: string[];
  startupSequence: string[];
  firstProbe: string[];
}

export interface MissionCellContract {
  schemaVersion: "v1";
  missionCellId: string;
  title: string;
  summary: string;
  owners: string[];
  status: MissionCellStatus;
  updatedAt: string;
  charter: MissionCellCharter;
  decisionPolicy: MissionCellDecisionPolicy;
  riskGate: MissionCellRiskGate;
  eval: MissionCellEvalSpec;
  promotion: MissionCellPromotionSpec;
  boundaries: MissionCellBoundarySpec;
  starterPath: MissionCellStarterPath;
}