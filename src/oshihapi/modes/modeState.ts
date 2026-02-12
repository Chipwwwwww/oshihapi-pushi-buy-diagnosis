import type { ReadonlyURLSearchParams } from "next/navigation";
import type { ResultMode } from "@/src/oshihapi/modes/mode_dictionary";

export const MODE_STORAGE_KEY = "oshihapi:presentationMode";
export type ModeId = ResultMode;

const isModeId = (value: string | null | undefined): value is ModeId =>
  value === "standard" || value === "kawaii" || value === "oshi";

export function resolveMode(searchParams?: URLSearchParams | ReadonlyURLSearchParams | null): ModeId {
  const fromParam = searchParams?.get("pmode");
  if (isModeId(fromParam)) return fromParam;

  if (typeof window !== "undefined") {
    const fromStorage = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (isModeId(fromStorage)) return fromStorage;
  }

  return "standard";
}

export function setStoredMode(mode: ModeId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODE_STORAGE_KEY, mode);
}
