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
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-6 py-10">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-pink-600">
          オシハピ
        </p>
        <h1 className="text-3xl font-bold leading-tight text-zinc-900">
          推し買い診断
        </h1>
        <p className="text-base text-zinc-600">
          推しグッズの「買う/保留/やめる」を60秒で。くじ・中古・予約もOK
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-800">
              迷ったらおすすめ
            </h2>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              信頼度 {recommendation.confidence}%
            </span>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-500">おすすめモード</span>
              <span className="rounded-full bg-pink-100 px-3 py-1 text-sm font-semibold text-pink-700">
                {MODE_LABELS[recommendation.mode]}
              </span>
              <span className="text-xs text-zinc-500">
                {getModeDescription(recommendation.mode)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recommendation.reasonChips.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600"
                >
                  {reason}
                </span>
              ))}
            </div>
            {recommendation.followUp ? (
              <p className="text-xs text-amber-600">{recommendation.followUp}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-zinc-700">モード</p>
          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => handleSelectMode("short")}
              className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
                mode === "short"
                  ? "border-pink-500 bg-pink-50 text-pink-700 shadow-md"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-pink-300"
              }`}
            >
              <p className="text-base font-semibold">急いで決める（30秒）</p>
              <p className="text-xs">急ぎの買い物に。</p>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode("medium")}
              className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
                mode === "medium"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-indigo-300"
              }`}
            >
              <p className="text-base font-semibold">
                じっくり決める（60秒〜2分）
              </p>
              <p className="text-xs">比較しながら決めたい時に。</p>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode("long")}
              className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
                mode === "long"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-emerald-300"
              }`}
            >
              <p className="text-base font-semibold">AIに相談する（長診断）</p>
              <p className="text-xs">深掘り用のプロンプトを作る。</p>
            </button>
          </div>
          <p className="text-xs text-zinc-500">{modeDescription}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-zinc-800">状況から選ぶ</h2>
          <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1">
            {SITUATION_CHIPS_JA.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleSelectMode(chip.mode)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
                  mode === chip.mode
                    ? "border-pink-400 bg-pink-50 text-pink-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-pink-300"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            チップをタップするとモードが切り替わります。
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-zinc-800">例から選ぶ</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {SCENARIO_CARDS_JA.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => handleApplyScenario(scenario)}
                className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-pink-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-zinc-800">
                    {scenario.title}
                  </p>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                    {MODE_LABELS[scenario.mode]}
                  </span>
                </div>
                <p className="text-sm text-zinc-600">{scenario.description}</p>
                {scenario.preset ? (
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                    {scenario.preset.priceYen ? (
                      <span>¥{scenario.preset.priceYen.toLocaleString()}</span>
                    ) : null}
                    {scenario.preset.deadline ? (
                      <span>
                        締切:{" "}
                        {deadlineLabelMap.get(scenario.preset.deadline) ??
                          scenario.preset.deadline}
                      </span>
                    ) : null}
                    {scenario.preset.itemKind ? (
                      <span>
                        種別:{" "}
                        {itemKindLabelMap.get(scenario.preset.itemKind) ??
                          scenario.preset.itemKind}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-800">入力（任意）</h2>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm text-zinc-600">
            商品名
            <input
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-base text-zinc-900 focus:border-pink-400 focus:outline-none"
              placeholder="例：推しアクスタ 2025"
            />
          </label>
          <label className="grid gap-2 text-sm text-zinc-600">
            価格（円）
            <input
              type="number"
              min="0"
              value={priceYen}
              onChange={(event) => setPriceYen(event.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-base text-zinc-900 focus:border-pink-400 focus:outline-none"
              placeholder="例：8800"
            />
          </label>
          <label className="grid gap-2 text-sm text-zinc-600">
            締切
            <select
              value={deadline}
              onChange={(event) => setDeadline(parseDeadlineValue(event.target.value))}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-base text-zinc-900 focus:border-pink-400 focus:outline-none"
            >
              {deadlineOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-zinc-600">
            種別
            <select
              value={itemKind}
              onChange={(event) => setItemKind(parseItemKindValue(event.target.value))}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-base text-zinc-900 focus:border-pink-400 focus:outline-none"
            >
              {itemKindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <button
        type="button"
        onClick={handleStart}
        className="rounded-full bg-zinc-900 px-8 py-4 text-base font-semibold text-white transition hover:bg-zinc-800"
      >
        Start
      </button>
    </div>
  );
}
