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
import { decisivenessLabels } from "@/src/oshihapi/decisiveness";
import { buildPresentation } from "@/src/oshihapi/decisionPresentation";
import { clamp, engineConfig, normalize01ToSigned } from "@/src/oshihapi/engineConfig";
import {
  isPlatformMarketAction,
  neutralizeMarketAction,
} from "@/src/oshihapi/neutralizePlatformActions";
import { findRun, updateRun } from "@/src/oshihapi/runStorage";
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

const decisionLabels: Record<string, string> = {
  BUY: "買う",
  THINK: "保留",
  SKIP: "やめる",
};


function getDefaultSearchWord(run: DecisionRun): string {
  const itemName = run.meta.itemName?.trim();
  if (itemName) return itemName;

  if (run.useCase === "game_billing") {
    const billingType = typeof run.gameBillingAnswers?.gb_q2_type === "string"
      ? run.gameBillingAnswers.gb_q2_type
      : "";
    return [itemName, billingType].filter(Boolean).join(" ").trim();
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
  const [selectedHeadline, setSelectedHeadline] = useState<string | null>(null);
  const [styleMode, setStyleMode] = useState<StyleMode>(() => getStyleModeFromSearchParams(searchParams) ?? "standard");

  const runId = params?.runId;
  const run = useMemo<DecisionRun | undefined>(() => {
    if (!runId) return undefined;
    return findRun(runId);
  }, [runId]);

  const feedback = localFeedback ?? run?.feedback_immediate;

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
    setShowAlternatives(false);
    setSelectedHeadline(null);
  }, [runId]);

  const headline = selectedHeadline ?? presentation?.headline ?? decisionLabels[run?.output.decision ?? "THINK"];
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
          <Badge variant="primary">信頼度 {run.output.confidence}%</Badge>
          {presentation?.badge && !presentation.badge.includes("判定") ? (
            <Badge variant="outline">{presentation.badge}</Badge>
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
                      onClick={() => setSelectedHeadline(alt)}
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
          {displayActions.map((action) => {
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
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>{modeCopy.ui.reasonsTitle}</h2>
        <div className="grid gap-4">
          {run.output.reasons.map((reason) => (
            <div key={reason.id} className="rounded-2xl border border-border p-4">
              <p className={bodyTextClass}>{modeCopy.result.reasonTagLabel[reason.id] ?? reason.text}</p>
            </div>
          ))}
        </div>
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

      <div id="market-check" style={{ scrollMarginTop: "96px" }}>
        <MarketCheckCard
          runId={run.runId}
          defaultSearchWord={defaultSearchWord}
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
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="w-full rounded-xl"
        >
          もう一度診断
        </Button>
        <Button onClick={() => router.push("/history")} className="w-full rounded-xl">
          履歴を見る
        </Button>
      </div>

      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}
