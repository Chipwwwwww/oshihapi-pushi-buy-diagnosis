"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import DecisionScale from "@/components/DecisionScale";
import ModeToggle from "@/components/ModeToggle";
import AiConsultCta from "@/components/AiConsultCta";
import MarketCheckCard from "@/components/MarketCheckCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import RadioCard from "@/components/ui/RadioCard";
import Toast from "@/components/ui/Toast";
import {
  bodyTextClass,
  containerClass,
  helperTextClass,
  sectionTitleClass,
} from "@/components/ui/tokens";
import { merch_v2_ja } from "@/src/oshihapi/merch_v2_ja";
import { buildLongPrompt } from "@/src/oshihapi/promptBuilder";
import type { DecisionRun, FeedbackImmediate } from "@/src/oshihapi/model";
import type { BasketInput } from "@/src/oshihapi/basket_c0";
import { decisivenessLabels } from "@/src/oshihapi/decisiveness";
import { buildPresentation } from "@/src/oshihapi/decisionPresentation";
import { clamp, engineConfig, normalize01ToSigned } from "@/src/oshihapi/engineConfig";
import {
  isPlatformMarketAction,
  neutralizeMarketAction,
} from "@/src/oshihapi/neutralizePlatformActions";
import { findRun, updateRun } from "@/src/oshihapi/runStorage";
import { createReplayDraft } from "@/src/store/diagnosisStore";
import { sendTelemetry, TELEMETRY_OPT_IN_KEY } from "@/src/oshihapi/telemetryClient";
import { formatResultByMode } from "@/src/oshihapi/modes/formatResultByMode";
import { MODE_DICTIONARY, Verdict } from "@/src/oshihapi/modes/mode_dictionary";
import { COPY_BY_MODE } from "@/src/oshihapi/modes/copy_dictionary";
import { shouldAskStorage, STORAGE_FIT_LABEL } from "@/src/oshihapi/storageGate";
import {
  getStyleModeFromSearchParams,
  setStyleModeToLocalStorage,
  type StyleMode,
} from "@/src/oshihapi/modes/useStyleMode";
import { buildMercariKeyword, isMercariRelevantScenario } from "@/src/oshihapi/mercariKeyword";
import { resolveAmazonAffiliateDestination } from "@/src/oshihapi/amazonAffiliateConfig";
import { buildRakutenKeyword } from "@/src/oshihapi/rakutenKeyword";
import { resolveSurugayaAffiliateDestination } from "@/src/oshihapi/surugayaConfig";
import { resolveAmiamiAffiliateDestination } from "@/src/oshihapi/amiamiConfig";
import { resolveGamersAffiliateDestination } from "@/src/oshihapi/gamersConfig";
import { resolveHmvAffiliateDestination } from "@/src/oshihapi/hmvConfig";
import { planProviderCards } from "@/src/oshihapi/providerPlanner";
import ProviderComparisonModule from "@/components/ProviderComparisonModule";

const BASKET_STORAGE_KEY = "oshihapi_basket_last";

type RakutenSearchItem = {
  name: string;
  price: number | null;
  affiliateUrl: string;
  image: string | null;
  shopName: string | null;
  reviewAverage: number | null;
  reviewCount: number | null;
  availability: number | null;
};


function getDefaultSearchWord(run: DecisionRun): string {
  const itemName = run.meta.itemName?.trim() ?? "";
  const kind = run.meta.itemKind ?? "goods";
  if (run.useCase === "game_billing") {
    const billingType = typeof run.gameBillingAnswers?.gb_q2_type === "string"
      ? run.gameBillingAnswers.gb_q2_type
      : "課金";
    return itemName ? `${itemName} ${billingType}`.trim() : "";
  }
  if (itemName) return `${itemName} ${kind}`.trim();


  const item = (run.answers.item ?? {}) as Record<string, string | undefined>;
  const candidates = [
    item.name,
    run.answers.series,
    run.answers.character,
    run.answers.type,
  ];
  const merged = candidates
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" ");
  return merged;
}

