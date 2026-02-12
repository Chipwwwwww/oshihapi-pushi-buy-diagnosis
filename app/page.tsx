"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Decisiveness, InputMeta, ItemKind, Mode } from "@/src/oshihapi/model";
import {
  MODE_LABELS,
  SCENARIO_CARDS_JA,
  SITUATION_CHIPS_JA,
  recommendMode,
} from "@/src/oshihapi/modeGuide";
import {
  DECISIVENESS_STORAGE_KEY,
  decisivenessLabels,
  decisivenessOptions,
  parseDecisiveness,
} from "@/src/oshihapi/decisiveness";
import Badge from "@/components/ui/Badge";
import ModeToggle from "@/components/ModeToggle";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import RadioCard from "@/components/ui/RadioCard";
import {
  bodyTextClass,
  containerClass,
  helperTextClass,
  inputBaseClass,
  pageTitleClass,
  sectionTitleClass,
} from "@/components/ui/tokens";
import { resolveMode, setStoredMode, type ModeId } from "@/src/oshihapi/modes/modeState";

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

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("short");
  const [itemName, setItemName] = useState("");
  const [priceYen, setPriceYen] = useState("");
  const [deadline, setDeadline] = useState<DeadlineValue>("unknown");
  const [itemKind, setItemKind] = useState<ItemKind>("goods");
  const [presentationMode, setPresentationMode] = useState<ModeId>(() => resolveMode(null));
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

  const getModeDescription = (targetMode: Mode) =>
    targetMode === "short"
      ? "急いで決めたい人向け（短め）"
      : targetMode === "medium"
        ? "比較しながら決めたい人向け（標準）"
        : "AIに深掘り相談したい人向け（長診断）";

  const modeDescription = useMemo(() => getModeDescription(mode), [mode]);
  const itemNamePlaceholder =
    itemKind === "game_billing"
      ? "例：限定ガチャ10連 / 月パス / コラボスキン"
      : "例：推しアクスタ 2025";

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("pmode", presentationMode);
    if (itemName.trim()) params.set("itemName", itemName.trim());
    if (parsedPriceYen !== undefined) {
      params.set("priceYen", String(parsedPriceYen));
    }
    const normalizedDeadline = parseDeadlineValue(deadline);
    if (normalizedDeadline) params.set("deadline", normalizedDeadline);
    const normalizedItemKind = parseItemKindValue(itemKind);
    if (normalizedItemKind) params.set("itemKind", normalizedItemKind);
    params.set("decisiveness", decisiveness);
    router.push(`/flow?${params.toString()}`);
  };

  const handleSelectMode = (nextMode: Mode) => {
    setMode(nextMode);
  };

  const handlePresentationModeChange = (nextMode: ModeId) => {
    setPresentationMode(nextMode);
    setStoredMode(nextMode);
  };

  const handleApplyScenario = (scenario: typeof SCENARIO_CARDS_JA[number]) => {
    setMode(scenario.mode);
    if (!scenario.preset) return;
    setItemName(scenario.preset.itemName ?? "");
    setPriceYen(
      scenario.preset.priceYen !== undefined
        ? String(scenario.preset.priceYen)
        : "",
    );
    setDeadline(scenario.preset.deadline ?? "unknown");
    setItemKind(scenario.preset.itemKind ?? "goods");
  };

  return (
    <div
      className={`${containerClass} safe-bottom flex min-h-screen flex-col gap-8 py-10 bg-transparent dark:bg-[#0b0f1a]`}
    >
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">
          オシハピ
        </p>
        <h1 className={pageTitleClass}>推し買い診断</h1>
        <p className={bodyTextClass}>
          推しグッズの「買う/保留/やめる」を60秒で。くじ・中古・予約もOK。
        </p>
      </header>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleClass}>迷ったらおすすめ</h2>
          <Badge variant="accent">信頼度 {recommendation.confidence}%</Badge>
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-900 dark:border-white/10 dark:bg-white/7 dark:text-zinc-50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-zinc-300">
              おすすめモード
            </span>
            <Badge variant="primary">{MODE_LABELS[recommendation.mode]}</Badge>
            <span className="text-sm text-slate-600 dark:text-zinc-300">
              {getModeDescription(recommendation.mode)}
            </span>
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
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {recommendation.followUp}
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <ModeToggle value={presentationMode} onChange={handlePresentationModeChange} />
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>診断コース</h2>
        <div className="grid gap-4">
          <RadioCard
            title="急いで決める（30秒）"
            description="時間がなくてもサクッと判断。"
            isSelected={mode === "short"}
            onClick={() => handleSelectMode("short")}
          />
          <RadioCard
            title="じっくり決める（60秒〜2分）"
            description="比較しながら安心して決めたいとき。"
            isSelected={mode === "medium"}
            onClick={() => handleSelectMode("medium")}
          />
          <RadioCard
            title="AIに相談する（長診断）"
            description="深掘り用プロンプトも作って相談。"
            isSelected={mode === "long"}
            onClick={() => handleSelectMode("long")}
          />
        </div>
        <p className="text-sm text-slate-600 dark:text-zinc-300">
          {modeDescription}
        </p>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>決め切り度</h2>
        <div className="grid grid-cols-3 gap-2">
          {decisivenessOptions.map((option) => (
            <Button
              key={option.value}
              variant={decisiveness === option.value ? "primary" : "outline"}
              onClick={() => {
                setDecisiveness(option.value);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(DECISIVENESS_STORAGE_KEY, option.value);
                }
              }}
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
        <div className="flex flex-col gap-2">
          <h2 className={sectionTitleClass}>状況から選ぶ</h2>
          <p className="text-sm text-slate-600 dark:text-zinc-300">
            チップをタップするとモードが切り替わります。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SITUATION_CHIPS_JA.map((chip) => (
            <Button
              key={chip.id}
              variant={mode === chip.mode ? "primary" : "outline"}
              onClick={() => handleSelectMode(chip.mode)}
              className={
                mode === chip.mode
                  ? "rounded-full px-4"
                  : "rounded-full border-slate-200 bg-slate-100 px-4 text-slate-700 dark:border-white/10 dark:bg-white/6 dark:text-zinc-200"
              }
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>例から選ぶ</h2>
        <div className="grid gap-4">
          {SCENARIO_CARDS_JA.map((scenario) => (
            <RadioCard
              key={scenario.id}
              title={scenario.title}
              description={scenario.description}
              isSelected={mode === scenario.mode}
              onClick={() => handleApplyScenario(scenario)}
              footer={
                scenario.preset ? (
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-zinc-300">
                    {scenario.preset.priceYen ? (
                      <span>¥{scenario.preset.priceYen.toLocaleString()}</span>
                    ) : null}
                    {scenario.preset.deadline ? (
                      <span>
                        締切: {" "}
                        {deadlineLabelMap.get(scenario.preset.deadline) ??
                          scenario.preset.deadline}
                      </span>
                    ) : null}
                    {scenario.preset.itemKind ? (
                      <span>
                        種別: {" "}
                        {itemKindLabelMap.get(scenario.preset.itemKind) ??
                          scenario.preset.itemKind}
                      </span>
                    ) : null}
                  </div>
                ) : null
              }
            />
          ))}
        </div>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>入力（任意）</h2>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            商品名
            <input
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
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
              onChange={(event) => setPriceYen(event.target.value)}
              className={inputBaseClass}
              placeholder="例：8800"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            締切
            <select
              value={deadline}
              onChange={(event) => setDeadline(parseDeadlineValue(event.target.value))}
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
              onChange={(event) => setItemKind(parseItemKindValue(event.target.value))}
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

      <div className="space-y-4">
        <Button onClick={handleStart} className="w-full text-base">
          診断をはじめる
        </Button>
        <p className="text-sm text-slate-600 dark:text-zinc-300">
          迷ったらまずは短診断でOK。途中で戻ることもできます。
        </p>
      </div>
    </div>
  );
}
