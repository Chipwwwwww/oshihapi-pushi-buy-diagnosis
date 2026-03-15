import { merch_v2_ja } from "@/src/oshihapi/merch_v2_ja";
import type { DiagnosticTrace, AnswerValue, Decisiveness, DecisionRun, GoodsClass, InputMeta, ItemKind, Mode } from "@/src/oshihapi/model";
import type { StyleMode } from "@/src/oshihapi/modes/useStyleMode";

const DRAFT_SCHEMA_VERSION = 1;
const DRAFT_STORAGE_KEY = "oshihapi:diagnosis:drafts:v1";
const DRAFT_INVALIDATION_LOG_KEY = "oshihapi:diagnosis:draft_invalidations:v1";
const FLOW_CONFIG_HASH = "flow-resolver-v4";

export type DiagnosisMeta = Pick<InputMeta, "itemName" | "priceYen" | "deadline" | "itemKind" | "goodsClass">;

export type DraftPersistenceState = "fresh" | "restored" | "invalidated" | "replaySeeded";

export type DraftRunContext = {
  mode: Mode;
  itemKind: ItemKind;
  goodsClass: GoodsClass;
  styleMode: StyleMode;
  itemName?: string;
  priceYen?: number;
  deadline?: InputMeta["deadline"];
};

export type DraftRun = {
  draftId: string;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
  questionBankVersion: number;
  flowConfigHash: string;
  runContext: DraftRunContext;
  decisiveness: Decisiveness;
  answers: Record<string, AnswerValue>;
  shownQuestionIds: string[];
  skippedQuestionIds: string[];
  currentQuestionIndex: number;
  currentQuestionId?: string;
  diagnosticTrace?: DiagnosticTrace;
  persistenceState: DraftPersistenceState;
  replaySeedRunId?: string;
};

export type DraftInvalidationLog = {
  draftId: string;
  invalidatedAt: number;
  reason: string;
  previousUpdatedAt: number;
};

export type DraftCompatibilityContext = {
  mode: Mode;
  itemKind: ItemKind;
  goodsClass: GoodsClass;
  styleMode: StyleMode;
};

export type DraftRestoreResult =
  | { status: "restored"; draft: DraftRun }
  | { status: "invalidated"; reason: string }
  | { status: "none" };

export type DiagnosisState = {
  answers: Record<string, AnswerValue>;
  currentQuestionIndex: number;
  mode: Mode;
  itemKind: ItemKind;
  goodsClass: GoodsClass;
  decisiveness: Decisiveness;
  styleMode: StyleMode;
  meta: DiagnosisMeta;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function readDrafts(): DraftRun[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DraftRun[]) : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: DraftRun[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

function appendInvalidationLog(log: DraftInvalidationLog) {
  if (!canUseStorage()) return;
  const raw = window.localStorage.getItem(DRAFT_INVALIDATION_LOG_KEY);
  let logs: DraftInvalidationLog[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) logs = parsed as DraftInvalidationLog[];
    } catch {
      logs = [];
    }
  }
  const nextLogs = [log, ...logs].slice(0, 30);
  window.localStorage.setItem(DRAFT_INVALIDATION_LOG_KEY, JSON.stringify(nextLogs));
}

function compareDraftRecency(a: DraftRun, b: DraftRun) {
  if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
  if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
  return a.draftId < b.draftId ? 1 : -1;
}

function getQuestionBankVersion(itemKind: ItemKind) {
  return itemKind === "game_billing" ? 1 : merch_v2_ja.version;
}

function validateDraftCompatibility(draft: DraftRun, context: DraftCompatibilityContext) {
  if (draft.schemaVersion !== DRAFT_SCHEMA_VERSION) return "schema_version_mismatch";
  if (draft.questionBankVersion !== getQuestionBankVersion(context.itemKind)) return "question_bank_version_mismatch";
  if (draft.flowConfigHash !== FLOW_CONFIG_HASH) return "flow_config_hash_mismatch";
  if (draft.runContext.mode !== context.mode) return "mode_mismatch";
  if (draft.runContext.itemKind !== context.itemKind) return "item_kind_mismatch";
  if (draft.runContext.goodsClass !== context.goodsClass) return "goods_class_mismatch";
  if (draft.runContext.styleMode !== context.styleMode) return "style_mode_mismatch";
  if (draft.currentQuestionId && !draft.shownQuestionIds.includes(draft.currentQuestionId)) return "current_question_not_in_path";
  if (draft.currentQuestionIndex < 0 || draft.currentQuestionIndex > Math.max(0, draft.shownQuestionIds.length - 1)) return "current_index_out_of_range";
  const allowedQuestions = new Set(draft.shownQuestionIds);
  const hasInvalidAnswers = Object.keys(draft.answers).some((id) => !allowedQuestions.has(id));
  if (hasInvalidAnswers) return "answers_reference_removed_question";
  return null;
}

export function loadDrafts() {
  return readDrafts().sort(compareDraftRecency);
}

export function loadDraftById(draftId: string): DraftRun | null {
  return readDrafts().find((draft) => draft.draftId === draftId) ?? null;
}

