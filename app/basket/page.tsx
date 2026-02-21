"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { bodyTextClass, containerClass, inputBaseClass, pageTitleClass, sectionTitleClass } from "@/components/ui/tokens";
import {
  evaluateBasketC0,
  type BasketCategory,
  type BasketDecisiveness,
  type BasketHardCap,
  type BasketInput,
  type BasketItem,
  type BasketPurpose,
  type BasketRarity,
  type BasketShopContext,
  type BasketTimePressure,
} from "@/src/oshihapi/basket_c0";
import { resolveStyleMode, type StyleMode } from "@/src/oshihapi/modes/useStyleMode";

const STORAGE_KEY = "oshihapi_basket_last";

const budgetPresets = [3000, 5000, 10000, 15000, 20000];

const shopContextOptions: Array<{ value: BasketShopContext; label: string }> = [
  { value: "melonbooks", label: "メロンブックス" },
  { value: "animate", label: "アニメイト" },
  { value: "event_venue", label: "イベント会場" },
  { value: "online", label: "通販" },
  { value: "other", label: "その他" },
];
const purposeOptions: Array<{ value: BasketPurpose; label: string }> = [
  { value: "itabag", label: "痛バ" },
  { value: "reading", label: "読む" },
  { value: "display", label: "飾る" },
  { value: "collection", label: "コレクション" },
  { value: "gift", label: "プレゼント" },
  { value: "mixed", label: "混在" },
];
const hardCapOptions: Array<{ value: BasketHardCap; label: string }> = [
  { value: "strict", label: "絶対超えない" },
  { value: "flex", label: "多少ならOK" },
  { value: "undecided", label: "未定" },
];
const timePressureOptions: Array<{ value: BasketTimePressure; label: string }> = [
  { value: "today", label: "今日中" },
  { value: "few_days", label: "数日以内" },
  { value: "not_urgent", label: "急がない" },
  { value: "unknown", label: "わからない" },
];
const decisivenessOptions: Array<{ value: BasketDecisiveness; label: string }> = [
  { value: "careful", label: "慎重" },
  { value: "standard", label: "標準" },
  { value: "quick", label: "即決" },
];
const styleModeOptions: Array<{ value: StyleMode; label: string }> = [
  { value: "standard", label: "standard" },
  { value: "kawaii", label: "kawaii" },
  { value: "oshi", label: "oshi" },
];

const categoryOptions: Array<{ value: BasketCategory; label: string }> = [
  { value: "book", label: "商業本" },
  { value: "doujin", label: "同人誌" },
  { value: "standee", label: "アクスタ" },
  { value: "badge", label: "缶バッジ" },
  { value: "random_blind", label: "ランダム/ブラインド" },
  { value: "figure", label: "フィギュア" },
  { value: "media_cd_bd", label: "CD/BD" },
  { value: "apparel", label: "アパレル" },
  { value: "other", label: "その他" },
  { value: "unknown", label: "不明" },
];

const rarityOptions: Array<{ value: BasketRarity; label: string }> = [
  { value: "low", label: "低い" },
  { value: "mid", label: "中" },
  { value: "high", label: "高い" },
  { value: "unknown", label: "不明" },
];

type DraftItem = BasketItem & { priceInput: string };

const createDraftItem = (index: number): DraftItem => ({
  id: `item_${index + 1}`,
  name: "",
  priceInput: "",
  priceJPY: 0,
  category: "unknown",
  rarity: "unknown",
  mustBuy: false,
});

