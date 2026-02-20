"use client";

import type { Decisiveness, ItemKind } from "@/src/oshihapi/model";
import type { StyleMode } from "@/src/oshihapi/modes/useStyleMode";
import AdvancedSettingsPanel from "@/components/AdvancedSettingsPanel";

type DeadlineValue = "today" | "tomorrow" | "in3days" | "in1week" | "unknown";

type HomeAdvancedSettingsProps = {
  styleMode: StyleMode;
  styleOptionLabel: Record<StyleMode, string>;
  styleSectionTitle: string;
  styleSectionHelp: string;
  decisiveness: Decisiveness;
  itemName: string;
  itemNamePlaceholder: string;
  priceYen: string;
  deadline: DeadlineValue;
  itemKind: ItemKind;
  deadlineOptions: ReadonlyArray<{ value: DeadlineValue; label: string }>;
  itemKindOptions: ReadonlyArray<{ value: ItemKind; label: string }>;
  onStyleModeChange: (mode: StyleMode) => void;
  onDecisivenessChange: (value: Decisiveness) => void;
  onItemNameChange: (value: string) => void;
  onPriceYenChange: (value: string) => void;
  onDeadlineChange: (value: DeadlineValue) => void;
  onItemKindChange: (value: ItemKind) => void;
};

export default function HomeAdvancedSettings(props: HomeAdvancedSettingsProps) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-white/6 dark:text-zinc-100">
        詳細設定（任意）
        <span className="ml-2 text-xs font-normal text-slate-500 dark:text-zinc-300">
          必要なときだけ開いて調整できます
        </span>
      </summary>
      <div className="mt-3">
        <AdvancedSettingsPanel {...props} />
      </div>
    </details>
  );
}
