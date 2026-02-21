"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Decisiveness, InputMeta, ItemKind, Mode } from "@/src/oshihapi/model";
import { MODE_META } from "@/src/oshihapi/modeConfig";
import {
  MODE_LABELS,
  SCENARIO_CARDS_JA,
  SITUATION_CHIPS_JA,
  recommendMode,
  type ScenarioCard,
  type SituationChip,
} from "@/src/oshihapi/modeGuide";
import {
  DECISIVENESS_STORAGE_KEY,
  parseDecisiveness,
} from "@/src/oshihapi/decisiveness";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import RadioCard from "@/components/ui/RadioCard";
import {
  bodyTextClass,
  containerClass,
  pageTitleClass,
  sectionTitleClass,
} from "@/components/ui/tokens";
import { getStyleModeFromLocalStorage, type StyleMode } from "@/src/oshihapi/modes/useStyleMode";
import StartTemplateDrawer from "@/components/StartTemplateDrawer";
import StickyStartBar from "@/components/StickyStartBar";

const deadlineOptions = [
  { value: "today", label: "今日" },
  { value: "tomorrow", label: "明日" },
  { value: "in3days", label: "3日以内" },
  { value: "in1week", label: "1週間以内" },
  { value: "unknown", label: "未定" },
] as const;

type DeadlineValue = NonNullable<InputMeta["deadline"]>;

const DEADLINE_VALUES = deadlineOptions.map((option) => option.value);
const ITEM_KIND_VALUES: ItemKind[] = [
  "goods",
  "blind_draw",
  "used",
  "preorder",
  "ticket",
  "game_billing",
];

const isDeadlineValue = (value: string): value is DeadlineValue =>
  DEADLINE_VALUES.includes(value as DeadlineValue);

const isItemKindValue = (value: string): value is ItemKind =>
  ITEM_KIND_VALUES.includes(value as ItemKind);

const parseDeadlineValue = (value: string): DeadlineValue =>
  isDeadlineValue(value) ? value : "unknown";

const parseItemKindValue = (value: string): ItemKind =>
  isItemKindValue(value) ? value : "goods";

const parsePriceYen = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const itemKindOptions: { value: ItemKind; label: string }[] = [
  { value: "goods", label: "グッズ" },
  { value: "blind_draw", label: "くじ" },
  { value: "used", label: "中古" },
  { value: "preorder", label: "予約" },
  { value: "ticket", label: "チケット" },
  { value: "game_billing", label: "ゲーム課金" },
];

const deadlineLabelMap = new Map(
  deadlineOptions.map((option) => [option.value, option.label] as const),
);
const itemKindLabelMap = new Map(
  itemKindOptions.map((option) => [option.value, option.label] as const),
);

const chipTemplatePreset: Record<
  string,
  Partial<{
    itemName: string;
    priceYen: number;
    deadline: DeadlineValue;
    itemKind: ItemKind;
    decisiveness: Decisiveness;
    mode: Mode;
  }>
