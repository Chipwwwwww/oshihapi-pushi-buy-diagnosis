"use client";

import { useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { helperTextClass, inputBaseClass, sectionTitleClass } from "@/components/ui/tokens";
import {
  getMarketMemo,
  getSearchEngine,
  setSearchEngine,
  upsertMarketMemo,
  type MarketLevel,
} from "@/src/oshihapi/marketMemoStorage";

type SearchEngine = "google" | "ddg";

type MarketCheckCardProps = {
  runId: string;
  defaultSearchWord: string;
  showBecausePricecheck?: boolean;
};

const marketLevelOptions: { value: MarketLevel; label: string }[] = [
  { value: "high", label: "高騰/プレ値" },
  { value: "normal", label: "ふつう" },
  { value: "calm", label: "落ち着いてる" },
];

function buildSearchUrl(engine: SearchEngine, query: string): string {
  const encoded = encodeURIComponent(query);
  if (engine === "ddg") return `https://duckduckgo.com/?q=${encoded}`;
  return `https://www.google.com/search?q=${encoded}`;
}

function formatSavedTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MarketCheckCard({
  runId,
  defaultSearchWord,
  showBecausePricecheck = false,
}: MarketCheckCardProps) {
  const existingMemo = useMemo(() => getMarketMemo(runId), [runId]);
  const [searchWord, setSearchWord] = useState(existingMemo?.searchWord ?? defaultSearchWord);
  const [searchEngine, setSearchEngineState] = useState<SearchEngine>(() => getSearchEngine());
  const [marketLevel, setMarketLevel] = useState<MarketLevel>(existingMemo?.level ?? "normal");
  const [note, setNote] = useState(existingMemo?.note ?? "");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(existingMemo?.updatedAt ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shouldShow = Boolean(defaultSearchWord.trim()) || showBecausePricecheck;
  if (!shouldShow) return null;

  const handleCopy = async () => {
    const text = searchWord.trim();
    if (!text) {
      setCopyStatus("検索ワードを入力してください");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("コピーしました");
      return;
    } catch {
      // fallback
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (copied) {
        setCopyStatus("コピーしました");
        return;
      }
    } catch {
      // manual fallback
    }

    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      inputRef.current.setSelectionRange(0, inputRef.current.value.length);
    }
    setCopyStatus("長押し→コピーでOK");
  };

  const handleSaveMemo = () => {
    const updatedAt = Date.now();
    upsertMarketMemo({
      runId,
      searchWord: searchWord.trim(),
      level: marketLevel,
      note: note.trim() || undefined,
      updatedAt,
    });
    setSavedAt(updatedAt);
  };

  const searchUrl = buildSearchUrl(searchEngine, searchWord.trim());

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className={sectionTitleClass}>相場チェック（外で確認）</h2>
        <p className={helperTextClass}>※判定は変わりません</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="market-search-word" className="text-sm font-medium text-foreground">
          検索ワード
        </label>
        <input
          id="market-search-word"
          ref={inputRef}
          type="text"
          placeholder="作品名 + キャラ名 + 種別（例：ブルアカ ミカ 1/7 フィギュア）"
          className={inputBaseClass}
          value={searchWord}
          onChange={(event) => {
            setSearchWord(event.target.value);
            setCopyStatus(null);
          }}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={handleCopy} className="w-full rounded-xl">
          検索ワードをコピー
        </Button>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40"
        >
          ブラウザで検索
        </a>
      </div>
      {copyStatus ? <p className={helperTextClass}>{copyStatus}</p> : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">検索エンジン</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={searchEngine === "google" ? "primary" : "outline"}
            onClick={() => {
              setSearchEngine("google");
              setSearchEngineState("google");
            }}
            className="w-full rounded-xl"
          >
            Google
          </Button>
          <Button
            variant={searchEngine === "ddg" ? "primary" : "outline"}
            onClick={() => {
              setSearchEngine("ddg");
              setSearchEngineState("ddg");
            }}
            className="w-full rounded-xl"
          >
            DuckDuckGo
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border p-3">
        <p className="text-sm font-medium text-foreground">相場メモ</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {marketLevelOptions.map((option) => (
            <Button
              key={option.value}
              variant={marketLevel === option.value ? "primary" : "outline"}
              onClick={() => setMarketLevel(option.value)}
              className="w-full rounded-xl"
            >
              {option.label}
            </Button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 140))}
          maxLength={140}
          rows={3}
          placeholder="任意メモ（最大140文字）"
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        <Button onClick={handleSaveMemo} className="w-full rounded-xl">
          メモを保存
        </Button>
        {savedAt ? <p className={helperTextClass}>保存済み（{formatSavedTime(savedAt)}）</p> : null}
      </div>
    </Card>
  );
}
