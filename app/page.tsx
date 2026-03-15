"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Decisiveness, InputMeta, ItemKind, Mode, GoodsClass } from "@/src/oshihapi/model";
import { MODE_META } from "@/src/oshihapi/modeConfig";
import { MODE_LABELS, recommendMode } from "@/src/oshihapi/modeGuide";
import { DECISIVENESS_STORAGE_KEY, parseDecisiveness } from "@/src/oshihapi/decisiveness";
import { getStyleModeFromLocalStorage, type StyleMode } from "@/src/oshihapi/modes/useStyleMode";
import { getModeTradeoff, getOptionalMetaHint, isGoodsClassApplicable } from "@/src/oshihapi/homeFunnel";
import { loadDrafts } from "@/src/store/diagnosisStore";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import RadioCard from "@/components/ui/RadioCard";
import StickyStartBar from "@/components/StickyStartBar";
import { bodyTextClass, containerClass, pageTitleClass, sectionTitleClass } from "@/components/ui/tokens";

const deadlineOptions = [
  { value: "today", label: "今日" },
  { value: "tomorrow", label: "明日" },
  { value: "in3days", label: "3日以内" },
  { value: "in1week", label: "1週間以内" },
  { value: "unknown", label: "未定" },
] as const;
const itemKindOptions: { value: ItemKind; label: string; lead: string }[] = [
  { value: "goods", label: "グッズ", lead: "通常グッズの購入" },
  { value: "blind_draw", label: "ブラインド/くじ", lead: "被り・上限を考える" },
  { value: "used", label: "中古", lead: "状態・真贋・返品条件を確認" },
  { value: "preorder", label: "予約", lead: "待ち期間と不確実性を確認" },
  { value: "ticket", label: "チケット", lead: "日程・移動コスト・代替機会を確認" },
  { value: "game_billing", label: "ゲーム課金", lead: "課金特有の勢いリスクを確認" },
];
const goodsClassOptions: { value: GoodsClass; label: string }[] = [
  { value: "small_collection", label: "小物コレクション" },
  { value: "paper", label: "紙もの" },
  { value: "wearable", label: "身につける" },
  { value: "display_large", label: "飾る・大きめ" },
  { value: "tech", label: "機能系" },
  { value: "itabag_badge", label: "痛バ・缶バ大量回収" },
];

type DeadlineValue = NonNullable<InputMeta["deadline"]>;

