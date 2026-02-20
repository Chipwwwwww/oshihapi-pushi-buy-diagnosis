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

export default function ConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = normalizeMode(searchParams.get("mode"));
  const styleMode = getStyleModeFromSearchParams(searchParams) ?? "standard";
  const decisiveness = parseDecisiveness(searchParams.get("decisiveness"));

  const replaceQuery = (updates: Record<string, string | null>) => {
    router.replace(buildConfirmUrl(searchParams, updates));
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

  return (
    <div className={`${containerClass} flex min-h-screen flex-col justify-center gap-5 py-8`}>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-accent">確認/調整（任意）</p>
        <h1 className={pageTitleClass}>このまま診断へ進みますか？</h1>
        <p className={helperTextClass}>不要なら変更せず、そのまま次へ進めます。</p>
      </header>

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
      </Card>

      <Card className="space-y-3 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>表示スタイル</h2>
        <p className={helperTextClass}>文言・トーンのみ切り替わります（判定ロジックは共通です）。</p>
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

      <div className="grid gap-3">
        <Button onClick={() => router.push(buildFlowUrl(searchParams))} className="w-full text-base">
          このまま診断へ
        </Button>
        <Button variant="outline" onClick={() => router.push(buildConfirmSettingsUrl(searchParams))} className="w-full text-base">
          入力（任意）を追加
        </Button>
      </div>
    </div>
  );
}