export default function BasketPage() {
  const [shopContext, setShopContext] = useState<BasketShopContext>("melonbooks");
  const [purpose, setPurpose] = useState<BasketPurpose>("mixed");
  const [totalBudgetInput, setTotalBudgetInput] = useState("5000");
  const [hardCap, setHardCap] = useState<BasketHardCap>("strict");
  const [timePressure, setTimePressure] = useState<BasketTimePressure>("few_days");
  const [decisiveness, setDecisiveness] = useState<BasketDecisiveness>("standard");
  const [styleMode, setStyleMode] = useState<StyleMode>("standard");
  const [items, setItems] = useState<DraftItem[]>([createDraftItem(0), createDraftItem(1), createDraftItem(2)]);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const urlStyle = urlParams.get("styleMode") ?? urlParams.get("pm");
    setStyleMode(resolveStyleMode(urlStyle ?? window.localStorage.getItem("oshihapi:styleMode")));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setHasLoadedStorage(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<BasketInput & { items: DraftItem[]; totalBudgetInput?: string }>;
      if (parsed.shopContext) setShopContext(parsed.shopContext);
      if (parsed.purpose) setPurpose(parsed.purpose);
      if (parsed.hardCap) setHardCap(parsed.hardCap);
      if (parsed.timePressure) setTimePressure(parsed.timePressure);
      if (parsed.decisiveness) setDecisiveness(parsed.decisiveness);
      if (parsed.styleMode) setStyleMode(parsed.styleMode);
      if (typeof parsed.totalBudgetJPY === "number") setTotalBudgetInput(String(parsed.totalBudgetJPY));
      if (typeof parsed.totalBudgetInput === "string") setTotalBudgetInput(parsed.totalBudgetInput);
      if (Array.isArray(parsed.items) && parsed.items.length >= 3) {
        setItems(
          parsed.items.slice(0, 10).map((item, index) => ({
            ...createDraftItem(index),
            ...item,
            id: item.id || `item_${index + 1}`,
            priceInput: String((item as DraftItem).priceInput ?? item.priceJPY ?? ""),
          })),
        );
      }
    } catch {
      // ignore broken storage
    }
    setHasLoadedStorage(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedStorage) return;
    const numericBudget = Number(totalBudgetInput);
    const payload = {
      shopContext,
      purpose,
      totalBudgetJPY: Number.isFinite(numericBudget) ? Math.max(0, Math.floor(numericBudget)) : 0,
      totalBudgetInput,
      hardCap,
      timePressure,
      decisiveness,
      styleMode,
      items,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [shopContext, purpose, totalBudgetInput, hardCap, timePressure, decisiveness, styleMode, items, hasLoadedStorage]);

  const totalBudgetJPY = useMemo(() => {
    const parsed = Number(totalBudgetInput);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.floor(parsed));
  }, [totalBudgetInput]);

  const normalizedItems = useMemo(
    () =>
      items
        .map((item) => ({ ...item, name: item.name.trim(), priceJPY: Number(item.priceInput) }))
        .filter((item) => item.name && Number.isFinite(item.priceJPY) && item.priceJPY > 0)
        .map((item) => ({ ...item, priceJPY: Math.floor(item.priceJPY) })),
    [items],
  );

  const result = useMemo(() => {
    if (normalizedItems.length < 3 || totalBudgetJPY <= 0) return null;
    return evaluateBasketC0({
      shopContext,
      purpose,
      totalBudgetJPY,
      hardCap,
      timePressure,
      decisiveness,
      styleMode,
      items: normalizedItems,
    });
  }, [normalizedItems, totalBudgetJPY, shopContext, purpose, hardCap, timePressure, decisiveness, styleMode]);

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    setItems((prev) => {
      if (prev.length >= 10) return prev;
      return [...prev, createDraftItem(prev.length)];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      if (prev.length <= 3) return prev;
      return prev.filter((item) => item.id !== id);
    });
  };

  return (
    <div className={`${containerClass} flex min-h-screen flex-col gap-6 py-8`}>
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">オシハピ Basket β</p>
        <h1 className={pageTitleClass}>まとめ買い（Basket）</h1>
        <p className={bodyTextClass}>3〜10件の候補を、予算内で「買う / 保留 / 見送り」に整理します。</p>
        <Link href="/" className="text-sm text-primary underline underline-offset-4">← トップへ戻る</Link>
      </header>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>Step 1. まとめ買い設定</h2>
        <label className="space-y-1 block">
          <span className="text-sm">shopContext</span>
          <select className={inputBaseClass} value={shopContext} onChange={(e) => setShopContext(e.target.value as BasketShopContext)}>
            {shopContextOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-sm">purpose</span>
          <select className={inputBaseClass} value={purpose} onChange={(e) => setPurpose(e.target.value as BasketPurpose)}>
            {purposeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <div className="space-y-2">
          <p className="text-sm">totalBudget</p>
          <div className="flex flex-wrap gap-2">
            {budgetPresets.map((preset) => (
              <Button key={preset} variant={totalBudgetInput === String(preset) ? "primary" : "outline"} className="px-4 py-2" onClick={() => setTotalBudgetInput(String(preset))}>
                ¥{preset.toLocaleString("ja-JP")}
              </Button>
            ))}
          </div>
          <input className={inputBaseClass} inputMode="numeric" value={totalBudgetInput} onChange={(e) => setTotalBudgetInput(e.target.value)} placeholder="例: 8000" />
        </div>
        <label className="space-y-1 block">
          <span className="text-sm">hardCap</span>
          <select className={inputBaseClass} value={hardCap} onChange={(e) => setHardCap(e.target.value as BasketHardCap)}>
            {hardCapOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-sm">timePressure</span>
          <select className={inputBaseClass} value={timePressure} onChange={(e) => setTimePressure(e.target.value as BasketTimePressure)}>
            {timePressureOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-sm">decisiveness</span>
          <select className={inputBaseClass} value={decisiveness} onChange={(e) => setDecisiveness(e.target.value as BasketDecisiveness)}>
            {decisivenessOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-sm">styleMode</span>
          <select className={inputBaseClass} value={styleMode} onChange={(e) => setStyleMode(e.target.value as StyleMode)}>
            {styleModeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleClass}>Step 2. アイテム入力（3〜10件）</h2>
          <Button variant="outline" onClick={addItem} disabled={items.length >= 10}>+ 追加</Button>
        </div>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-border p-3 space-y-3 dark:border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">#{index + 1}</p>
                <Button variant="ghost" className="px-3 py-2" disabled={items.length <= 3} onClick={() => removeItem(item.id)}>削除</Button>
              </div>
              <input className={inputBaseClass} value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} placeholder="商品名（必須）" />
              <input className={inputBaseClass} inputMode="numeric" value={item.priceInput} onChange={(e) => updateItem(item.id, { priceInput: e.target.value })} placeholder="価格（円・必須）" />
              <select className={inputBaseClass} value={item.category} onChange={(e) => updateItem(item.id, { category: e.target.value as BasketCategory })}>
                {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select className={inputBaseClass} value={item.rarity} onChange={(e) => updateItem(item.id, { rarity: e.target.value as BasketRarity })}>
                {rarityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={item.mustBuy} onChange={(e) => updateItem(item.id, { mustBuy: e.target.checked })} />
                mustBuy（特典/頼まれ/期限）
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
        <h2 className={sectionTitleClass}>Step 3. 結果</h2>
        {!result ? (
          <p className="text-sm text-muted-foreground">有効なアイテムを3件以上、予算を1円以上入力してください。</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-3 text-sm dark:border-white/10">
              <p>予算: ¥{result.totals.budgetJPY.toLocaleString("ja-JP")}</p>
              <p>合計（全候補）: ¥{result.totals.totalJPY.toLocaleString("ja-JP")}</p>
              <p>BUY_NOW合計: ¥{result.totals.buyNowTotalJPY.toLocaleString("ja-JP")}</p>
              <p className={result.totals.overJPY > 0 ? "text-rose-500" : "text-emerald-600"}>
                {result.totals.overJPY > 0
                  ? `予算オーバー: ¥${result.totals.overJPY.toLocaleString("ja-JP")}`
                  : `残額: ¥${result.totals.remainingJPY.toLocaleString("ja-JP")}`}
              </p>
              {result.totals.mustBuyOnlyOverBudget ? <p className="text-rose-500">mustBuy項目だけで上限を超えています。</p> : null}
            </div>

            {([
              ["BUY_NOW", result.buyNow],
              ["HOLD", result.hold],
              ["SKIP", result.skip],
            ] as const).map(([label, list]) => (
              <div key={label} className="space-y-2">
                <h3 className="text-sm font-semibold">{label} ({list.length})</h3>
                {list.length === 0 ? <p className="text-sm text-muted-foreground">なし</p> : null}
                {list.map((item) => (
                  <div key={`${label}_${item.id}`} className="rounded-xl border border-border p-3 text-sm dark:border-white/10">
                    <p className="font-semibold">{item.name} / ¥{item.priceJPY.toLocaleString("ja-JP")} / score {item.priorityScore}</p>
                    <ul className="list-disc pl-5">
                      {item.reasons.map((reason, index) => <li key={`${item.id}_${index}`}>{reason}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            ))}

            {result.cutList.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100">
                <h3 className="font-semibold">Cut-to-budget候補（hardCap: 絶対超えない）</h3>
                <ul className="list-disc pl-5">
                  {result.cutList.map((item) => (
                    <li key={`cut_${item.id}`}>{item.name}（¥{item.priceJPY.toLocaleString("ja-JP")}, score {item.priorityScore}）</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
