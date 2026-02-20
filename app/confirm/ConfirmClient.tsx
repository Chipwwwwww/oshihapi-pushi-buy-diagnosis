"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Decisiveness } from "@/src/oshihapi/model";
import { normalizeMode } from "@/src/oshihapi/modeConfig";
import { parseDecisiveness, decisivenessLabels, decisivenessOptions, DECISIVENESS_STORAGE_KEY } from "@/src/oshihapi/decisiveness";
import { getStyleModeFromSearchParams, setStyleModeToLocalStorage, type StyleMode } from "@/src/oshihapi/modes/useStyleMode";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { containerClass, helperTextClass, pageTitleClass, sectionTitleClass } from "@/components/ui/tokens";
import { buildConfirmSettingsUrl, buildConfirmUrl, buildFlowUrl, modeLabelMap } from "./confirmQuery";

const styleModeLabels = {
  standard: "標準",
  kawaii: "かわいい",
  oshi: "推し活用語",
} as const;

type ConfirmStep = "summary" | "style" | "decisiveness";

const stepOrder: ConfirmStep[] = ["summary", "style", "decisiveness"];

const parseStep = (value: string | null): ConfirmStep => {
  if (value === "style" || value === "decisiveness") {
    return value;
  }
  return "summary";
};

export default function ConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = normalizeMode(searchParams.get("mode"));
  const styleMode = getStyleModeFromSearchParams(searchParams) ?? "standard";
  const decisiveness = parseDecisiveness(searchParams.get("decisiveness"));
  const step = parseStep(searchParams.get("step"));

  const replaceQuery = (updates: Record<string, string | null>) => {
    router.replace(buildConfirmUrl(searchParams, updates));
  };

  const moveStep = (nextStep: ConfirmStep) => {
    replaceQuery({ step: nextStep === "summary" ? null : nextStep });
  };

  const handleStyleModeChange = (nextMode: StyleMode) => {
    replaceQuery({ styleMode: nextMode });
    setStyleModeToLocalStorage(nextMode);
  };

  const handleDecisivenessChange = (value: Decisiveness) => {
    replaceQuery({ decisiveness: value });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DECISIVENESS_STORAGE_KEY, value);
    }
  };

  const summary = useMemo(() => {
    return [
      modeLabelMap[mode],
      searchParams.get("templateUsed") === "1" ? "テンプレあり" : "テンプレなし",
      `決め切り度: ${decisivenessLabels[decisiveness]}`,
      `表示スタイル: ${styleModeLabels[styleMode]}`,
    ];
  }, [decisiveness, mode, searchParams, styleMode]);

  const currentStepIndex = stepOrder.indexOf(step);

  return (
    <div className={`${containerClass} flex min-h-screen flex-col gap-4 py-5 pb-[calc(env(safe-area-inset-bottom)+92px)]`}>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-accent">確認/調整（任意）</p>
        <h1 className={pageTitleClass}>このまま診断へ進みますか？</h1>
        <div className="flex items-center gap-2">
          {stepOrder.map((stepName, index) => (
            <button
              key={stepName}
              type="button"
              aria-label={`ステップ${index + 1}`}
              onClick={() => moveStep(stepName)}
              className={`h-2.5 w-2.5 rounded-full transition ${step === stepName ? "bg-primary" : "bg-slate-300 dark:bg-white/20"}`}
            />
          ))}
        </div>
      </header>

      {step === "summary" ? (
        <Card className="space-y-3 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <h2 className={sectionTitleClass}>現在の選択サマリー</h2>
          <div className="flex flex-wrap gap-2">
            {summary.map((label) => (
              <Badge
                key={label}
                variant="outline"
                className="border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/6 dark:text-zinc-200"
              >
                {label}
              </Badge>
            ))}
          </div>
          <p className={helperTextClass}>種別を選ぶと質問が最適化されます</p>
        </Card>
      ) : null}

      {step === "style" ? (
        <Card className="space-y-3 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <h2 className={sectionTitleClass}>表示スタイル</h2>
          <p className={helperTextClass}>文言・トーンのみ切り替わります。</p>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-2 dark:border-white/10 dark:bg-white/6">
            {(["standard", "kawaii", "oshi"] as const).map((modeOption) => (
              <button
                key={modeOption}
                type="button"
                onClick={() => handleStyleModeChange(modeOption)}
                className={[
                  "min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition",
                  styleMode === modeOption
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-transparent text-slate-700 hover:bg-white dark:text-zinc-200 dark:hover:bg-white/10",
                ].join(" ")}
              >
                {styleModeLabels[modeOption]}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {step === "decisiveness" ? (
        <Card className="space-y-3 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <h2 className={sectionTitleClass}>決め切り度</h2>
          <div className="grid grid-cols-3 gap-2">
            {decisivenessOptions.map((option) => (
              <Button
                key={option.value}
                variant={decisiveness === option.value ? "primary" : "outline"}
                onClick={() => handleDecisivenessChange(option.value)}
                className="rounded-xl px-2"
              >
                {option.label}
              </Button>
            ))}
          </div>
          <p className={helperTextClass}>いまは「{decisivenessLabels[decisiveness]}」。</p>
        </Card>
      ) : null}

      <div className="mt-auto" />

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[520px] flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
          {step === "summary" ? (
            <>
              <Button
                onClick={() => router.push(buildConfirmSettingsUrl(searchParams, { step: "kind" }))}
                className="w-full text-base"
              >
                入力を追加して精度を上げる（任意）
              </Button>
              <Button variant="outline" onClick={() => router.push(buildFlowUrl(searchParams))} className="w-full text-base">
                このまま診断へ（かんたん）
              </Button>
              <Button variant="ghost" onClick={() => moveStep("style")} className="w-full text-sm">
                調整する（表示スタイルへ）
              </Button>
            </>
          ) : null}

          {step === "style" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => moveStep("summary")} className="w-full text-base">
                戻る
              </Button>
              <Button onClick={() => moveStep("decisiveness")} className="w-full text-base">
                次へ
              </Button>
            </div>
          ) : null}

          {step === "decisiveness" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => moveStep("style")} className="w-full text-base">
                戻る
              </Button>
              <Button onClick={() => router.push(buildFlowUrl(searchParams))} className="w-full text-base">
                診断へ
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <p className="sr-only">現在のステップ: {currentStepIndex + 1}</p>
    </div>
  );
}
