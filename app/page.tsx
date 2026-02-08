"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { InputMeta, ItemKind, Mode } from "@/src/oshihapi/model";
import {
  MODE_LABELS,
  SCENARIO_CARDS_JA,
  SITUATION_CHIPS_JA,
  recommendMode,
} from "@/src/oshihapi/modeGuide";
import Badge from "@/components/ui/Badge";
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

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (itemName.trim()) params.set("itemName", itemName.trim());
    if (parsedPriceYen !== undefined) {
      params.set("priceYen", String(parsedPriceYen));
    }
    const normalizedDeadline = parseDeadlineValue(deadline);
    if (normalizedDeadline) params.set("deadline", normalizedDeadline);
    const normalizedItemKind = parseItemKindValue(itemKind);
    if (normalizedItemKind) params.set("itemKind", normalizedItemKind);
    router.push(`/flow?${params.toString()}`);
  };

  const handleSelectMode = (nextMode: Mode) => {
    setMode(nextMode);
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
    <div className={`${containerClass} flex min-h-screen flex-col gap-8 py-10`}>
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">
          オシハピ
        </p>
        <h1 className={pageTitleClass}>推し買い診断</h1>
        <p className={bodyTextClass}>
          推しグッズの「買う/保留/やめる」を60秒で。くじ・中古・予約もOK。
        </p>
      </header>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleClass}>迷ったらおすすめ</h2>
          <Badge variant="accent">信頼度 {recommendation.confidence}%</Badge>
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-muted p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={helperTextClass}>おすすめモード</span>
            <Badge variant="primary">{MODE_LABELS[recommendation.mode]}</Badge>
            <span className={helperTextClass}>
              {getModeDescription(recommendation.mode)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recommendation.reasonChips.map((reason) => (
              <Badge key={reason} variant="outline">
                {reason}
              </Badge>
            ))}
          </div>
          {recommendation.followUp ? (
            <p className="text-sm text-amber-700">{recommendation.followUp}</p>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>モードを選ぶ</h2>
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
        <p className={helperTextClass}>{modeDescription}</p>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className={sectionTitleClass}>状況から選ぶ</h2>
          <p className={helperTextClass}>
            チップをタップするとモードが切り替わります。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SITUATION_CHIPS_JA.map((chip) => (
            <Button
              key={chip.id}
              variant={mode === chip.mode ? "primary" : "outline"}
              onClick={() => handleSelectMode(chip.mode)}
              className="rounded-full px-4"
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
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
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>入力（任意）</h2>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            商品名
            <input
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              className={inputBaseClass}
              placeholder="例：推しアクスタ 2025"
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
        <p className={helperTextClass}>
          迷ったらまずは短診断でOK。途中で戻ることもできます。
        </p>
      </div>
    </div>
  );
}
