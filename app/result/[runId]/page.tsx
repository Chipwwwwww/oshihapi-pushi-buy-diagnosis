"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DecisionScale from "@/components/DecisionScale";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import RadioCard from "@/components/ui/RadioCard";
import Toast from "@/components/ui/Toast";
import {
  bodyTextClass,
  containerClass,
  helperTextClass,
  pageTitleClass,
  sectionTitleClass,
} from "@/components/ui/tokens";
import { merch_v2_ja } from "@/src/oshihapi/merch_v2_ja";
import { buildLongPrompt } from "@/src/oshihapi/promptBuilder";
import type { DecisionRun, FeedbackImmediate } from "@/src/oshihapi/model";
import { buildPresentation } from "@/src/oshihapi/decisionPresentation";
import { clamp, engineConfig, normalize01ToSigned } from "@/src/oshihapi/engineConfig";
import { findRun, updateRun } from "@/src/oshihapi/runStorage";
import { sendTelemetry, TELEMETRY_OPT_IN_KEY } from "@/src/oshihapi/telemetryClient";

const decisionLabels: Record<string, string> = {
  BUY: "買う",
  THINK: "保留",
  SKIP: "やめる",
};

const decisionSubcopy: Record<string, string> = {
  BUY: "今の条件ならOK。上限だけ決めて進もう。",
  THINK: "今は保留でOK。条件が整ったらまた検討しよう。",
  SKIP: "今回は見送りでOK。次の推し活に回そう。",
};

export default function ResultPage() {
  const router = useRouter();
  const params = useParams<{ runId: string }>();
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

  const runId = params?.runId;
  const run = useMemo<DecisionRun | undefined>(() => {
    if (!runId) return undefined;
    return findRun(runId);
  }, [runId]);

  const feedback = localFeedback ?? run?.feedback_immediate;

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

  useEffect(() => {
    setShowAlternatives(false);
    setSelectedHeadline(null);
  }, [runId]);

  const headline = selectedHeadline ?? presentation?.headline ?? decisionLabels[run?.output.decision ?? "THINK"];
  const alternatives = presentation?.alternatives ?? [];

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
    if (!run) return;
    try {
      await navigator.clipboard.writeText(run.output.shareText);
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
      <header className="space-y-4">
        <p className="text-sm font-semibold text-accent">診断結果</p>
        <div className="space-y-2">
          <h1 className={pageTitleClass}>{headline}</h1>
          <p className={bodyTextClass}>{decisionSubcopy[run.output.decision]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">信頼度 {run.output.confidence}%</Badge>
          <Badge variant="outline">{presentation?.badge ?? `判定：${decisionLabels[run.output.decision]}`}</Badge>
        </div>
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

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>今すぐやる</h2>
        <ul className="grid gap-4">
          {run.output.actions.map((action) => (
            <li key={action.id} className="rounded-2xl border border-border p-4">
              <p className={bodyTextClass}>{action.text}</p>
              {action.linkOut ? (
                <Button
                  onClick={() => logActionClick(`link:${action.id}`)}
                  className="mt-4 w-full rounded-xl"
                >
                  {action.linkOut.label}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>理由</h2>
        <div className="grid gap-4">
          {run.output.reasons.map((reason) => (
            <div key={reason.id} className="rounded-2xl border border-border p-4">
              <p className={bodyTextClass}>{reason.text}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 border-emerald-200 bg-emerald-50">
        <div className="space-y-2">
          <h2 className={sectionTitleClass}>AIに相談する（プロンプト）</h2>
          <p className="text-sm text-emerald-700">
            {run.mode === "long"
              ? "長診断の内容をまとめたプロンプトです。"
              : "もっと深掘りしたいときに使えます。"}
          </p>
        </div>
        <textarea
          readOnly
          value={longPrompt}
          className="min-h-[180px] w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900"
        />
        <Button
          onClick={handleCopyPrompt}
          className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
        >
          プロンプトをコピー
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className={sectionTitleClass}>共有テキスト</h2>
        <p className="whitespace-pre-line text-sm text-muted-foreground">
          {run.output.shareText}
        </p>
        <Button onClick={handleCopyShare} className="w-full rounded-xl">
          共有テキストをコピー
        </Button>
      </Card>

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
