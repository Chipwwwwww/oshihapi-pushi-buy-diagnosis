"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";

export type StyleMode = "standard" | "kawaii" | "oshi";

export const STYLE_MODE_STORAGE_KEY = "oshihapi:styleMode";

export function resolveStyleMode(input?: string | null): StyleMode {
  return input === "kawaii" || input === "oshi" || input === "standard"
    ? input
    : "standard";
}

export function getStyleModeFromSearchParams(
  searchParams?: URLSearchParams | ReadonlyURLSearchParams | null,
): StyleMode | undefined {
  const value = searchParams?.get("styleMode") ?? searchParams?.get("pm") ?? undefined;
  return value ? resolveStyleMode(value) : undefined;
}

export function getStyleModeFromLocalStorage(): StyleMode {
  if (typeof window === "undefined") return "standard";
  return resolveStyleMode(window.localStorage.getItem(STYLE_MODE_STORAGE_KEY));
}

export function setStyleModeToLocalStorage(mode: StyleMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STYLE_MODE_STORAGE_KEY, mode);
}

export function useStyleMode(initial?: {
  searchParams?: URLSearchParams | ReadonlyURLSearchParams | null;
  value?: string | null;
}) {
  const initialMode = useMemo(
    () =>
      getStyleModeFromSearchParams(initial?.searchParams) ??
      (initial?.value ? resolveStyleMode(initial.value) : getStyleModeFromLocalStorage()),
    [initial],
  );

  const [styleMode, setStyleMode] = useState<StyleMode>(initialMode);

  const updateStyleMode = useCallback((nextMode: StyleMode) => {
    setStyleMode(nextMode);
    setStyleModeToLocalStorage(nextMode);
  }, []);

  return { styleMode, setStyleMode: updateStyleMode };
}
