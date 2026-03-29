import type { IssuePriority, IssueStatus } from "../constants.js";
import type { Goal } from "./goal.js";
import type { Project, ProjectWorkspace } from "./project.js";
import type { IssueExecutionWorkspaceSettings } from "./workspace-runtime.js";

export interface IssueAncestorProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  goalId: string | null;
  workspaces: ProjectWorkspace[];
  primaryWorkspace: ProjectWorkspace | null;
}

export interface IssueAncestorGoal {
  id: string;
  title: string;
  description: string | null;
  level: string;
  status: string;
}

export interface IssueAncestor {
  id: string;
  identifier: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  projectId: string | null;
  goalId: string | null;
  project: IssueAncestorProject | null;
  goal: IssueAncestorGoal | null;
}

export interface IssueLabel {
  id: string;
  companyId: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssueAssigneeAdapterOverrides {
  adapterConfig?: Record<string, unknown>;
  useProjectWorkspace?: boolean;
}

export type DocumentFormat = "markdown";

export interface IssueDocumentSummary {
  id: string;
  companyId: string;
  issueId: string;
  key: string;
  title: string | null;
  format: DocumentFormat;
  latestRevisionId: string | null;
  latestRevisionNumber: number;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  updatedByAgentId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssueDocument extends IssueDocumentSummary {
  body: string;
}

export interface DocumentRevision {
  id: string;
  companyId: string;
  documentId: string;
  issueId: string;
  key: string;
  revisionNumber: number;
  body: string;
  changeSummary: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
}

export interface LegacyPlanDocument {
  key: "plan";
  body: string;
  source: "issue_description";
}

export type IssueExecutionPacketReadinessStatus =
  | "not_applicable"
  | "ready"
  | "not_ready";

export type IssueExecutionPacketReasonCode =
  | "target_file_missing"
  | "target_folder_missing"
  | "artifact_kind_missing"
  | "donewhen_missing"
  | "execution_scope_ambiguous";

export type IssueExecutionPacketArtifactKind =
  | "code_patch"
  | "doc_update"
  | "config_change"
  | "test_update"
  | "multi_file_change"
  | "folder_operation";

export interface IssueExecutionPacketTruth {
  packetType: string | null;
  executionIntent: string | null;
  reviewPolicy: string | null;
  needsReview: boolean | null;
  targetFile: string | null;
  targetFolder: string | null;
  doneWhen: string | null;
  artifactKind: IssueExecutionPacketArtifactKind | null;
  scopeMode: "none" | "file" | "folder" | "mixed";
  executionHeavy: boolean;
  ready: boolean;
  status: IssueExecutionPacketReadinessStatus;
  reasonCodes: IssueExecutionPacketReasonCode[];
  triad: IssueTriadPacketTruth;
}

export type IssueTriadPacketSource = "missing" | "derived" | "explicit";

export type IssueTriadCeoCutStatus = "missing" | "partial" | "ready";

export interface IssueTriadWorkerPacketTruth {
  source: IssueTriadPacketSource;
  goal: string | null;
  scope: string | null;
  doneWhen: string | null;
}

export interface IssueTriadReviewerPacketTruth {
  source: IssueTriadPacketSource;
  focus: string | null;
  acceptWhen: string | null;
  changeWhen: string | null;
}

export interface IssueTriadPacketTruth {
  ceoCutStatus: IssueTriadCeoCutStatus;
  workerPacket: IssueTriadWorkerPacketTruth;
  reviewerPacket: IssueTriadReviewerPacketTruth;
}

export interface Issue {
  id: string;
  companyId: string;
  projectId: string | null;
  goalId: string | null;
  parentId: string | null;
  ancestors?: IssueAncestor[];
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  checkoutRunId: string | null;
  executionRunId: string | null;
  executionAgentNameKey: string | null;
  executionLockedAt: Date | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  issueNumber: number | null;
  identifier: string | null;
  requestDepth: number;
  billingCode: string | null;
  assigneeAdapterOverrides: IssueAssigneeAdapterOverrides | null;
  executionWorkspaceSettings: IssueExecutionWorkspaceSettings | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  hiddenAt: Date | null;
  labelIds?: string[];
  labels?: IssueLabel[];
  planDocument?: IssueDocument | null;
  documentSummaries?: IssueDocumentSummary[];
  legacyPlanDocument?: LegacyPlanDocument | null;
  project?: Project | null;
  goal?: Goal | null;
  mentionedProjects?: Project[];
  executionPacketTruth?: IssueExecutionPacketTruth | null;
  myLastTouchAt?: Date | null;
  lastExternalCommentAt?: Date | null;
  isUnreadForMe?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssueComment {
  id: string;
  companyId: string;
  issueId: string;
  authorAgentId: string | null;
  authorUserId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkerHandoffSummary {
  goal: string;
  result: string;
  files: string[];
  blockers: string;
  next: string;
}

export interface WorkerHandoff {
  prUrl: string;
  branch: string;
  commitHash: string;
  summary: WorkerHandoffSummary;
}

export type CompanyRunChainStageKey =
  | "assigned"
  | "run_started"
  | "worker_done"
  | "reviewer_assigned"
  | "reviewer_run"
  | "merged"
  | "parent_done";

export interface CompanyRunChainStage {
  key: CompanyRunChainStageKey;
  label: string;
  completed: boolean;
  at: Date | null;
  agentId: string | null;
  agentName: string | null;
  runId: string | null;
  note: string | null;
}

export interface CompanyRunChainChild {
  issueId: string;
  identifier: string | null;
  title: string;
  status: IssueStatus;
  assigneeAgentId: string | null;
  assigneeAgentName: string | null;
  stages: CompanyRunChainStage[];
  triad: CompanyRunChainTriadTruth;
}

export type CompanyRunChainTriadState =
  | "ready_to_build"
  | "in_execution"
  | "ready_for_review"
  | "changes_requested"
  | "ready_to_promote"
  | "type1_escalation";

export interface CompanyRunChainWorkerExecutionTruth {
  status: "not_started" | "in_execution" | "ready_for_review" | "completed";
  runId: string | null;
  branch: string | null;
  commitHash: string | null;
  prUrl: string | null;
  at: Date | null;
}

export interface CompanyRunChainReviewerVerdictTruth {
  verdict: "accepted" | "changes_requested" | null;
  approvalStatus: string | null;
  packet: string | null;
  doneWhenCheck: string | null;
  evidence: string | null;
  requiredFixes: string[];
  next: string | null;
  at: Date | null;
}

export type CompanyRunChainReviewerWakeStatus =
  | "queued"
  | "running"
  | "completed"
  | "stalled"
  | null;

export interface CompanyRunChainTriadTruth {
  state: CompanyRunChainTriadState;
  reviewerWakeStatus: CompanyRunChainReviewerWakeStatus;
  ceoCut: IssueTriadPacketTruth;
  workerExecution: CompanyRunChainWorkerExecutionTruth;
  reviewerVerdict: CompanyRunChainReviewerVerdictTruth;
  closeoutBlocker: CompanyRunChainParentBlocker | null;
}

export interface CompanyRunChainParentBlocker {
  blockerClass: string | null;
  blockerState: string | null;
  summary: string | null;
  knownBlocker: boolean;
  nextResumePoint: string | null;
  nextWakeStatus: string | null;
  nextWakeNotBefore: Date | null;
  resumeStrategy: string | null;
  resumeSource: string | null;
  resumeRunId: string | null;
  resumeRunStatus: string | null;
  resumeAt: Date | null;
  sameSessionPath: boolean;
}

export interface CompanyRunChain {
  parentIssueId: string;
  parentIdentifier: string | null;
  parentTitle: string;
  parentStatus: IssueStatus;
  focusIssueId: string | null;
  parentBlocker: CompanyRunChainParentBlocker | null;
  children: CompanyRunChainChild[];
}

export interface IssueAttachment {
  id: string;
  companyId: string;
  issueId: string;
  issueCommentId: string | null;
  assetId: string;
  provider: string;
  objectKey: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  originalFilename: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  contentPath: string;
}
