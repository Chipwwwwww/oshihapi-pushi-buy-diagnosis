"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Decisiveness, InputMeta, ItemKind, Mode } from "@/src/oshihapi/model";
import { normalizeMode } from "@/src/oshihapi/modeConfig";
import { parseDecisiveness, DECISIVENESS_STORAGE_KEY, decisivenessLabels } from "@/src/oshihapi/decisiveness";
import { COPY_BY_MODE } from "@/src/oshihapi/modes/copy_dictionary";
import {
  getStyleModeFromSearchParams,
  setStyleModeToLocalStorage,
  type StyleMode,
} from "@/src/oshihapi/modes/useStyleMode";
import AdvancedSettingsPanel from "@/components/AdvancedSettingsPanel";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { containerClass, helperTextClass, pageTitleClass, sectionTitleClass } from "@/components/ui/tokens";

type DeadlineValue = NonNullable<InputMeta["deadline"]>;

const deadlineOptions = [
  { value: "today", label: "今日" },
  { value: "tomorrow", label: "明日" },
  { value: "in3days", label: "3日以内" },
  { value: "in1week", label: "1週間以内" },
  { value: "unknown", label: "未定" },
] as const;

const itemKindOptions: { value: ItemKind; label: string }[] = [
  { value: "goods", label: "グッズ" },
  { value: "blind_draw", label: "くじ" },
  { value: "used", label: "中古" },
  { value: "preorder", label: "予約" },
  { value: "ticket", label: "チケット" },
  { value: "game_billing", label: "ゲーム課金" },
];

const DEADLINE_VALUES = deadlineOptions.map((option) => option.value);
const ITEM_KIND_VALUES = itemKindOptions.map((option) => option.value);

const isDeadlineValue = (value: string): value is DeadlineValue => DEADLINE_VALUES.includes(value as DeadlineValue);
const isItemKindValue = (value: string): value is ItemKind => ITEM_KIND_VALUES.includes(value as ItemKind);

const parseDeadlineValue = (value: string): DeadlineValue => (isDeadlineValue(value) ? value : "unknown");
const parseItemKindValue = (value: string): ItemKind => (isItemKindValue(value) ? value : "goods");

const parsePriceYen = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const modeLabelMap: Record<Mode, string> = {
  short: "即決（30秒）",
  medium: "標準（60秒〜2分）",
  long: "深掘り（長診断）",
};

export default function ConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = normalizeMode(searchParams.get("mode"));
  const [styleMode, setStyleMode] = useState<StyleMode>(getStyleModeFromSearchParams(searchParams) ?? "standard");
  const [decisiveness, setDecisiveness] = useState<Decisiveness>(parseDecisiveness(searchParams.get("decisiveness")));
  const [itemName, setItemName] = useState(searchParams.get("itemName") ?? "");
  const [priceYen, setPriceYen] = useState(searchParams.get("priceYen") ?? "");
  const [deadline, setDeadline] = useState<DeadlineValue>(parseDeadlineValue(searchParams.get("deadline") ?? "unknown"));
  const [itemKind, setItemKind] = useState<ItemKind>(parseItemKindValue(searchParams.get("itemKind") ?? "goods"));

  const modeCopy = COPY_BY_MODE[styleMode];
  const itemNamePlaceholder =
    itemKind === "game_billing"
      ? "例：限定ガチャ10連 / 月パス / コラボスキン"
      : "例：推しアクスタ 2025";

  const summary = useMemo(() => {
    const parts = [modeLabelMap[mode], searchParams.get("templateUsed") === "1" ? "テンプレあり" : "テンプレなし"];
    return parts;
  }, [mode, searchParams]);

  const handleStyleModeChange = (nextMode: StyleMode) => {
    setStyleMode(nextMode);
    setStyleModeToLocalStorage(nextMode);
  };

  const handleDecisivenessChange = (value: Decisiveness) => {
    setDecisiveness(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DECISIVENESS_STORAGE_KEY, value);
    }
  };

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("styleMode", styleMode);
    params.set("decisiveness", decisiveness);
    if (itemName.trim()) params.set("itemName", itemName.trim());
    const parsedPriceYen = parsePriceYen(priceYen);
    if (parsedPriceYen !== undefined) params.set("priceYen", String(parsedPriceYen));
    params.set("deadline", parseDeadlineValue(deadline));
    params.set("itemKind", parseItemKindValue(itemKind));
    router.push(`/flow?${params.toString()}`);
  };

  return (
    <div className={`${containerClass} flex min-h-screen flex-col gap-6 py-8`}>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-accent">確認/調整（任意）</p>
        <h1 className={pageTitleClass}>このまま診断へ進みますか？</h1>
        <p className={helperTextClass}>不要なら変更せず、そのまま次へ進めます。</p>
      </header>

      <Card className="space-y-3 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>現在の選択サマリー</h2>
        <div className="flex flex-wrap gap-2">
          {summary.map((label) => (
            <Badge key={label} variant="outline" className="border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/6 dark:text-zinc-200">
              {label}
            </Badge>
          ))}
          <Badge variant="accent">決め切り度: {decisivenessLabels[decisiveness]}</Badge>
        </div>
      </Card>

      <AdvancedSettingsPanel
        styleMode={styleMode}
        styleOptionLabel={modeCopy.ui.styleOptionLabel}
        styleSectionTitle={modeCopy.ui.styleSectionTitle}
        styleSectionHelp={modeCopy.ui.styleSectionHelp}
        decisiveness={decisiveness}
        itemName={itemName}
        itemNamePlaceholder={itemNamePlaceholder}
        priceYen={priceYen}
        deadline={deadline}
        itemKind={itemKind}
        deadlineOptions={deadlineOptions}
        itemKindOptions={itemKindOptions}
        onStyleModeChange={handleStyleModeChange}
        onDecisivenessChange={handleDecisivenessChange}
        onItemNameChange={setItemName}
        onPriceYenChange={setPriceYen}
        onDeadlineChange={(value) => setDeadline(parseDeadlineValue(value))}
        onItemKindChange={(value) => setItemKind(parseItemKindValue(value))}
      />

      <Button onClick={handleStart} className="w-full text-base">
        この設定で診断へ
      </Button>
    </div>
  );
}
