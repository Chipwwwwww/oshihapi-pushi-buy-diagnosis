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
import {
  getCoveragePreset,
  getScenarioCoverageEntry,
  getEntryCoverageGroups,
  getScenarioCoverageSummary,
  getSupportLevelBadgeLabel,
  type ScenarioKey,
} from "@/src/oshihapi/scenarioCoverage";
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
  { value: "media", label: "CD・DVD・Blu-ray・書籍" },
  { value: "itabag_badge", label: "痛バ・缶バ大量回収" },
];

type DeadlineValue = NonNullable<InputMeta["deadline"]>;

export default function Home() {
  const router = useRouter();
  const [itemKind, setItemKind] = useState<ItemKind>("goods");
  const [goodsClass, setGoodsClass] = useState<GoodsClass>("small_collection");
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<ScenarioKey | null>(null);
  const [mode, setMode] = useState<Mode>("short");
  const [searchClue, setSearchClue] = useState("");
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
    () =>
      recommendMode({
        itemName: itemName.trim() || searchClue.trim() || undefined,
        priceYen: parsedPriceYen,
        deadline,
        itemKind,
      }),
    [deadline, itemKind, itemName, parsedPriceYen, searchClue],
  );
  const selectedCoverage = useMemo(
    () =>
      getScenarioCoverageSummary({
        itemKind,
        goodsClass,
        searchClueRaw: searchClue.trim() || undefined,
      }),
    [goodsClass, itemKind, searchClue],
  );
  const coverageGroups = useMemo(() => getEntryCoverageGroups(), []);
  const supportingCoverageGroups = useMemo(
    () => [...coverageGroups.secondaryStrong, ...coverageGroups.partial],
    [coverageGroups],
  );
  const highlightedScenarioKey = selectedScenarioKey ?? selectedCoverage.key;
  const highlightedCoverage = selectedScenarioKey
    ? getScenarioCoverageEntry(selectedScenarioKey)
    : selectedCoverage;
  const visibleSupportingCoverageGroups = supportingCoverageGroups.slice(0, 6);
  const hiddenSupportingCoverageGroups = supportingCoverageGroups.slice(6);

  const buildFlowParams = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("styleMode", styleMode);
    params.set("itemKind", itemKind);
    if (isGoodsClassApplicable(itemKind)) params.set("gc", goodsClass);
    if (searchClue.trim()) params.set("searchClue", searchClue.trim());
    if (itemName.trim()) params.set("itemName", itemName.trim());
    if (parsedPriceYen !== undefined) params.set("priceYen", String(parsedPriceYen));
    params.set("deadline", deadline);
    params.set("decisiveness", decisiveness);
    if (selectedScenarioKey) params.set("scenarioKey", selectedScenarioKey);
    return params;
  };

  const handleResumeDraft = () => {
    if (!latestDraft) return;
    const params = new URLSearchParams();
    params.set("mode", latestDraft.runContext.mode);
    params.set("styleMode", latestDraft.runContext.styleMode);
    params.set("itemKind", latestDraft.runContext.itemKind);
    params.set("gc", latestDraft.runContext.goodsClass);
    params.set("decisiveness", latestDraft.decisiveness);
    if (latestDraft.runContext.searchClueRaw) params.set("searchClue", latestDraft.runContext.searchClueRaw);
    if (latestDraft.runContext.parsedSearchClues?.clarification) {
      params.set("searchClueClarificationKind", latestDraft.runContext.parsedSearchClues.clarification.kind);
      params.set("searchClueClarificationValue", latestDraft.runContext.parsedSearchClues.clarification.value);
      params.set("searchClueClarificationLabel", latestDraft.runContext.parsedSearchClues.clarification.label);
    }
    if (latestDraft.runContext.itemName) params.set("itemName", latestDraft.runContext.itemName);
    if (Number.isFinite(latestDraft.runContext.priceYen ?? Number.NaN)) params.set("priceYen", String(latestDraft.runContext.priceYen));
    if (latestDraft.runContext.deadline) params.set("deadline", latestDraft.runContext.deadline);
    params.set("draftId", latestDraft.draftId);
    router.push(`/flow?${params.toString()}`);
  };

  const handleStartNew = () => {
    const params = buildFlowParams();
    params.set("startNew", "1");
    router.push(`/flow?${params.toString()}`);
  };

  const handleStart = () => {
    router.push(`/flow?${buildFlowParams().toString()}`);
  };

  const latestDraftLabel = latestDraft?.runContext.searchClueRaw ?? latestDraft?.runContext.itemName ?? "（商品名なし）";

  const handleScenarioSelect = (scenarioKey: ScenarioKey) => {
    const preset = getCoveragePreset(scenarioKey);
    setSelectedScenarioKey(scenarioKey);
    setItemKind(preset.itemKind ?? "goods");
    if (preset.goodsClass) setGoodsClass(preset.goodsClass);
    setMode((currentMode) => (
      scenarioKey === "multi_edition_media" ||
      scenarioKey === "store_bonus_collection" ||
      scenarioKey === "multi_store_bonus_split" ||
      scenarioKey === "post_event_mailorder" ||
      scenarioKey === "missed_onsite_recovery" ||
      scenarioKey === "mixed_media_live_goods" ||
      scenarioKey === "cast_live_goods_followup" ||
      scenarioKey === "bonus_pressure_followup"
        ? (currentMode === "short" ? "medium" : currentMode)
        : currentMode
    ));
  };

  const handleItemKindChange = (nextItemKind: ItemKind) => {
    setSelectedScenarioKey(null);
    setItemKind(nextItemKind);
  };

  const handleGoodsClassChange = (nextGoodsClass: GoodsClass) => {
    setSelectedScenarioKey(null);
    setGoodsClass(nextGoodsClass);
  };

  return (
    <div className={`${containerClass} safe-bottom flex min-h-screen flex-col gap-6 bg-transparent py-8 dark:bg-[#0b0f1a]`}>
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">オシハピ</p>
        <h1 className={pageTitleClass}>推し買い診断</h1>
        <p className={bodyTextClass}>推し活の買い物で後悔を減らすための、購入判断サポート診断。</p>
        <p className="text-sm text-slate-600 dark:text-zinc-300">手がかり入力は任意です。空欄でも診断を始められ、入力があると候補の絞り込み精度を少し上げられます。</p>
        <p className="text-xs text-slate-500 dark:text-zinc-400">※ まとめ買い（β）は検証中です <Link href="/basket" className="underline underline-offset-2">βページを見る</Link></p>
      </header>

      <Card className="space-y-5 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={sectionTitleClass}>この診断がいま強い判断</h2>
            <Badge variant="accent">top scenarios first</Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-zinc-300">
            最初に見るべき4つの判断だけを上段に集約しています。ほかの対応シナリオは下で静かに確認できます。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {coverageGroups.primaryStrong.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => handleScenarioSelect(entry.key)}
              className={[
                "rounded-2xl border px-4 py-4 text-left transition",
                highlightedScenarioKey === entry.key
                  ? "border-accent bg-accent/5 shadow-sm"
                  : "border-slate-200 bg-white hover:border-accent/40 dark:border-white/10 dark:bg-white/4 dark:hover:border-accent/40",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-zinc-50">{entry.recommendedEntryLabel}</p>
                <Badge variant="outline">{getSupportLevelBadgeLabel(entry.supportLevel)}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">{entry.compactEntryHint}</p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-50">ほかに対応している判断</p>
            <span className="text-xs text-slate-500 dark:text-zinc-400">主役の4件より低い階層で表示</span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {visibleSupportingCoverageGroups.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => handleScenarioSelect(entry.key)}
                className={[
                  "rounded-xl border px-3 py-3 text-left transition",
                  highlightedScenarioKey === entry.key
                    ? "border-accent/50 bg-accent/5"
                    : "border-slate-200 bg-white/80 hover:border-slate-300 dark:border-white/10 dark:bg-white/5",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-50">{entry.recommendedEntryLabel}</p>
                  <span className="text-xs text-slate-500 dark:text-zinc-400">{getSupportLevelBadgeLabel(entry.supportLevel)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-zinc-300">{entry.compactEntryHint}</p>
              </button>
            ))}
          </div>
          {hiddenSupportingCoverageGroups.length > 0 ? (
            <details className="mt-3 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/5">
              <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-zinc-200">
                残り {hiddenSupportingCoverageGroups.length} 件を開く
              </summary>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {hiddenSupportingCoverageGroups.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => handleScenarioSelect(entry.key)}
                    className={[
                      "rounded-xl border px-3 py-3 text-left transition",
                      highlightedScenarioKey === entry.key
                        ? "border-accent/50 bg-accent/5"
                        : "border-slate-200 bg-white/80 hover:border-slate-300 dark:border-white/10 dark:bg-white/5",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-zinc-50">{entry.recommendedEntryLabel}</p>
                      <span className="text-xs text-slate-500 dark:text-zinc-400">{getSupportLevelBadgeLabel(entry.supportLevel)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-zinc-300">{entry.compactEntryHint}</p>
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        {coverageGroups.partial.length > 0 ? (
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-white/10 dark:bg-white/3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-50">一部対応の判断</p>
              <span className="text-xs text-slate-500 dark:text-zinc-400">守備範囲を広げすぎずに開示</span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {coverageGroups.partial.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => handleScenarioSelect(entry.key)}
                  className="rounded-xl border border-slate-200 bg-white/70 px-3 py-3 text-left transition hover:border-slate-300 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-zinc-50">{entry.recommendedEntryLabel}</p>
                    <span className="text-xs text-slate-500 dark:text-zinc-400">{getSupportLevelBadgeLabel(entry.supportLevel)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-zinc-300">{entry.shortScopeDisclosure}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <details className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 text-slate-600 dark:border-white/10 dark:bg-white/3 dark:text-zinc-300">
          <summary className="cursor-pointer text-sm font-medium text-slate-700 marker:text-slate-400 dark:text-zinc-200">
            今は対象外として静かに明示している領域
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {coverageGroups.notNow.map((entry) => (
              <span key={entry.key} className="rounded-full border border-slate-300/80 px-3 py-1 text-xs text-slate-500 dark:border-white/15 dark:text-zinc-400">
                {entry.recommendedEntryLabel}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400">
            チケット、遠征、3D idol、K-pop、provider fit が薄い niche 店舗は、対応を広げずに現時点の守備範囲として明示しています。
          </p>
        </details>
      </Card>

      <Card className="space-y-3 border border-accent/20 bg-accent/5 text-slate-900 dark:border-accent/25 dark:bg-accent/10 dark:text-zinc-50">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={sectionTitleClass}>現在の選択シナリオ</h2>
          <Badge variant="accent">{getSupportLevelBadgeLabel(highlightedCoverage.supportLevel)}</Badge>
          {selectedScenarioKey ? <Badge variant="outline">プリセット固定中</Badge> : null}
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100">{highlightedCoverage.recommendedEntryLabel}</p>
        <p className="text-sm text-slate-700 dark:text-zinc-200">最適化: {highlightedCoverage.optimizationSummary}</p>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          {selectedScenarioKey
            ? "カード選択に合わせて種別プリセットを同期しました。必要なら下の種別変更で解除できます。"
            : highlightedCoverage.shortScopeDisclosure}
        </p>
      </Card>

      <Card className="space-y-4 border border-accent/25 bg-white text-slate-900 shadow-sm shadow-accent/5 dark:border-accent/30 dark:bg-white/6 dark:text-zinc-50">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={sectionTitleClass}>商品名・作品名・キャラ名・手がかり（任意）</h2>
            <Badge variant="accent">空欄でも開始できます</Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-zinc-300">商品名が正確でなくても使えます。入力があると、特典・在庫・予約状況の確認精度を少し上げられます。</p>
        </div>
        <div className="grid gap-3">
          <textarea
            value={searchClue}
            onChange={(event) => setSearchClue(event.target.value)}
            placeholder={"例：作品名＋缶バッジ / 初回限定 Blu-ray / 特典付きCD"}
            className="min-h-24 w-full rounded-2xl border border-accent/30 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-accent/30 dark:bg-[#111827] dark:text-zinc-50 dark:placeholder:text-zinc-400"
            aria-label="商品名・作品名・キャラ名・手がかり（任意）"
          />
          <p className="text-sm text-slate-600 dark:text-zinc-300">商品名がわからなくても、作品名・キャラ名・価格・特典の手がかりで使えます。</p>
        </div>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>Step 1: 診断の土台を合わせる</h2>
        <p className="text-sm text-slate-600 dark:text-zinc-300">
          入口はシナリオ基準ですが、診断精度のために商品種別も合わせます。対象外の種別は後段でも対象外として伝えます。
        </p>
        <div className="grid gap-3">
          {itemKindOptions.map((option) => (
            <RadioCard key={option.value} title={option.label} description={option.lead} isSelected={itemKind === option.value} onClick={() => handleItemKindChange(option.value)} />
          ))}
        </div>
        {isGoodsClassApplicable(itemKind) ? (
          <label className="space-y-1 text-sm">
            <span className="text-slate-600 dark:text-zinc-300">グッズ種別（精度アップ）</span>
            <select value={goodsClass} onChange={(e) => handleGoodsClassChange(e.target.value as GoodsClass)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#111827] dark:text-zinc-50">
              {goodsClassOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ) : null}
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>Step 2: 診断の深さを選ぶ</h2>
        <div className="grid gap-3">
          <RadioCard title="短（short）" description="速く答えを出す" isSelected={mode === "short"} onClick={() => setMode("short")} />
          <RadioCard title="中（medium）" description="理由と不安をバランス確認" isSelected={mode === "medium"} onClick={() => setMode("medium")} />
          <RadioCard title="長（long）" description="比較・優先度・後悔まで整理" isSelected={mode === "long"} onClick={() => setMode("long")} />
        </div>
        <p className="text-sm text-slate-600 dark:text-zinc-300">{getModeTradeoff(mode)} / {MODE_META[mode].homeDescription}</p>
      </Card>

      <Card className="space-y-3 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleClass}>おすすめモード（補助）</h2>
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
          <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="アイテム名メモ（任意）" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#111827] dark:text-zinc-50" />
          <input value={priceYen} onChange={(e) => setPriceYen(e.target.value)} inputMode="numeric" placeholder="価格（任意）" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#111827] dark:text-zinc-50" />
          <select value={deadline} onChange={(e) => setDeadline(e.target.value as DeadlineValue)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#111827] dark:text-zinc-50">
            {deadlineOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </Card>

      {latestDraft ? (
        <Card className="space-y-3 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <h2 className={sectionTitleClass}>前回の下書き</h2>
          <p className="text-sm text-slate-600 dark:text-zinc-300">{latestDraftLabel} / {latestDraft.runContext.mode}</p>
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