> = {
  "deadline-close": { deadline: "today", itemKind: "goods", decisiveness: "quick", mode: "short" },
  "event-soon": { deadline: "tomorrow", itemKind: "ticket", decisiveness: "quick", mode: "short" },
  "compare-prices": { deadline: "in1week", itemKind: "goods", decisiveness: "standard", mode: "medium" },
  "used-market": { deadline: "unknown", itemKind: "used", decisiveness: "standard", mode: "medium" },
  "big-purchase": { priceYen: 18000, deadline: "in1week", itemKind: "preorder", decisiveness: "careful", mode: "long" },
  "travel-cost": { priceYen: 22000, deadline: "in3days", itemKind: "ticket", decisiveness: "careful", mode: "long" },
};

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("short");
  const [itemName, setItemName] = useState("");
  const [priceYen, setPriceYen] = useState("");
  const [deadline, setDeadline] = useState<DeadlineValue>("unknown");
  const [itemKind, setItemKind] = useState<ItemKind>("goods");
  const [styleMode] = useState<StyleMode>(() => getStyleModeFromLocalStorage());
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState(false);
  const [hasTemplateSelection, setHasTemplateSelection] = useState(false);
  const [decisiveness, setDecisiveness] = useState<Decisiveness>(() => {
    if (typeof window === "undefined") return "standard";
    return parseDecisiveness(window.localStorage.getItem(DECISIVENESS_STORAGE_KEY));
  });

  const parsedPriceYen = useMemo(() => parsePriceYen(priceYen), [priceYen]);
  const recommendation = useMemo(
    () =>
      recommendMode({
        itemName: itemName.trim() || undefined,
        priceYen: parsedPriceYen,
        deadline,
        itemKind,
      }),
    [itemName, parsedPriceYen, deadline, itemKind],
  );

  const getModeDescription = (targetMode: Mode) => MODE_META[targetMode].homeDescription;
  const modeDescription = useMemo(() => getModeDescription(mode), [mode]);

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("styleMode", styleMode);
    if (itemName.trim()) params.set("itemName", itemName.trim());
    if (parsedPriceYen !== undefined) {
      params.set("priceYen", String(parsedPriceYen));
    }
    const normalizedDeadline = parseDeadlineValue(deadline);
    if (normalizedDeadline) params.set("deadline", normalizedDeadline);
    const normalizedItemKind = parseItemKindValue(itemKind);
    if (normalizedItemKind) params.set("itemKind", normalizedItemKind);
    params.set("decisiveness", decisiveness);
    if (hasTemplateSelection) params.set("templateUsed", "1");
    router.push(`/${mode === "short" ? "flow" : "confirm"}?${params.toString()}`);
  };

  const handleDecisivenessChange = (value: Decisiveness) => {
    setDecisiveness(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DECISIVENESS_STORAGE_KEY, value);
    }
  };

  const applyTemplate = ({
    mode: templateMode,
    itemName: templateItemName,
    priceYen: templatePriceYen,
    deadline: templateDeadline,
    itemKind: templateItemKind,
    decisiveness: templateDecisiveness,
  }: {
    mode?: Mode;
    itemName?: string;
    priceYen?: number;
    deadline?: DeadlineValue;
    itemKind?: ItemKind;
    decisiveness?: Decisiveness;
  }) => {
    if (templateMode) setMode(templateMode);
    if (templateItemName !== undefined) setItemName(templateItemName);
    if (templatePriceYen !== undefined) setPriceYen(String(templatePriceYen));
    if (templateDeadline !== undefined) setDeadline(templateDeadline);
    if (templateItemKind !== undefined) setItemKind(templateItemKind);
    if (templateDecisiveness !== undefined) handleDecisivenessChange(templateDecisiveness);
    setHasTemplateSelection(true);
    setIsTemplateDrawerOpen(false);
  };

  const handleApplyScenario = (scenario: ScenarioCard) => {
    applyTemplate({
      mode: scenario.mode,
      itemName: scenario.preset?.itemName ?? "",
      priceYen: scenario.preset?.priceYen,
      deadline: scenario.preset?.deadline as DeadlineValue | undefined,
      itemKind: scenario.preset?.itemKind,
    });
  };

  const handleApplyChip = (chip: SituationChip) => {
    applyTemplate({
      mode: chip.mode,
      ...chipTemplatePreset[chip.id],
    });
  };

  return (
    <div
      className={`${containerClass} safe-bottom flex min-h-screen flex-col gap-6 py-8 bg-transparent dark:bg-[#0b0f1a]`}
    >
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">オシハピ</p>
        <h1 className={pageTitleClass}>推し買い診断</h1>
        <p className={bodyTextClass}>推しグッズの「買う/保留/やめる」を60秒で。くじ・中古・予約もOK。</p>
        <Link href="/basket" className="text-sm text-primary underline underline-offset-4">まとめ買い（β）</Link>
      </header>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>診断コース</h2>
        <div className="grid gap-4">
          <RadioCard
            title="即決（30秒）"
            description="いま買う？やめる？迷いを最短で整理"
            isSelected={mode === "short"}
            onClick={() => setMode("short")}
          />
          <RadioCard
            title="標準（60秒〜2分）"
            description="理由と不安をバランスよく整理"
            isSelected={mode === "medium"}
            onClick={() => setMode("medium")}
          />
          <RadioCard
            title="深掘り（長診断）"
            description="比較・優先度・後悔ポイントまでじっくり（最後にAIで深掘りも可）"
            isSelected={mode === "long"}
            onClick={() => setMode("long")}
          />
        </div>
        <p className="text-sm text-slate-600 dark:text-zinc-300">{modeDescription}</p>
        <Button variant="outline" onClick={() => setIsTemplateDrawerOpen(true)} className="w-full">
          テンプレで始める（任意）
        </Button>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleClass}>迷ったらおすすめ</h2>
          <Badge variant="accent">信頼度 {recommendation.confidence}%</Badge>
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-900 dark:border-white/10 dark:bg-white/7 dark:text-zinc-50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-zinc-300">おすすめモード</span>
            <Badge variant="primary">{MODE_LABELS[recommendation.mode]}</Badge>
            <span className="text-sm text-slate-600 dark:text-zinc-300">{getModeDescription(recommendation.mode)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recommendation.reasonChips.map((reason) => (
              <Badge
                key={reason}
                variant="outline"
                className="border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/6 dark:text-zinc-200"
              >
                {reason}
              </Badge>
            ))}
          </div>
          {recommendation.followUp ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">{recommendation.followUp}</p>
          ) : null}
        </div>
      </Card>

      <p className="text-sm text-slate-600 dark:text-zinc-300">
        必要なら次の画面で詳細設定を調整できます（任意）。
      </p>

      <StickyStartBar onStart={handleStart} />

      <StartTemplateDrawer
        isOpen={isTemplateDrawerOpen}
        selectedMode={mode}
        chips={SITUATION_CHIPS_JA}
        scenarios={SCENARIO_CARDS_JA}
        onClose={() => setIsTemplateDrawerOpen(false)}
        onSelectChip={handleApplyChip}
        onSelectScenario={handleApplyScenario}
        deadlineLabelMap={deadlineLabelMap}
        itemKindLabelMap={itemKindLabelMap}
      />
    </div>
  );
}
