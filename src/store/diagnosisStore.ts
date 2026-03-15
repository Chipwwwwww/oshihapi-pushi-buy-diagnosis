import type { AnswerValue, Decisiveness, GoodsClass, InputMeta, ItemKind, Mode } from "@/src/oshihapi/model";

const STORAGE_KEY = "oshihapi:diagnosis:flow";

export type DiagnosisMeta = Pick<InputMeta, "itemName" | "priceYen" | "deadline" | "itemKind" | "goodsClass">;

export type DiagnosisState = {
  answers: Record<string, AnswerValue>;
  currentQuestionIndex: number;
  mode: Mode;
  itemKind: ItemKind;
  goodsClass: GoodsClass;
  decisiveness: Decisiveness;
  meta: DiagnosisMeta;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function loadDiagnosisState(): DiagnosisState | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DiagnosisState;
  } catch {
    return null;
  }
}

export function saveDiagnosisState(state: DiagnosisState) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearDiagnosisState() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
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
