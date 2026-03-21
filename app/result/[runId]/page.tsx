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
import type { DecisionRun, FeedbackImmediate, ResultBandTrace } from "@/src/oshihapi/model";
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
import type { ProviderCandidate, ProviderDiagnostics } from "@/src/oshihapi/providerPlanner";
import ProviderComparisonModule from "@/components/ProviderComparisonModule";
import { getScenarioCoverageSummary, getSupportLevelBadgeLabel } from "@/src/oshihapi/scenarioCoverage";

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
  const parsedSearchClues = run.meta.parsedSearchClues;
  const kind = run.meta.itemKind ?? "goods";
  if (run.useCase === "game_billing") {
    const billingType = typeof run.gameBillingAnswers?.gb_q2_type === "string"
      ? run.gameBillingAnswers.gb_q2_type
      : "課金";
    return itemName ? `${itemName} ${billingType}`.trim() : "";
  }
  if (itemName) return `${itemName} ${kind}`.trim();

  if (parsedSearchClues) {
    const clueParts = [
      ...parsedSearchClues.workCandidates,
      ...parsedSearchClues.characterCandidates,
      ...parsedSearchClues.itemTypeCandidates,
      ...parsedSearchClues.bonusClues,
      ...parsedSearchClues.editionClues,
    ].filter(Boolean);
    if (clueParts.length > 0) return clueParts.join(" ");
    if (parsedSearchClues.raw.trim()) return parsedSearchClues.raw.trim();
  }

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

const BAND_REASON_LABEL: Record<ResultBandTrace["bandNarrowingReason"], string> = {
  high_signal_aligned: "高シグナルで判定帯を狭めました",
  insufficient_signal: "入力がまだ足りないため帯は広めです",
  conflicting_signals: "相反するシグナルがあるため帯は広めです",
  low_confidence: "低信頼の trace が残るため帯は広めです",
  fallback_state: "fallback / trust gate があるため帯は広めです",
  ambiguous_path: "判定軸が割れているため帯は広めです",
};

const BAND_BLOCKER_LABEL: Record<string, string> = {
  insufficient_critical_answers: "高影響の回答数が不足",
  incomplete_high_impact_inputs: "未確定の高影響入力あり",
  low_confidence_trace: "低信頼 trace が残存",
  fallback_or_trust_gate_active: "fallback / trust gate 中",
  ambiguous_decision_signal: "判定方向がまだ集中しきっていない",
  budget_urgency_tension: "予算と欲しさ・急ぎが綱引き",
  mixed_motive_tension: " motive が混在",
  wait_vs_buy_tension: "待つ理由と今買う理由が両立",
  impulse_conflict: "気分の勢いが強い",
  bonus_pressure_tension: "bonus / completion 圧が強い",
  score_axis_imbalance: "主要スコア軸が割れている",
};

function getBandTrace(run: DecisionRun | undefined): ResultBandTrace | null {
  return run?.output.bandTrace ?? run?.output.diagnosticTrace?.resultInputsSummary?.bandTrace ?? run?.diagnosticTrace?.resultInputsSummary?.bandTrace ?? null;
}