export default function Home() {
  const router = useRouter();
  const [itemKind, setItemKind] = useState<ItemKind>("goods");
  const [goodsClass, setGoodsClass] = useState<GoodsClass>("small_collection");
  const [mode, setMode] = useState<Mode>("short");
  const [itemName, setItemName] = useState("");
  const [priceYen, setPriceYen] = useState("");
  const [deadline, setDeadline] = useState<DeadlineValue>("unknown");
  const [styleMode] = useState<StyleMode>(() => getStyleModeFromLocalStorage());
  const [decisiveness] = useState<Decisiveness>(() => {
    if (typeof window === "undefined") return "standard";
    return parseDecisiveness(window.localStorage.getItem(DECISIVENESS_STORAGE_KEY));
  });

  const [latestDraft] = useState(() => {
    if (typeof window === "undefined") return null;
    return loadDrafts()[0] ?? null;
  });

  const parsedPriceYen = useMemo(() => {
    const parsed = Number(priceYen.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [priceYen]);
  const recommendation = useMemo(
    () => recommendMode({ itemName: itemName.trim() || undefined, priceYen: parsedPriceYen, deadline, itemKind }),
    [itemName, parsedPriceYen, deadline, itemKind],
  );

  const handleResumeDraft = () => {
    if (!latestDraft) return;
    const params = new URLSearchParams();
    params.set("mode", latestDraft.runContext.mode);
    params.set("styleMode", latestDraft.runContext.styleMode);
    params.set("itemKind", latestDraft.runContext.itemKind);
    params.set("gc", latestDraft.runContext.goodsClass);
    params.set("decisiveness", latestDraft.decisiveness);
    if (latestDraft.runContext.itemName) params.set("itemName", latestDraft.runContext.itemName);
    if (Number.isFinite(latestDraft.runContext.priceYen ?? Number.NaN)) params.set("priceYen", String(latestDraft.runContext.priceYen));
    if (latestDraft.runContext.deadline) params.set("deadline", latestDraft.runContext.deadline);
    params.set("draftId", latestDraft.draftId);
    router.push(`/flow?${params.toString()}`);
  };

  const handleStartNew = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("styleMode", styleMode);
    params.set("itemKind", itemKind);
    if (isGoodsClassApplicable(itemKind)) params.set("gc", goodsClass);
    if (itemName.trim()) params.set("itemName", itemName.trim());
    if (parsedPriceYen !== undefined) params.set("priceYen", String(parsedPriceYen));
    params.set("deadline", deadline);
    params.set("decisiveness", decisiveness);
    params.set("startNew", "1");
    router.push(`/flow?${params.toString()}`);
  };

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("styleMode", styleMode);
    params.set("itemKind", itemKind);
    if (isGoodsClassApplicable(itemKind)) params.set("gc", goodsClass);
    if (itemName.trim()) params.set("itemName", itemName.trim());
    if (parsedPriceYen !== undefined) params.set("priceYen", String(parsedPriceYen));
    params.set("deadline", deadline);
    params.set("decisiveness", decisiveness);
    router.push(`/flow?${params.toString()}`);
  };

  return (
    <div className={`${containerClass} safe-bottom flex min-h-screen flex-col gap-6 py-8 bg-transparent dark:bg-[#0b0f1a]`}>
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">オシハピ</p>
        <h1 className={pageTitleClass}>推し買い診断</h1>
        <p className={bodyTextClass}>先に「何を決めるか」、次に「どれだけ深く考えるか」を選ぶ2ステップ診断。</p>
        <p className="text-xs text-slate-500 dark:text-zinc-400">※ まとめ買い（β）は検証中です <Link href="/basket" className="underline underline-offset-2">βページを見る</Link></p>
      </header>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>Step 1: 何について判断する？</h2>
        <div className="grid gap-3">
          {itemKindOptions.map((option) => (
            <RadioCard key={option.value} title={option.label} description={option.lead} isSelected={itemKind === option.value} onClick={() => setItemKind(option.value)} />
          ))}
        </div>
        {isGoodsClassApplicable(itemKind) ? (
          <label className="space-y-1 text-sm">
            <span className="text-slate-600 dark:text-zinc-300">グッズ種別（精度アップ）</span>
            <select value={goodsClass} onChange={(e) => setGoodsClass(e.target.value as GoodsClass)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#111827] dark:text-zinc-50">
              {goodsClassOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ) : null}
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>Step 2: どの深さで診断する？</h2>
        <div className="grid gap-3">
          <RadioCard title="短（short）" description="速く答えを出す" isSelected={mode === "short"} onClick={() => setMode("short")} />
          <RadioCard title="中（medium）" description="理由と不安をバランス確認" isSelected={mode === "medium"} onClick={() => setMode("medium")} />
          <RadioCard title="長（long）" description="比較・優先度・後悔まで整理" isSelected={mode === "long"} onClick={() => setMode("long")} />
        </div>
        <p className="text-sm text-slate-600 dark:text-zinc-300">{getModeTradeoff(mode)} / {MODE_META[mode].homeDescription}</p>
      </Card>

      <Card className="space-y-3 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleClass}>おすすめ（補助）</h2>
          <Badge variant="accent">信頼度 {recommendation.confidence}%</Badge>
        </div>
        <p className="text-sm text-slate-700 dark:text-zinc-200">
          あなたの入力だと <strong>{MODE_LABELS[recommendation.mode]}</strong> が向いています。
          {recommendation.reasonChips.length > 0 ? ` 理由: ${recommendation.reasonChips.join(" / ")}` : ""}
        </p>
        {recommendation.followUp ? <p className="text-sm text-amber-700 dark:text-amber-300">{recommendation.followUp}</p> : null}
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>任意メモ（未入力でも開始できます）</h2>
        <p className="text-sm text-slate-600 dark:text-zinc-300">{getOptionalMetaHint(itemKind)}</p>
        <div className="grid gap-3">
          <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="アイテム名（任意）" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#111827] dark:text-zinc-50" />
          <input value={priceYen} onChange={(e) => setPriceYen(e.target.value)} inputMode="numeric" placeholder="価格（任意）" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#111827] dark:text-zinc-50" />
          <select value={deadline} onChange={(e) => setDeadline(e.target.value as DeadlineValue)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#111827] dark:text-zinc-50">
            {deadlineOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </Card>


      {latestDraft ? (
        <Card className="space-y-3 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <h2 className={sectionTitleClass}>前回の下書き</h2>
          <p className="text-sm text-slate-600 dark:text-zinc-300">{latestDraft.runContext.itemName ?? "（商品名なし）"} / {latestDraft.runContext.mode}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={handleResumeDraft} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-[#111827] dark:text-zinc-50">下書きを再開</button>
            <button onClick={handleStartNew} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-[#111827] dark:text-zinc-50">新規診断を開始</button>
          </div>
        </Card>
      ) : null}

      <StickyStartBar onStart={handleStart} />
    </div>
  );
}