export function findLatestCompatibleDraft(context: DraftCompatibilityContext): DraftRestoreResult {
  const drafts = readDrafts().sort(compareDraftRecency);
  for (const draft of drafts) {
    const reason = validateDraftCompatibility(draft, context);
    if (!reason) {
      return {
        status: "restored",
        draft: {
          ...draft,
          persistenceState: "restored",
          updatedAt: Date.now(),
        },
      };
    }
    appendInvalidationLog({
      draftId: draft.draftId,
      invalidatedAt: Date.now(),
      reason,
      previousUpdatedAt: draft.updatedAt,
    });
  }
  if (drafts.length > 0) {
    return { status: "invalidated", reason: "no_compatible_draft" };
  }
  return { status: "none" };
}

export function saveDraft(draft: DraftRun) {
  const drafts = readDrafts();
  const nextDraft: DraftRun = {
    ...draft,
    schemaVersion: DRAFT_SCHEMA_VERSION,
    questionBankVersion: getQuestionBankVersion(draft.runContext.itemKind),
    flowConfigHash: FLOW_CONFIG_HASH,
    updatedAt: Date.now(),
  };
  const filtered = drafts.filter((entry) => entry.draftId !== nextDraft.draftId);
  writeDrafts([nextDraft, ...filtered].sort(compareDraftRecency).slice(0, 15));
  return nextDraft;
}

export function clearDraft(draftId: string) {
  const drafts = readDrafts();
  writeDrafts(drafts.filter((draft) => draft.draftId !== draftId));
}

export function clearCompatibleDrafts(context: DraftCompatibilityContext) {
  const drafts = readDrafts();
  writeDrafts(
    drafts.filter(
      (draft) =>
        draft.runContext.mode !== context.mode ||
        draft.runContext.itemKind !== context.itemKind ||
        draft.runContext.goodsClass !== context.goodsClass ||
        draft.runContext.styleMode !== context.styleMode,
    ),
  );
}

export function createReplayDraft(run: DecisionRun, styleMode: StyleMode): DraftRun {
  const now = Date.now();
  const itemKind = (run.meta.itemKind ?? "goods") as ItemKind;
  const goodsClass = (run.meta.goodsClass ?? "small_collection") as GoodsClass;
  const shownQuestionIds = run.diagnosticTrace?.shownQuestionIds ?? Object.keys(run.answers);
  const currentQuestionId = shownQuestionIds.at(0);
  return saveDraft({
    draftId: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    schemaVersion: DRAFT_SCHEMA_VERSION,
    questionBankVersion: getQuestionBankVersion(itemKind),
    flowConfigHash: FLOW_CONFIG_HASH,
    runContext: {
      mode: run.mode,
      itemKind,
      goodsClass,
      styleMode,
      itemName: run.meta.itemName,
      priceYen: run.meta.priceYen,
      deadline: run.meta.deadline,
    },
    decisiveness: run.decisiveness ?? "standard",
    answers: { ...run.answers },
    shownQuestionIds,
    skippedQuestionIds: run.diagnosticTrace?.skippedQuestionIds ?? [],
    currentQuestionIndex: 0,
    currentQuestionId,
    diagnosticTrace: run.diagnosticTrace,
    persistenceState: "replaySeeded",
    replaySeedRunId: run.runId,
  });
}

export function loadDraftInvalidationLogs(): DraftInvalidationLog[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(DRAFT_INVALIDATION_LOG_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DraftInvalidationLog[]) : [];
  } catch {
    return [];
  }
}

export function loadDiagnosisState(): DiagnosisState | null {
  const latest = loadDrafts()[0];
  if (!latest) return null;
  return {
    answers: latest.answers,
    currentQuestionIndex: latest.currentQuestionIndex,
    mode: latest.runContext.mode,
    itemKind: latest.runContext.itemKind,
    goodsClass: latest.runContext.goodsClass,
    decisiveness: latest.decisiveness,
    styleMode: latest.runContext.styleMode,
    meta: {
      itemName: latest.runContext.itemName,
      priceYen: latest.runContext.priceYen,
      deadline: latest.runContext.deadline,
      itemKind: latest.runContext.itemKind,
      goodsClass: latest.runContext.goodsClass,
    },
  };
}

export function saveDiagnosisState(state: DiagnosisState) {
  saveDraft({
    draftId: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    schemaVersion: DRAFT_SCHEMA_VERSION,
    questionBankVersion: getQuestionBankVersion(state.itemKind),
    flowConfigHash: FLOW_CONFIG_HASH,
    runContext: {
      mode: state.mode,
      itemKind: state.itemKind,
      goodsClass: state.goodsClass,
      styleMode: state.styleMode,
      itemName: state.meta.itemName,
      priceYen: state.meta.priceYen,
      deadline: state.meta.deadline,
    },
    decisiveness: state.decisiveness,
    answers: state.answers,
    shownQuestionIds: Object.keys(state.answers),
    skippedQuestionIds: [],
    currentQuestionIndex: state.currentQuestionIndex,
    currentQuestionId: Object.keys(state.answers)[state.currentQuestionIndex],
    persistenceState: "fresh",
  });
}

export function clearDiagnosisState() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function buildPriceKey(itemKind: ItemKind) {
  return `price:${itemKind}`;
}

export function loadPriceByItemKind(itemKind: ItemKind): number | undefined {
  if (!canUseStorage()) return undefined;
  const raw = window.localStorage.getItem(buildPriceKey(itemKind));
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function savePriceByItemKind(itemKind: ItemKind, value: number | undefined) {
  if (!canUseStorage() || value == null || !Number.isFinite(value)) return;
  window.localStorage.setItem(buildPriceKey(itemKind), String(value));
}
