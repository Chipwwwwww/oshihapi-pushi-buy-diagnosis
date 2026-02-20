"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeMode } from "@/src/oshihapi/modeConfig";
import { parseDecisiveness, decisivenessLabels } from "@/src/oshihapi/decisiveness";
import { getStyleModeFromSearchParams } from "@/src/oshihapi/modes/useStyleMode";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { containerClass, helperTextClass, pageTitleClass, sectionTitleClass } from "@/components/ui/tokens";
import { buildConfirmSettingsUrl, buildFlowUrl, modeLabelMap } from "./confirmQuery";

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

      <div className="grid gap-3">
        <Button onClick={() => router.push(buildFlowUrl(searchParams))} className="w-full text-base">
          このまま診断へ
        </Button>
        <Button variant="outline" onClick={() => router.push(buildConfirmSettingsUrl(searchParams))} className="w-full text-base">
          設定・入力を変更（任意）
        </Button>
      </div>
    </div>
  );
}
