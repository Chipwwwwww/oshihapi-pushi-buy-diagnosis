"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { InputMeta, ItemKind, Mode } from "@/src/oshihapi/model";

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

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("urgent");
  const [itemName, setItemName] = useState("");
  const [priceYen, setPriceYen] = useState("");
  const [deadline, setDeadline] = useState<DeadlineValue>("unknown");
  const [itemKind, setItemKind] = useState<ItemKind>("goods");

  const modeDescription = useMemo(
    () =>
      mode === "urgent"
        ? "急いで決めたい人向け（短め）"
        : "比較しながら決めたい人向け（標準）",
    [mode],
  );

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (itemName.trim()) params.set("itemName", itemName.trim());
    const parsedPrice = parsePriceYen(priceYen);
    if (parsedPrice !== undefined) params.set("priceYen", String(parsedPrice));
    const normalizedDeadline = parseDeadlineValue(deadline);
    if (normalizedDeadline) params.set("deadline", normalizedDeadline);
    const normalizedItemKind = parseItemKindValue(itemKind);
    if (normalizedItemKind) params.set("itemKind", normalizedItemKind);
    router.push(`/flow?${params.toString()}`);
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
          <p className="text-sm font-semibold text-zinc-700">モード</p>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("urgent")}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                mode === "urgent"
                  ? "border-pink-500 bg-pink-50 text-pink-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-pink-300"
              }`}
            >
              <p className="text-base font-semibold">急いで決める（30秒）</p>
              <p className="text-xs">急ぎの買い物に。</p>
            </button>
            <button
              type="button"
              onClick={() => setMode("normal")}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                mode === "normal"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-indigo-300"
              }`}
            >
              <p className="text-base font-semibold">じっくり決める（60秒）</p>
              <p className="text-xs">比較しながら決めたい時に。</p>
            </button>
          </div>
          <p className="text-xs text-zinc-500">{modeDescription}</p>
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