function getActionLink(action: DecisionRun["output"]["actions"][number]): {
  label: string;
  href: string;
} | null {
  const legacyAction = action as {
    linkOut?: { label?: string; url?: string; href?: string };
    label?: string;
    title?: string;
    url?: string;
    href?: string;
  };

  const label =
    legacyAction.linkOut?.label ??
    legacyAction.label ??
    legacyAction.title ??
    null;
  const href =
    legacyAction.linkOut?.url ??
    legacyAction.linkOut?.href ??
    legacyAction.url ??
    legacyAction.href ??
    null;

  if (!label || !href) return null;
  return { label, href };
}

export default function ResultPage() {
  const router = useRouter();
  const params = useParams<{ runId: string }>();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<string | null>(null);
  const [localFeedback, setLocalFeedback] = useState<FeedbackImmediate | undefined>(
    undefined,
  );
  const [telemetryOptIn, setTelemetryOptIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const legacyValue =
      window.localStorage.getItem("oshihapi:telemetry_opt_in") === "true";
    const nextValue = window.localStorage.getItem(TELEMETRY_OPT_IN_KEY) === "true";
    if (legacyValue && !nextValue) {
      window.localStorage.setItem(TELEMETRY_OPT_IN_KEY, "true");
    }
    return legacyValue || nextValue;
  });
  const [telemetrySubmitting, setTelemetrySubmitting] = useState(false);
  const [telemetrySubmitted, setTelemetrySubmitted] = useState(false);
  const [skipPrice, setSkipPrice] = useState(true);
  const [skipItemName, setSkipItemName] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showAllReasons, setShowAllReasons] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const [rakutenItems, setRakutenItems] = useState<RakutenSearchItem[]>([]);
  const [rakutenReady, setRakutenReady] = useState(false);
  const [styleMode, setStyleMode] = useState<StyleMode>(() => getStyleModeFromSearchParams(searchParams) ?? "standard");

  const runId = params?.runId;
  const run = useMemo<DecisionRun | undefined>(() => {
    if (!runId) return undefined;
    return findRun(runId);
  }, [runId]);

  const feedback = localFeedback ?? run?.feedback_immediate;
  const basketId = run?.meta.basketId ?? searchParams.get("basketId") ?? undefined;
  const basketItemId = run?.meta.basketItemId ?? searchParams.get("basketItemId") ?? undefined;
  const canWriteBackToBasket = Boolean(basketId && basketItemId);


  const canShowDiagnostics = process.env.NODE_ENV !== "production" && searchParams.get("debug") === "1";

  useEffect(() => {
    setStyleMode(getStyleModeFromSearchParams(searchParams) ?? "standard");
  }, [searchParams]);

  const updateStyleMode = (nextMode: StyleMode) => {
    setStyleMode(nextMode);
    setStyleModeToLocalStorage(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("styleMode", nextMode);
    router.replace(`/result/${runId}?${params.toString()}`);
  };

  const presentation = useMemo(() => {
    if (!run) return undefined;
    return (
      run.output.presentation ??
      buildPresentation({
        decision: run.output.decision,
        runId: run.runId,
        createdAt: run.createdAt,
        actions: run.output.actions,
        reasons: run.output.reasons,
      })
    );
  }, [run]);

  const defaultSearchWord = useMemo(() => (run ? getDefaultSearchWord(run) : ""), [run]);
  const hasSearchWord = defaultSearchWord.trim().length > 0;
  const mercariRelevant = useMemo(
    () => isMercariRelevantScenario(run?.meta.itemKind, run?.meta.goodsClass),
    [run?.meta.goodsClass, run?.meta.itemKind],
  );
  const mercariKeywordResult = useMemo(
    () =>
      run
        ? buildMercariKeyword({
            rawSearchWord: defaultSearchWord,
            itemName: run.meta.itemName,
            itemKind: run.meta.itemKind,
            goodsClass: run.meta.goodsClass,
            answers: run.answers,
            meta: run.meta,
          })
        : { keyword: null, source: "none" as const },
    [defaultSearchWord, run],
  );
  const amazonDestination = useMemo(
    () => resolveAmazonAffiliateDestination({ itemKind: run?.meta.itemKind, goodsClass: run?.meta.goodsClass }),
    [run?.meta.goodsClass, run?.meta.itemKind],
  );
  const rakutenKeyword = useMemo(
    () =>
      buildRakutenKeyword({
        rawSearchWord: defaultSearchWord,
        itemKind: run?.meta.itemKind,
        goodsClass: run?.meta.goodsClass,
        useCase: run?.useCase,
      }),
    [defaultSearchWord, run?.meta.goodsClass, run?.meta.itemKind, run?.useCase],
  );
  const rakutenItem = rakutenItems[0] ?? null;
  const surugayaDestination = useMemo(
    () =>
      resolveSurugayaAffiliateDestination({
        itemKind: run?.meta.itemKind,
        goodsClass: run?.meta.goodsClass,
      }),
    [run?.meta.goodsClass, run?.meta.itemKind],
  );
  const amiamiDestination = useMemo(
    () =>
      resolveAmiamiAffiliateDestination({
        itemKind: run?.meta.itemKind,
        goodsClass: run?.meta.goodsClass,
      }),
    [run?.meta.goodsClass, run?.meta.itemKind],
  );
  const gamersDestination = useMemo(
    () =>
      resolveGamersAffiliateDestination({
        itemKind: run?.meta.itemKind,
        goodsClass: run?.meta.goodsClass,
      }),
    [run?.meta.goodsClass, run?.meta.itemKind],
  );
  const hmvDestination = useMemo(
    () =>
      resolveHmvAffiliateDestination({
        itemKind: run?.meta.itemKind,
        goodsClass: run?.meta.goodsClass,
      }),
    [run?.meta.goodsClass, run?.meta.itemKind],
  );
  const providerPlan = useMemo(() => {
    if (!run || !rakutenReady) return { cards: [], diagnostics: null };
    const planned = planProviderCards({
      runId: run.runId,
      itemKind: run.meta.itemKind,
      goodsClass: run.meta.goodsClass,
      verdict: run.output.decision,
      mercariRelevant,
      mercariKeyword: mercariKeywordResult.keyword,
      amazonDestination,
      rakutenAffiliateUrl: rakutenItem?.affiliateUrl ?? null,
      surugayaDestination,
      amiamiDestination,
      gamersDestination,
      hmvDestination,
    });
    return { cards: planned.cards, diagnostics: planned.diagnostics };
  }, [
    amazonDestination,
    mercariKeywordResult.keyword,
    mercariRelevant,
    rakutenItem?.affiliateUrl,
    rakutenReady,
    run,
    surugayaDestination,
    amiamiDestination,
    gamersDestination,
    hmvDestination,
  ]);

  const showBecausePricecheck = presentation?.tags?.includes("PRICECHECK") === true;
  const hasPlatformMarketAction = useMemo(
    () => run?.output.actions.some((action) => isPlatformMarketAction(action)) ?? false,
    [run],
  );
  const displayActions = useMemo(
    () =>
      run?.output.actions.map((action) =>
        isPlatformMarketAction(action) ? neutralizeMarketAction(action) : action,
      ) ?? [],
    [run],
  );
  useEffect(() => {
    let cancelled = false;

    const fetchRakuten = async () => {
      if (!run || !rakutenKeyword) {
        setRakutenItems([]);
        setRakutenReady(true);
        return;
      }

      try {
        const params = new URLSearchParams({ keyword: rakutenKeyword });
        const response = await fetch(`/api/rakuten/search?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            setRakutenItems([]);
            setRakutenReady(true);
          }
          return;
        }
        const payload = (await response.json()) as { items?: RakutenSearchItem[] };
        if (!cancelled) {
          const nextItems = Array.isArray(payload.items)
            ? payload.items.filter((item) => typeof item?.affiliateUrl === "string" && item.affiliateUrl.length > 0)
            : [];
          setRakutenItems(nextItems);
          setRakutenReady(true);
        }
      } catch {
        if (!cancelled) {
          setRakutenItems([]);
          setRakutenReady(true);
        }
      }
    };

    setRakutenReady(false);
    void fetchRakuten();

    return () => {
      cancelled = true;
    };
  }, [rakutenKeyword, run]);

  useEffect(() => {
    setShowAlternatives(false);
    setShowAllReasons(false);
    setShowAllActions(false);
  }, [runId]);

  const alternatives = presentation?.alternatives ?? [];

  const modeFormattedResult = useMemo(() => {
    if (!run) return undefined;
    const outputExt = run.output as typeof run.output & {
      waitType?: string;
      reasonTags?: string[];
    };

    return formatResultByMode({
      runId: run.runId,
      verdict: run.output.decision as Verdict,
      waitType: outputExt.waitType,
      reasons: run.output.reasons.map((reason) => reason.text),
      reasonTags: outputExt.reasonTags ?? run.output.reasons.map((reason) => reason.id),
      actions: displayActions.map((action) => action.text),
      mode: styleMode
    });
  }, [displayActions, styleMode, run]);

  const outputExt = run?.output as
    | (DecisionRun["output"] & {
        waitType?: string;
        reasonTags?: string[];
      })
    | undefined;
  const modeCopy = COPY_BY_MODE[styleMode];
  const normalizedWaitType = outputExt?.waitType ?? (run?.output.decision === "THINK" ? "none" : "none");
  const storageFitValue =
    run && shouldAskStorage(run.meta.itemKind, run.meta.goodsSubtype) && typeof run.answers.q_storage_fit === "string"
      ? STORAGE_FIT_LABEL[run.answers.q_storage_fit] ?? run.answers.q_storage_fit
      : null;

  const adviceText =
    run?.output.decision === "BUY"
      ? MODE_DICTIONARY[styleMode].explanation.buy
      : run?.output.decision === "THINK"
        ? MODE_DICTIONARY[styleMode].explanation.wait[normalizedWaitType] ??
          MODE_DICTIONARY[styleMode].explanation.wait.none
        : MODE_DICTIONARY[styleMode].explanation.skip;

  const safeConfidence = clamp(0, 100, Number.isFinite(run?.output.confidence) ? (run?.output.confidence ?? 0) : 0);

  const decisionScale = useMemo(() => {
    if (!run) return "wait";
    if (run.output.decision === "BUY") return "buy";
    if (run.output.decision === "SKIP") return "no";
    return "wait";
  }, [run]);

  const decisionIndex = useMemo(() => {
    if (!run) return 0;
    const score = run.output.score;
    if (typeof score === "number" && Number.isFinite(score)) {
      return clamp(-1, 1, score);
    }
    let fallback = 0;
    for (const [dim, weight] of Object.entries(engineConfig.decisionWeights)) {
      const val = run.output.scoreSummary[dim as keyof typeof run.output.scoreSummary];
      if (typeof val === "number") {
        fallback += normalize01ToSigned(val) * weight;
      }
    }
    return clamp(-1, 1, fallback);
  }, [run]);

  const longPrompt = useMemo(() => {
    if (!run) return "";
    if (run.useCase === "game_billing") {
      return "ゲーム課金（中立）v1では、結果カードの情報チェックを使って評価・天井・内容を確認してください。";
    }
    return buildLongPrompt({ run, questionSet: merch_v2_ja });
  }, [run]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1500);
  };

  const logActionClick = (actionId: string) => {
    if (!runId) return;
    updateRun(runId, (current) => ({
      ...current,
      behavior: {
        ...(current.behavior ?? {
          time_total_ms: 0,
          time_per_q_ms: [],
          num_changes: 0,
          num_backtracks: 0,
          actions_clicked: [],
        }),
        actions_clicked: [...(current.behavior?.actions_clicked ?? []), actionId],
      },
    }));
  };

  const handleCopyShare = async () => {
    if (!run || !modeFormattedResult) return;
    try {
      await navigator.clipboard.writeText(modeFormattedResult.shareTextX280);
      logActionClick("copy_share_text");
      showToast("コピーしました");
    } catch {
      showToast("コピーに失敗しました");
    }
  };

  const handleCopyPrompt = async () => {
    if (!longPrompt) return;
    try {
      await navigator.clipboard.writeText(longPrompt);
      logActionClick("copy_long_prompt");
      showToast("コピーしました");
    } catch {
      showToast("コピーに失敗しました");
    }
  };

  const handleFeedback = (value: FeedbackImmediate) => {
    if (!runId || !run) return;
    const nextRun = updateRun(runId, (current) => ({
      ...current,
      feedback_immediate: value,
    }));
    setLocalFeedback(nextRun?.feedback_immediate ?? value);
  };

  const handleTelemetrySubmit = async () => {
    if (!run || telemetrySubmitting || telemetrySubmitted || !telemetryOptIn) return;
    setTelemetrySubmitting(true);
    try {
      const result = await sendTelemetry("run_export", run, {
        l1Label: feedback,
        includePrice: !skipPrice,
        includeItemName: !skipItemName,
      });
      if (result.ok) {
        setTelemetrySubmitted(true);
        showToast("送信しました（匿名）");
      } else {
        const hint = result.hint ? ` (${result.hint})` : "";
        const errorText = result.error ? `: ${result.error}${hint}` : "";
        showToast(`送信に失敗しました${errorText}`);
      }
    } catch {
      showToast("送信に失敗しました。時間をおいて再試行してください。");
    } finally {
      setTelemetrySubmitting(false);
    }
  };

  const handleReplay = (seedAnswers: boolean) => {
    if (!run) return;
    const params = new URLSearchParams();
    const replayItemKind = run.meta.itemKind ?? "goods";
    params.set("mode", run.mode);
    params.set("styleMode", styleMode);
    params.set("itemKind", replayItemKind);
    if (replayItemKind === "goods" || replayItemKind === "preorder" || replayItemKind === "used") {
      params.set("gc", run.meta.goodsClass ?? "small_collection");
    }
    params.set("deadline", run.meta.deadline ?? "unknown");
    if (run.meta.itemName) params.set("itemName", run.meta.itemName);
    if (Number.isFinite(run.meta.priceYen ?? Number.NaN)) params.set("priceYen", String(run.meta.priceYen));
    params.set("decisiveness", run.decisiveness ?? "standard");
    if (seedAnswers) {
      const draft = createReplayDraft(run, styleMode);
      params.set("draftId", draft.draftId);
    } else {
      params.set("startNew", "1");
    }
    router.push(`/flow?${params.toString()}`);
  };

  const handleWriteBackToBasket = () => {
    if (!run || !basketId || !basketItemId || typeof window === "undefined") return;
    const raw = window.localStorage.getItem(BASKET_STORAGE_KEY);
    if (!raw) {
      showToast("バスケットが見つかりませんでした");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as BasketInput & { basketId?: string; totalBudgetInput?: string };
      if (parsed.basketId && parsed.basketId !== basketId) {
        showToast("別のバスケットです");
        return;
      }
      if (!Array.isArray(parsed.items)) {
        showToast("バスケット形式が不正です");
        return;
      }
      const shortReasons = run.output.reasons.slice(0, 3).map((reason) => reason.text).filter(Boolean);
      const updatedItems = parsed.items.map((item) =>
        item.id === basketItemId
          ? {
              ...item,
              singleResultOverride: {
                decision: run.output.decision,
                confidence: run.output.confidence,
                reasons: shortReasons,
                sourceRunId: run.runId,
              },
            }
          : item,
      );
      window.localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify({ ...parsed, basketId, items: updatedItems }));
      router.push(`/basket?resume=1#item-${basketItemId}`);
    } catch {
      showToast("反映に失敗しました");
    }
  };

  if (!run) {
    return (
      <div
        className={`${containerClass} flex min-h-screen flex-col items-center justify-center gap-4 py-10`}
      >
        <p className={helperTextClass}>
          結果が見つかりませんでした。ホームからもう一度お試しください。
        </p>
        <div className="flex w-full flex-col gap-4">
          <Button onClick={() => router.push("/")} className="w-full">
            Homeへ戻る
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/history")}
            className="w-full rounded-xl"
          >
            履歴を見る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${containerClass} flex min-h-screen flex-col gap-6 py-10`}>
      <header className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-accent">{modeCopy.ui.resultSummaryTitle}</p>
        <div className="space-y-2">
          <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">{modeCopy.result.verdictTitle[run.output.decision]}</h1>
          <p className={`${bodyTextClass} text-foreground/90`}>{modeCopy.result.verdictLead[run.output.decision]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">信頼度 {safeConfidence}%</Badge>
          {presentation?.badge && !presentation.badge.includes("判定") ? (
            <Badge variant="outline">{presentation.badge}</Badge>
          ) : null}
          {run.output.decision === "THINK" && run.output.holdSubtype ? (
            <Badge variant="outline">保留タイプ: {run.output.holdSubtype}</Badge>
          ) : null}
        </div>
        <p className={helperTextClass}>
          決め切り度: {decisivenessLabels[run.decisiveness ?? "standard"]}（変更可）
        </p>
        {storageFitValue ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
            <span className="font-semibold text-foreground">置き場所</span>
            <span className="text-muted-foreground">{storageFitValue}</span>
          </div>
        ) : null}
        {alternatives.length > 0 ? (
          <div className="space-y-2 rounded-2xl border border-border bg-card/90 p-3">
            <Button
              variant="ghost"
              onClick={() => setShowAlternatives((prev) => !prev)}
              className="h-auto w-full justify-between rounded-xl px-3 py-2 text-sm"
            >
              <span>別の言い方（{alternatives.length}）</span>
              <span>{showAlternatives ? "閉じる" : "開く"}</span>
            </Button>
            {showAlternatives ? (
              <ul className="grid gap-2">
                {alternatives.map((alt) => (
                  <li key={alt}>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                    >
                      {alt}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className={helperTextClass}>{presentation?.note ?? "※判定は変わりません"}</p>
          </div>
        ) : null}
      </header>

      <DecisionScale decision={decisionScale} index={decisionIndex} />

      <Card className="space-y-3 border-amber-200 bg-amber-50 dark:ring-1 dark:ring-white/10">
        <h2 className="text-lg font-semibold text-amber-900">{modeCopy.ui.adviceTitle}</h2>
        <p className="text-sm text-amber-800">{adviceText}</p>
        <p className="text-xs text-amber-700">
          {modeCopy.result.waitTypeLabel[normalizedWaitType] ?? modeCopy.result.waitTypeLabel.none}
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>{modeCopy.ui.actionsTitle}</h2>
        <ul className="grid gap-4">
          {(showAllActions ? displayActions : displayActions.slice(0, 3)).map((action) => {
            const actionLink = getActionLink(action);
            return (
              <li key={action.id} className="rounded-2xl border border-border p-4">
              <p className={bodyTextClass}>{modeCopy.result.actionLabel[action.id] ?? action.text}
                {modeCopy.result.actionHelp[action.id] ? (
                  <span className="mt-1 block text-xs text-muted-foreground">{modeCopy.result.actionHelp[action.id]}</span>
                ) : null}</p>
                {actionLink ? (
                  <a
                    href={actionLink.href}
                    onClick={() => logActionClick(`link:${action.id}`)}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    {actionLink.label}
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
        {displayActions.length > 3 ? (
          <Button variant="ghost" onClick={() => setShowAllActions((prev) => !prev)} className="w-full">
            {showAllActions ? "提案をたたむ" : `もっと見る（残り${displayActions.length - 3}件）`}
          </Button>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>判定に効いた要因</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">プラス要因</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
              {(run.output.positiveFactors ?? []).length > 0
                ? (run.output.positiveFactors ?? []).map((factor) => <li key={factor}>{factor}</li>)
                : <li>大きなプラス要因は見つかりませんでした</li>}
            </ul>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-900">マイナス要因</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-900">
              {(run.output.negativeFactors ?? []).length > 0
                ? (run.output.negativeFactors ?? []).map((factor) => <li key={factor}>{factor}</li>)
                : <li>大きなマイナス要因は見つかりませんでした</li>}
            </ul>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>なぜこの結論か</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold">なぜBUYではない？</p>
            <p className="mt-2 text-sm text-muted-foreground">{run.output.whyNotBuyYet ?? "十分な買う根拠が未確定"}</p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold">なぜSKIPではない？</p>
            <p className="mt-2 text-sm text-muted-foreground">{run.output.whyNotSkipYet ?? "見送り確定には至っていない"}</p>
          </div>
        </div>
        {run.output.subtypeReason ? (
          <p className="text-sm text-muted-foreground">保留理由: {run.output.subtypeReason}</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold">ブロッカー</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {(run.output.blockingFactors ?? []).length > 0
                ? (run.output.blockingFactors ?? []).map((factor) => <li key={factor}>{factor}</li>)
                : <li>主要ブロッカーは検出されませんでした</li>}
            </ul>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold">推奨理由</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {(run.output.recommendationReasons ?? []).length > 0
                ? (run.output.recommendationReasons ?? []).map((reason) => <li key={reason}>{reason}</li>)
                : <li>理由データなし</li>}
            </ul>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>{modeCopy.ui.reasonsTitle}</h2>
        <div className="grid gap-4">
          {(showAllReasons ? run.output.reasons : run.output.reasons.slice(0, 6)).map((reason) => (
            <div key={reason.id} className="rounded-2xl border border-border p-4">
              <p className={bodyTextClass}>{modeCopy.result.reasonTagLabel[reason.id] ?? reason.text}</p>
            </div>
          ))}
        </div>
        {run.output.reasons.length > 6 ? (
          <Button variant="ghost" onClick={() => setShowAllReasons((prev) => !prev)} className="w-full">
            {showAllReasons ? "理由をたたむ" : `もっと見る（残り${run.output.reasons.length - 6}件）`}
          </Button>
        ) : null}
      </Card>


      <Card className="space-y-4">
        <ModeToggle value={styleMode} onChange={updateStyleMode} />
        <p className={helperTextClass}>{MODE_DICTIONARY[styleMode].labels.disclaimer}</p>
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>共有テキスト</h2>
        <p className="text-3xl leading-none">{modeFormattedResult?.sticker ?? ""}</p>
        <p className="whitespace-pre-line text-sm text-muted-foreground">
          {modeFormattedResult?.shareTextX280 ?? run.output.shareText}
        </p>
        <Button onClick={handleCopyShare} className="w-full rounded-xl">
          共有テキストをコピー
        </Button>
      </Card>

      {!hasSearchWord ? (
        <Card className="space-y-2 border-dashed">
          <h2 className={sectionTitleClass}>相場チェック</h2>
          <p className={helperTextClass}>商品名を入力すると、検索ワードを自動で作れます。</p>
        </Card>
      ) : null}

      <div id="market-check" style={{ scrollMarginTop: "96px" }}>
        <MarketCheckCard
          runId={run.runId}
          defaultSearchWord={defaultSearchWord}
          itemKind={run.meta.itemKind}
          goodsClass={run.meta.goodsClass}
          verdict={run.output.decision}
          mercariEnabled={mercariRelevant}
          onMercariClick={() => logActionClick("mercari_search_click")}
          showBecausePricecheck={showBecausePricecheck || hasPlatformMarketAction || run.useCase === "game_billing"}
          title={run.useCase === "game_billing" ? "情報チェック（評価・天井など）" : undefined}
          description={run.useCase === "game_billing" ? "※判定は変わりません。外部で情報を確認してから決めましょう。" : undefined}
          placeholder={
            run.useCase === "game_billing"
              ? "ゲーム名 + 施策名（例：◯◯ 限定ガチャ 評価 / ◯◯ 天井）"
              : undefined
          }
        />
      </div>

      <ProviderComparisonModule
        cards={providerPlan.cards}
        onProviderClick={(providerId) => {
          if (providerId === "mercari") {
            logActionClick("mercari_search_click");
            return;
          }
          if (providerId === "amazon") {
            logActionClick(`amazon_result_click:${amazonDestination?.id ?? "unknown"}`);
            return;
          }
          if (providerId === "rakuten") {
            logActionClick("rakuten_result_click");
            return;
          }
          if (providerId === "surugaya") {
            logActionClick("surugaya_result_click");
            return;
          }
          if (providerId === "amiami") {
            logActionClick("amiami_result_click");
            return;
          }
          logActionClick(`provider_click:${providerId}`);
        }}
      />

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>このあとどうした？</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { id: "bought", label: "買った" },
            { id: "waited", label: "保留した" },
            { id: "not_bought", label: "買わなかった" },
            { id: "unknown", label: "まだ" },
          ].map((option) => (
            <RadioCard
              key={option.id}
              title={option.label}
              isSelected={feedback === option.id}
              onClick={() => handleFeedback(option.id as FeedbackImmediate)}
            />
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>学習のために匿名データを送信</h2>
        <p className={helperTextClass}>
          個人が特定される情報は送信されません。いつでも設定を変更できます。
        </p>
        <label className="flex items-center justify-between gap-4 text-sm text-foreground">
          <span>匿名データ送信に協力する</span>
          <input
            type="checkbox"
            checked={telemetryOptIn}
            onChange={(event) => {
              const nextValue = event.target.checked;
              setTelemetryOptIn(nextValue);
              if (typeof window !== "undefined") {
                window.localStorage.setItem(TELEMETRY_OPT_IN_KEY, String(nextValue));
              }
            }}
            className="h-5 w-5 rounded border border-border text-primary"
          />
        </label>
        <div className="grid gap-3 text-sm text-muted-foreground">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={skipPrice}
              onChange={(event) => setSkipPrice(event.target.checked)}
              className="h-4 w-4 rounded border border-border text-primary"
            />
            価格を送らない
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={skipItemName}
              onChange={(event) => setSkipItemName(event.target.checked)}
              className="h-4 w-4 rounded border border-border text-primary"
            />
            商品名を送らない
          </label>
        </div>
        <Button
          onClick={handleTelemetrySubmit}
          className="w-full rounded-xl"
          disabled={!telemetryOptIn || telemetrySubmitting || telemetrySubmitted}
        >
          {telemetrySubmitted ? "送信済み" : "送信する"}
        </Button>
      </Card>

      <AiConsultCta longPrompt={longPrompt} onCopyPrompt={handleCopyPrompt} />

      <div className="grid gap-4">
        {canWriteBackToBasket ? (
          <Button onClick={handleWriteBackToBasket} className="w-full rounded-xl">
            バスケットに反映して戻る
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => handleReplay(false)} className="w-full rounded-xl">もう一度診断（新規）</Button>
        <Button onClick={() => handleReplay(true)} className="w-full rounded-xl">前回の回答で再診断</Button>
        <Button onClick={() => router.push("/history")} className="w-full rounded-xl">
          履歴を見る
        </Button>
      </div>

      {canShowDiagnostics && run?.diagnosticTrace ? (
        <Card className="space-y-3 border-dashed">
          <h2 className={sectionTitleClass}>Debug Trace (dev only)</h2>
          <details>
            <summary className="cursor-pointer text-sm">診断トレースJSONを表示</summary>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950/95 p-3 text-xs text-slate-100">
              {JSON.stringify({ ...run.diagnosticTrace, providerTrace: providerPlan.diagnostics }, null, 2)}
            </pre>
          </details>
        </Card>
      ) : null}

      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}
