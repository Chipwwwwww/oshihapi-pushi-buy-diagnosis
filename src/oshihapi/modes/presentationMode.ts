import type { ReadonlyURLSearchParams } from "next/navigation";
import type { ResultMode } from "@/src/oshihapi/modes/mode_dictionary";

export const PRESENTATION_MODE_STORAGE_KEY = "oshihapi:presentationMode";
export type PresentationMode = ResultMode;

const isPresentationMode = (value: string | null | undefined): value is PresentationMode =>
  value === "standard" || value === "kawaii" || value === "oshi";

export function getModeFromUrl(
  searchParams?: URLSearchParams | ReadonlyURLSearchParams | null,
): PresentationMode | undefined {
  const fromPm = searchParams?.get("pm");
  if (isPresentationMode(fromPm)) return fromPm;

  const fromLegacy = searchParams?.get("pmode");
  if (isPresentationMode(fromLegacy)) return fromLegacy;

  return undefined;
}

export function getModeFromLocalStorage(): PresentationMode | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.localStorage.getItem(PRESENTATION_MODE_STORAGE_KEY);
  return isPresentationMode(value) ? value : undefined;
}

export function setModeToLocalStorage(mode: PresentationMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRESENTATION_MODE_STORAGE_KEY, mode);
}

export function resolveMode(input?: {
  url?: URLSearchParams | ReadonlyURLSearchParams | null;
  ls?: string | null;
}): PresentationMode {
  const fromUrl = getModeFromUrl(input?.url);
  if (fromUrl) return fromUrl;

  if (isPresentationMode(input?.ls)) return input.ls;

  const fromStorage = getModeFromLocalStorage();
  if (fromStorage) return fromStorage;

  return "standard";
}
