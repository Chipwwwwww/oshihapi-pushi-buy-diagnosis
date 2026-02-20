"use client";

import { useEffect } from "react";
import type { ScenarioCard, SituationChip } from "@/src/oshihapi/modeGuide";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RadioCard from "@/components/ui/RadioCard";
import { sectionTitleClass } from "@/components/ui/tokens";

type StartTemplateDrawerProps = {
  isOpen: boolean;
  selectedMode: ScenarioCard["mode"];
  chips: SituationChip[];
  scenarios: ScenarioCard[];
  onClose: () => void;
  onSelectChip: (chip: SituationChip) => void;
  onSelectScenario: (scenario: ScenarioCard) => void;
  deadlineLabelMap: Map<string, string>;
  itemKindLabelMap: Map<string, string>;
};

export default function StartTemplateDrawer({
  isOpen,
  selectedMode,
  chips,
  scenarios,
  onClose,
  onSelectChip,
  onSelectScenario,
  deadlineLabelMap,
  itemKindLabelMap,
}: StartTemplateDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="テンプレで始める">
      <button
        type="button"
        aria-label="テンプレ選択を閉じる"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-[#101524]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />
        <div className="space-y-5">
          <section className="space-y-3">
            <h2 className={sectionTitleClass}>状況から選ぶ</h2>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Button
                  key={chip.id}
                  variant={selectedMode === chip.mode ? "primary" : "outline"}
                  onClick={() => onSelectChip(chip)}
                  className="rounded-full px-4"
                >
                  {chip.label}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className={sectionTitleClass}>例から選ぶ</h2>
            <div className="grid gap-3">
              {scenarios.map((scenario) => (
                <RadioCard
                  key={scenario.id}
                  title={scenario.title}
                  description={scenario.description}
                  isSelected={selectedMode === scenario.mode}
                  onClick={() => onSelectScenario(scenario)}
                  footer={
                    scenario.preset ? (
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-zinc-300">
                        {scenario.preset.priceYen ? <Badge variant="outline">¥{scenario.preset.priceYen.toLocaleString()}</Badge> : null}
                        {scenario.preset.deadline ? (
                          <Badge variant="outline">
                            締切: {deadlineLabelMap.get(scenario.preset.deadline) ?? scenario.preset.deadline}
                          </Badge>
                        ) : null}
                        {scenario.preset.itemKind ? (
                          <Badge variant="outline">
                            種別: {itemKindLabelMap.get(scenario.preset.itemKind) ?? scenario.preset.itemKind}
                          </Badge>
                        ) : null}
                      </div>
                    ) : null
                  }
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