function getBandNarrative(styleMode: StyleMode, decision: DecisionRun["output"]["decision"], bandTrace: ResultBandTrace | null) {
  if (!bandTrace) {
    return {
      summary: "この結果は従来どおり広めの判定帯で表示しています。",
      adviceLead: null,
      blockerText: null,
    };
  }

  const blockerText = bandTrace.bandNarrowingBlockedBy
    .slice(0, 3)
    .map((blocker) => BAND_BLOCKER_LABEL[blocker] ?? blocker)
    .join(" / ");

  if (bandTrace.bandNarrowingApplied) {
    const decisiveByMode: Record<StyleMode, Record<DecisionRun["output"]["decision"], string>> = {
      standard: {
        BUY: "今回は買ってよい寄りです。上限だけ固定して進めて問題ありません。",
        THINK: "今回は保留維持が妥当です。追加購入より先に条件整理を優先してください。",
        SKIP: "今回は見送り寄りで固めてよい状態です。次の候補へ資源を回す判断が合理的です。",
      },
      kawaii: {
        BUY: "今回は買ってよさそう。予算ラインだけ決めて、そのまま進んでOKだよ。",
        THINK: "今回は保留のままで大丈夫。追加で広げる前に条件を整えよう。",
        SKIP: "今回は見送りで固めてOK。次のときめきに残しておこう。",
      },
      oshi: {
        BUY: "今回は回収GO寄り。上限固定だけして安全運転で進めて大丈夫です。",
        THINK: "今回は保留維持が本線。追加回収より先に前提整理を優先しましょう。",
        SKIP: "今回は見送り線で固めてOK。次案件へリソースを回す判断が合理的です。",
      },
    };
    return {
      summary: `入力が揃っているため、判定帯を±${bandTrace.effectiveBandHalfWidth}まで絞っています。`,
      adviceLead: decisiveByMode[styleMode][decision],
      blockerText: null,
    };
  }

  return {
    summary: `今回は判定帯を±${bandTrace.effectiveBandHalfWidth}のまま維持しています。無理に絞っていません。`,
    adviceLead: null,
    blockerText: blockerText || BAND_REASON_LABEL[bandTrace.bandNarrowingReason],
  };
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
  const [providerPlan, setProviderPlan] = useState<{ cards: ProviderCandidate[]; diagnostics: ProviderDiagnostics | null }>({ cards: [], diagnostics: null });
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
  const scenarioCoverage = useMemo(
    () =>
      run
        ? getScenarioCoverageSummary({
            itemKind: run.meta.itemKind,
            goodsClass: run.meta.goodsClass,
            parsedSearchClues: run.meta.parsedSearchClues,
            searchClueRaw: run.meta.searchClueRaw,
            answers: run.answers,
          })
        : null,
    [run],
  );

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
  useEffect(() => {
    let cancelled = false;

    const fetchProviderPlan = async () => {
      if (!run || !rakutenReady) {
        if (!cancelled) setProviderPlan({ cards: [], diagnostics: null });
        return;
      }

      try {
        const response = await fetch("/api/provider-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            runId: run.runId,
            itemKind: run.meta.itemKind,
            goodsClass: run.meta.goodsClass,
            verdict: run.output.decision,
            confidence: run.output.confidence,
            resultTags: run.output.diagnosticTrace?.resultInputsSummary?.tags ?? [],
            mercariRelevant,
            mercariKeyword: mercariKeywordResult.keyword,
            amazonDestination,
            rakutenAffiliateUrl: rakutenItem?.affiliateUrl ?? null,
            surugayaDestination,
            amiamiDestination,
            gamersDestination,
            hmvDestination,
            searchClues: run.meta.parsedSearchClues,
          }),
        });
        if (!response.ok) {
          if (!cancelled) setProviderPlan({ cards: [], diagnostics: null });
          return;
        }
        const payload = (await response.json()) as {
          ok?: boolean;
          cards?: ProviderCandidate[];
          diagnostics?: ProviderDiagnostics | null;
        };
        if (!cancelled) {
          setProviderPlan({
            cards: Array.isArray(payload.cards) ? payload.cards : [],
            diagnostics: payload.diagnostics ?? null,
          });
        }
      } catch {
        if (!cancelled) setProviderPlan({ cards: [], diagnostics: null });
      }
    };

    void fetchProviderPlan();

    return () => {
      cancelled = true;
    };
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
  const bandTrace = getBandTrace(run);
  const normalizedWaitType = outputExt?.waitType ?? (run?.output.decision === "THINK" ? "none" : "none");
  const storageFitValue =
    run && shouldAskStorage(run.meta.itemKind, run.meta.goodsSubtype) && typeof run.answers.q_storage_fit === "string"
      ? STORAGE_FIT_LABEL[run.answers.q_storage_fit] ?? run.answers.q_storage_fit
      : null;

  const baseAdviceText =
    run?.output.decision === "BUY"
      ? MODE_DICTIONARY[styleMode].explanation.buy
      : run?.output.decision === "THINK"
        ? MODE_DICTIONARY[styleMode].explanation.wait[normalizedWaitType] ??
          MODE_DICTIONARY[styleMode].explanation.wait.none
        : MODE_DICTIONARY[styleMode].explanation.skip;
  const bandNarrative = run ? getBandNarrative(styleMode, run.output.decision, bandTrace) : null;
  const adviceText = bandNarrative?.adviceLead ?? baseAdviceText;

  const safeConfidence = clamp(0, 100, Number.isFinite(run?.output.confidence) ? (run?.output.confidence ?? 0) : 0);
  const confidenceSummary = bandTrace?.bandNarrowingApplied
    ? `根拠が揃っているため、判定帯も±${bandTrace.effectiveBandHalfWidth}まで絞っています。`
    : bandTrace
      ? `判定帯は±${bandTrace.effectiveBandHalfWidth}で維持中。${bandNarrative?.blockerText ?? BAND_REASON_LABEL[bandTrace.bandNarrowingReason]}`
      : safeConfidence >= 75
        ? "根拠は比較的そろっています。"
        : safeConfidence >= 55
          ? "いくつか前提つきの結論です。"
          : "不明点が残るため、強い推奨ではありません。";
  const primaryAction = displayActions[0];

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
          {bandTrace ? (
            <Badge variant={bandTrace.bandNarrowingApplied ? "accent" : "outline"}>判定帯 ±{bandTrace.effectiveBandHalfWidth}</Badge>
          ) : null}
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

      <DecisionScale decision={decisionScale} index={decisionIndex} bandHalfWidth={bandTrace?.effectiveBandHalfWidth} />

      <Card className="space-y-3 border border-accent/20 bg-accent/5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={sectionTitleClass}>まず見る結論</h2>
          <Badge variant="accent">main next step</Badge>
        </div>
        <p className="text-base font-semibold text-foreground">
          {primaryAction ? primaryAction.text : adviceText}
        </p>
        <p className="text-sm text-muted-foreground">{confidenceSummary}</p>
        {bandNarrative?.summary ? (
          <p className="text-xs text-muted-foreground">{bandNarrative.summary}</p>
        ) : null}
        {bandTrace && !bandTrace.bandNarrowingApplied && bandNarrative?.blockerText ? (
          <p className="text-xs text-muted-foreground">帯を絞らなかった理由: {bandNarrative.blockerText}</p>
        ) : null}
        {run.output.subtypeReason ? (
          <p className="text-xs text-muted-foreground">補足: {run.output.subtypeReason}</p>
        ) : null}
      </Card>

      <Card className="space-y-3 border-amber-200 bg-amber-50 dark:ring-1 dark:ring-white/10">
        <h2 className="text-lg font-semibold text-amber-900">{modeCopy.ui.adviceTitle}</h2>
        <p className="text-sm text-amber-800">{adviceText}</p>
        {bandTrace ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant={bandTrace.bandNarrowingApplied ? "accent" : "outline"}>{BAND_REASON_LABEL[bandTrace.bandNarrowingReason]}</Badge>
            <Badge variant="outline">critical {bandTrace.answeredCriticalCount}/{bandTrace.totalCriticalQuestions}</Badge>
          </div>
        ) : null}
        <p className="text-xs text-amber-700">
          {modeCopy.result.waitTypeLabel[normalizedWaitType] ?? modeCopy.result.waitTypeLabel.none}
        </p>
      </Card>

      {scenarioCoverage ? (
        <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={sectionTitleClass}>この結果の前提</h2>
            <Badge variant="outline">{getSupportLevelBadgeLabel(scenarioCoverage.supportLevel)}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-2xl border border-border p-4">
              <p className="text-sm font-semibold">判定シナリオ</p>
              <p className="mt-2 text-sm text-slate-900 dark:text-zinc-100">{scenarioCoverage.recommendedEntryLabel}</p>
              <p className="mt-2 text-sm text-muted-foreground">この結果は「{scenarioCoverage.optimizationSummary}」を優先して整理しています。</p>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <p className="text-sm font-semibold">確認しておくと安心な点</p>
              <p className="mt-2 text-sm text-muted-foreground">{scenarioCoverage.shortVerificationHint}</p>
              <p className="mt-2 text-xs text-muted-foreground">{scenarioCoverage.shortScopeDisclosure}</p>
            </div>
          </div>
          <details className="rounded-2xl border border-border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700 marker:text-slate-400 dark:text-zinc-200">
              詳細な守備範囲と provider の前提を見る
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border p-3">
                <p className="text-sm font-semibold">最適化の考え方</p>
                <p className="mt-2 text-sm text-muted-foreground">{scenarioCoverage.resultExplanationHint}</p>
              </div>
              <div className="rounded-2xl border border-border p-3">
                <p className="text-sm font-semibold">provider / 理由の前提</p>
                <p className="mt-2 text-sm text-muted-foreground">{scenarioCoverage.providerEcologyHint}</p>
              </div>
              <div className="rounded-2xl border border-border p-3">
                <p className="text-sm font-semibold">サポート境界</p>
                <p className="mt-2 text-sm text-muted-foreground">{scenarioCoverage.scopeDisclosure}</p>
              </div>
            </div>
          </details>
        </Card>
      ) : null}

      {scenarioCoverage?.key === "exchange_path" && run.output.randomGoodsPlan ? (
        <Card className="space-y-4 border border-cyan-200 bg-cyan-50 text-cyan-950 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={sectionTitleClass}>交換前提として見るポイント</h2>
            <Badge variant="outline">exchange-aware</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold">この結果が見ていること</p>
              <p className="mt-2 text-sm">交換は「追加で引く言い訳」ではなく、いま持っている重複で回収効率を上げられるかを見ています。成立待ち・梱包・連絡コストまで含めて診断しています。</p>
            </div>
            <div className="rounded-2xl border border-cyan-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold">次に確認すること</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>交換候補が本当にいるか</li>
                <li>発送・手渡しの負担を許容できるか</li>
                <li>成立しない時に単品/中古へ切り替えられるか</li>
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      {run.output.venueLimitedGoodsPlan ? (
        <Card className="space-y-4 border border-violet-200 bg-violet-50 text-violet-950 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={sectionTitleClass}>会場限定グッズ / 事後回復の診断</h2>
            <Badge variant="outline">{run.output.venueLimitedGoodsPlan.chosenPath}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-violet-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold">今回の推奨ルート</p>
              <p className="mt-2 text-sm">
                {run.output.venueLimitedGoodsPlan.chosenPath === "buy_live_goods_now_if_it_matches_core_motive"
                  ? "live goods が core motive に刺さり、回復経路も弱めなので今回は今の確保が正当化できる。"
                  : run.output.venueLimitedGoodsPlan.chosenPath === "wait_for_post_event_followup"
                    ? "今は焦って広げず、post-event の follow-up や後日販売の確認を優先。"
                    : run.output.venueLimitedGoodsPlan.chosenPath === "skip_atmosphere_driven_goods_chase"
                      ? "今回の欲しさは event atmosphere 寄りなので、goods chase を広げず一歩引く。"
                      : run.output.venueLimitedGoodsPlan.chosenPath === "buy_now_if_it_is_truly_hard_to_recover"
                  ? "回復経路が本当に弱い時だけ、今の確保を優先してよい。"
                  : run.output.venueLimitedGoodsPlan.chosenPath === "wait_for_post_event_mailorder"
                    ? "今は追い込みすぎず、事後通販や後日販売のシグナル待ちを優先。"
                    : run.output.venueLimitedGoodsPlan.chosenPath === "skip_onsite_chase_and_check_later"
                      ? "現地の追い買いは止めて、あとで再確認してから動く。"
                      : run.output.venueLimitedGoodsPlan.chosenPath === "fallback_to_used_market_if_missed"
                        ? "取り逃し後は panic-buy せず、中古 fallback での回復を前提にする。"
                        : "今の圧は true scarcity より FOMO 寄りなので、一歩引く。"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                最適化対象: {run.output.venueLimitedGoodsPlan.optimizingFor}
              </p>
            </div>
            <div className="rounded-2xl border border-violet-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold">前提がどう効いたか</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>現地文脈: {run.output.venueLimitedGoodsPlan.venueContext}</li>
                <li>回復可能性: {run.output.venueLimitedGoodsPlan.recoveryPlausibility}</li>
                <li>post-event follow-up plausibility: {run.output.venueLimitedGoodsPlan.postEventFollowupPlausibility}</li>
                <li>待てる度合い: {run.output.venueLimitedGoodsPlan.waitTolerance}</li>
                <li>初回機会を逃す耐性: {run.output.venueLimitedGoodsPlan.firstChanceTolerance}</li>
                <li>中古 fallback 意欲: {run.output.venueLimitedGoodsPlan.usedFallbackWillingness}</li>
                <li>scarcity 圧: {run.output.venueLimitedGoodsPlan.scarcityPressure}</li>
                <li>主 motive: {run.output.venueLimitedGoodsPlan.primaryMotive}</li>
                <li>live-goods motive: {run.output.venueLimitedGoodsPlan.liveGoodsMotive}</li>
                <li>後悔軸: {run.output.venueLimitedGoodsPlan.regretAxis}</li>
                <li>scarcity assessment: {run.output.venueLimitedGoodsPlan.scarcityAssessment}</li>
              </ul>
            </div>
          </div>
          <details className="rounded-2xl border border-violet-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
            <summary className="cursor-pointer text-sm font-semibold">理由と診断 trace を見る</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold">なぜこの diagnosis か</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {run.output.venueLimitedGoodsPlan.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold">診断 trace</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {run.output.venueLimitedGoodsPlan.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
                  {run.output.venueLimitedGoodsPlan.clampReason ? <li>clamp理由: {run.output.venueLimitedGoodsPlan.clampReason}</li> : null}
                  <li>回復可能性が結論を変えたか: {run.output.venueLimitedGoodsPlan.recoveryChangedRecommendation ? "はい" : "いいえ"}</li>
                  <li>atmosphere / situational pressure が結論を変えたか: {run.output.venueLimitedGoodsPlan.atmospherePressureChangedRecommendation ? "はい" : "いいえ"}</li>
                  <li>中古 fallback が safer path に入るか: {run.output.venueLimitedGoodsPlan.usedMarketPartOfSaferPath ? "はい" : "いいえ"}</li>
                  <li>true scarcity 寄りか: {run.output.venueLimitedGoodsPlan.trueScarcityLikely ? "はい" : "いいえ"}</li>
                  <li>mixed-media live scenario detected: {run.output.venueLimitedGoodsPlan.mixedMediaLiveScenarioDetected ? "はい" : "いいえ"}</li>
                </ul>
              </div>
            </div>
          </details>
        </Card>
      ) : null}

      {run.output.mediaEditionPlan ? (
        <Card className="space-y-4 border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={sectionTitleClass}>複数版メディアの診断</h2>
            <Badge variant="outline">{run.output.mediaEditionPlan.chosenPath}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-fuchsia-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold">今回の推奨ルート</p>
              <p className="mt-2 text-sm">
                {run.output.mediaEditionPlan.chosenPath === "choose_one_best_store"
                  ? "全店舗 chase はせず、bonus と満足のバランスが最もよい 1店舗に絞る。"
                  : run.output.mediaEditionPlan.chosenPath === "buy_product_but_do_not_chase_all_bonuses"
                    ? "商品本体は買ってよいが、all-bonus 回収までは広げない。"
                  : run.output.mediaEditionPlan.chosenPath === "split_orders_are_not_worth_it"
                      ? "複数店舗 split は bonus 差より送料・管理負担が重いので非推奨。"
                      : run.output.mediaEditionPlan.chosenPath === "split_orders_are_justified"
                        ? "今回は複数店舗 split に筋が通るが、対象店舗は最小限に固定する。"
                        : run.output.mediaEditionPlan.chosenPath === "step_back_from_bonus_pressure"
                          ? "商品価値より store-bonus 比較の圧が前に出ているため、一歩引く。"
                          : run.output.mediaEditionPlan.chosenPath === "buy_standard_only"
                  ? "今回は通常版だけで十分。限定圧で版数を増やさなくてよい。"
                  : run.output.mediaEditionPlan.chosenPath === "buy_limited_only"
                    ? "限定版に意味はあるが、複数版 chase までは広げない。"
                  : run.output.mediaEditionPlan.chosenPath === "buy_one_best_fit_edition"
                      ? "自分の motive に合う 1種だけを選ぶのが最適。"
                      : run.output.mediaEditionPlan.chosenPath === "buy_one_only_and_stop"
                        ? "象徴になる 1点だけで満足線を作り、そこから増やさない。"
                      : run.output.mediaEditionPlan.chosenPath === "buy_selective_subset"
                        ? "全部ではなく、刺さる版・最推し分・必要差分だけを選んで回収する。"
                      : run.output.mediaEditionPlan.chosenPath === "full_set_is_not_worth_it"
                        ? "今回は full set reward より burden が勝ちやすいので、選抜回収へ戻す。"
                      : run.output.mediaEditionPlan.chosenPath === "full_set_is_justified"
                        ? "今回は全版でも筋が通る。ただし motive と予算の整合が前提。"
                      : run.output.mediaEditionPlan.chosenPath === "wait_and_patch_holes_later"
                        ? "初動で抱え込みすぎず、欠けた分だけ後から埋める方が安全。"
                      : run.output.mediaEditionPlan.chosenPath === "use_secondary_market_for_missing_items"
                        ? "新品 chase を広げず、欠けた分だけ慎重に二次流通で補う。"
                      : run.output.mediaEditionPlan.chosenPath === "do_not_force_completion"
                        ? "不安を下げるためだけの全回収はしない。"
                      : run.output.mediaEditionPlan.chosenPath === "step_back_from_completion_pressure"
                        ? "いまは comp anxiety が強いので、一度離れてから必要差分だけ見直す。"
                        : run.output.mediaEditionPlan.chosenPath === "step_back_from_bonus_or_completion_pressure"
                          ? "必要性よりも bonus / comp 圧が前に出ているため、一歩引く。"
                          : "全版 chase は広げすぎ。いったん 1種基準に戻す。"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                最適化対象: {run.output.mediaEditionPlan.optimizingFor}
              </p>
            </div>
            <div className="rounded-2xl border border-fuchsia-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold">前提がどう効いたか</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>character vs cast: {run.output.mediaEditionPlan.characterVsCast}</li>
                <li>one-oshi vs box: {run.output.mediaEditionPlan.oneOshiVsBox}</li>
                <li>single vs set intent: {run.output.mediaEditionPlan.singleVsSetIntent}</li>
                <li>without-full-completion satisfaction: {run.output.mediaEditionPlan.satisfactionWithoutFullCompletion}</li>
                <li>completeness axis: {run.output.mediaEditionPlan.collectionCompleteness}</li>
                <li>budget alignment: {run.output.mediaEditionPlan.budgetAlignment}</li>
                <li>edition ambition: {run.output.mediaEditionPlan.editionAmbition}</li>
                <li>bonus pressure: {run.output.mediaEditionPlan.bonusPressure}</li>
                <li>bonus importance: {run.output.mediaEditionPlan.bonusImportance}</li>
                <li>bonus inflation risk: {run.output.mediaEditionPlan.bonusInflationRisk}</li>
                <li>one-store vs multi-store: {run.output.mediaEditionPlan.storeSplitPreference}</li>
                <li>split-order burden: {run.output.mediaEditionPlan.splitOrderBurden}</li>
                <li>product vs bonus motive: {run.output.mediaEditionPlan.productVsBonusMotive}</li>
                <li>overpay-vs-miss: {run.output.mediaEditionPlan.overpayVsMissPreference}</li>
                <li>recovery preference: {run.output.mediaEditionPlan.recoveryPreference}</li>
                <li>used-market comfort: {run.output.mediaEditionPlan.usedMarketComfort}</li>
                <li>completion pressure type: {run.output.mediaEditionPlan.completionPressureType}</li>
                <li>motive refinement axis: {run.output.mediaEditionPlan.motiveRefinementAxis}</li>
                <li>set reward strength: {run.output.mediaEditionPlan.setRewardStrength}</li>
                <li>member/version preference: {run.output.mediaEditionPlan.memberVersionPreference}</li>
                <li>random-goods addon: {run.output.mediaEditionPlan.randomGoodsStopLineAddonInvoked ? "invoked" : run.output.mediaEditionPlan.randomGoodsAddonIntent}</li>
              </ul>
            </div>
          </div>
          <details className="rounded-2xl border border-fuchsia-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
            <summary className="cursor-pointer text-sm font-semibold">理由と診断 trace を見る</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold">なぜこの diagnosis か</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {run.output.mediaEditionPlan.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold">診断 trace</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {run.output.mediaEditionPlan.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
                  {run.output.mediaEditionPlan.clampReason ? <li>clamp理由: {run.output.mediaEditionPlan.clampReason}</li> : null}
                  <li>selected planner path: {run.output.mediaEditionPlan.chosenPath}</li>
                  <li>store-bonus scenario detected: {run.output.mediaEditionPlan.storeBonusScenarioDetected ? "はい" : "いいえ"}</li>
                  <li>used-market completion scenario detected: {run.output.mediaEditionPlan.usedMarketCompletionScenarioDetected ? "はい" : "いいえ"}</li>
                  <li>secondary-market fallback が結論を変えたか: {run.output.mediaEditionPlan.secondaryMarketFallbackChangedRecommendation ? "はい" : "いいえ"}</li>
                  <li>bonus pressure が結論を変えたか: {run.output.mediaEditionPlan.bonusPressureChangedRecommendation ? "はい" : "いいえ"}</li>
                  <li>split-order burden が結論を変えたか: {run.output.mediaEditionPlan.splitOrderBurdenChangedRecommendation ? "はい" : "いいえ"}</li>
                  <li>random-goods stop-line addon invoked: {run.output.mediaEditionPlan.randomGoodsStopLineAddonInvoked ? "はい" : "いいえ"}</li>
                </ul>
              </div>
            </div>
          </details>
        </Card>
      ) : null}

      {run.output.randomGoodsPlan ? (
        <Card className="space-y-4 border border-sky-200 bg-sky-50 text-sky-950 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={sectionTitleClass}>{run.output.mediaEditionPlan?.randomGoodsStopLineAddonInvoked ? "ランダム特典 / 付随グッズの止めどき診断" : "ランダムグッズの止めどき診断"}</h2>
            <Badge variant="outline">{run.output.randomGoodsPlan.chosenPath}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-sky-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold">今回の推奨ルート</p>
              <p className="mt-2 text-sm">
                {run.output.randomGoodsPlan.chosenPath === "continue_a_little_more"
                  ? "少しだけ続けてもよい。ただしソフトな stop-line を固定。"
                  : run.output.randomGoodsPlan.chosenPath === "switch_to_exchange_path"
                    ? "これ以上は引き足さず、交換成立の見込みと負担を先に整理する。引き足しより『いまある重複で動けるか』を優先。"
                    : run.output.randomGoodsPlan.chosenPath === "stop_drawing_buy_singles"
                      ? "盲抽は止めて、必要分を単品購入に切り替える。"
                      : run.output.randomGoodsPlan.chosenPath === "stop_drawing_check_used_market"
                        ? "盲抽は止めて、まず中古相場・在庫確認へ切り替える。"
                        : run.output.randomGoodsPlan.chosenPath === "step_back_from_completion_pressure"
                          ? "コンプ圧が強すぎるため、一度離れて冷やす。"
                          : "ここで打ち止めにする。"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                最適化対象: {run.output.randomGoodsPlan.stopLineOptimizingFor}
              </p>
              {run.output.randomGoodsPlan.chosenPath === "switch_to_exchange_path" ? (
                <p className="mt-2 text-xs text-cyan-700 dark:text-cyan-300">交換成立を前提に寄せています。負担が想定より重いなら、追加購入ではなく単品/中古 fallback を優先してください。</p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-sky-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold">前提がどう効いたか</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>ターゲット: {run.output.randomGoodsPlan.targetStyle}</li>
                <li>被り許容: {run.output.randomGoodsPlan.duplicateTolerance}</li>
                <li>交換意欲: {run.output.randomGoodsPlan.exchangeWillingness}</li>
                <li>交換負担: {run.output.randomGoodsPlan.exchangeFriction}</li>
                <li>単品/中古 fallback: {run.output.randomGoodsPlan.singlesFallback}</li>
                <li>停止予算ライン: {run.output.randomGoodsPlan.stopBudget}</li>
              </ul>
            </div>
          </div>
          <details className="rounded-2xl border border-sky-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
            <summary className="cursor-pointer text-sm font-semibold">理由と診断 trace を見る</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold">なぜこの stop-line か</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {run.output.randomGoodsPlan.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold">前提メモ / 診断 trace</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {run.output.randomGoodsPlan.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
                  {run.output.randomGoodsPlan.clampReason ? <li>clamp理由: {run.output.randomGoodsPlan.clampReason}</li> : null}
                  <li>exchange前提が結論を変えたか: {run.output.randomGoodsPlan.exchangeAssumptionChangedRecommendation ? "はい" : "いいえ"}</li>
                  <li>単品/中古 completion が合理的か: {run.output.randomGoodsPlan.usedMarketRecommended ? "はい" : "状況次第"}</li>
                </ul>
              </div>
            </div>
          </details>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>次の一歩と補助アクション</h2>
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

      <ProviderComparisonModule
        cards={providerPlan.cards}
        scenarioKey={scenarioCoverage?.key ?? null}
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
