"use client";

import type { Decisiveness, ItemKind } from "@/src/oshihapi/model";
import type { StyleMode } from "@/src/oshihapi/modes/useStyleMode";
import { decisivenessLabels, decisivenessOptions } from "@/src/oshihapi/decisiveness";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  helperTextClass,
  inputBaseClass,
  sectionTitleClass,
} from "@/components/ui/tokens";

type DeadlineValue = "today" | "tomorrow" | "in3days" | "in1week" | "unknown";

type AdvancedSettingsPanelProps = {
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

export default function AdvancedSettingsPanel({
  styleMode,
  styleOptionLabel,
  styleSectionTitle,
  styleSectionHelp,
  decisiveness,
  itemName,
  itemNamePlaceholder,
  priceYen,
  deadline,
  itemKind,
  deadlineOptions,
  itemKindOptions,
  onStyleModeChange,
  onDecisivenessChange,
  onItemNameChange,
  onPriceYenChange,
  onDeadlineChange,
  onItemKindChange,
}: AdvancedSettingsPanelProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>{styleSectionTitle}</h2>
        <p className={helperTextClass}>{styleSectionHelp}</p>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-2 dark:border-white/10 dark:bg-white/6">
          {(["standard", "kawaii", "oshi"] as const).map((modeOption) => (
            <button
              key={modeOption}
              type="button"
              onClick={() => onStyleModeChange(modeOption)}
              className={[
                "min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition",
                styleMode === modeOption
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-transparent text-slate-700 hover:bg-white dark:text-zinc-200 dark:hover:bg-white/10",
              ].join(" ")}
            >
              {styleOptionLabel[modeOption]}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>決め切り度</h2>
        <div className="grid grid-cols-3 gap-2">
          {decisivenessOptions.map((option) => (
            <Button
              key={option.value}
              variant={decisiveness === option.value ? "primary" : "outline"}
              onClick={() => onDecisivenessChange(option.value)}
              className="rounded-xl px-2"
            >
              {option.label}
            </Button>
          ))}
        </div>
        <p className={helperTextClass}>
          いまは「{decisivenessLabels[decisiveness]}」。標準は従来と同じ判定です。
        </p>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>入力（任意）</h2>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            商品名
            <input
              value={itemName}
              onChange={(event) => onItemNameChange(event.target.value)}
              className={inputBaseClass}
              placeholder={itemNamePlaceholder}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            価格（円）
            <input
              type="number"
              min="0"
              value={priceYen}
              onChange={(event) => onPriceYenChange(event.target.value)}
              className={inputBaseClass}
              placeholder="例：8800"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            締切
            <select
              value={deadline}
              onChange={(event) => onDeadlineChange(event.target.value as DeadlineValue)}
              className={inputBaseClass}
            >
              {deadlineOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            種別
            <select
              value={itemKind}
              onChange={(event) => onItemKindChange(event.target.value as ItemKind)}
              className={inputBaseClass}
            >
              {itemKindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>
    </div>
  );
}
