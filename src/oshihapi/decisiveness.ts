import type { Decisiveness } from "./model";

export const DECISIVENESS_STORAGE_KEY = "oshihapi:decisiveness";

export const decisivenessLabels: Record<Decisiveness, string> = {
  careful: "慎重",
  standard: "標準",
  quick: "即決",
};

export const decisivenessOptions: { value: Decisiveness; label: string }[] = [
  { value: "careful", label: "慎重" },
  { value: "standard", label: "標準" },
  { value: "quick", label: "即決" },
];

export function parseDecisiveness(value: string | null | undefined): Decisiveness {
  if (value === "careful" || value === "quick" || value === "standard") {
    return value;
  }
  return "standard";
}
