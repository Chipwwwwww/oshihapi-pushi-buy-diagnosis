"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DecisionScale from "@/components/DecisionScale";
import { merch_v2_ja } from "@/src/oshihapi/merch_v2_ja";
import { buildLongPrompt } from "@/src/oshihapi/promptBuilder";
import type { DecisionRun, FeedbackImmediate } from "@/src/oshihapi/model";
import { clamp, engineConfig, normalize01ToSigned } from "@/src/oshihapi/engineConfig";
import { findRun, updateRun } from "@/src/oshihapi/runStorage";
import {
  sendTelemetry,
  TELEMETRY_OPT_IN_KEY,
} from "@/src/oshihapi/telemetryClient";

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

const TELEMETRY_INCLUDE_PRICE_KEY = "oshihapi_telemetry_include_price";
const TELEMETRY_INCLUDE_ITEM_NAME_KEY = "oshihapi_telemetry_include_item_name";

export default function ResultPage() {
  const router = useRouter();
  const params = useParams<{ runId: string }>();
  const [toast, setToast] = useState<string | null>(null);
  const [telemetryOptIn, setTelemetryOptIn] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(TELEMETRY_OPT_IN_KEY) === "true";
  });
  const [includePrice, setIncludePrice] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(TELEMETRY_INCLUDE_PRICE_KEY) === "true";
  });
  const [includeItemName, setIncludeItemName] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(TELEMETRY_INCLUDE_ITEM_NAME_KEY) === "true";
  });

  const runId = params?.runId;
  const run = useMemo<DecisionRun | undefined>(() => {
    if (!runId) return undefined;
    return findRun(runId);
  }, [runId]);

  const [feedbackOverride, setFeedbackOverride] = useState<FeedbackImmediate | undefined>(
    undefined,
  );
  const feedback = feedbackOverride ?? run?.feedback_immediate;

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
      showToast("共有テキストをコピーしました");
    } catch {
      showToast("コピーに失敗しました");
    }
  };

  const handleCopyPrompt = async () => {
    if (!longPrompt) return;
    try {
      await navigator.clipboard.writeText(longPrompt);
      logActionClick("copy_long_prompt");
      showToast("AI相談用プロンプトをコピーしました");
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
    setFeedbackOverride(nextRun?.feedback_immediate ?? value);
    if (telemetryOptIn) {
      void sendTelemetry("l1_feedback", run, {
        label: value,
        includePrice,
        includeItemName,
      });
    }
  };

  if (!run) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-10">
        <p className="text-sm text-zinc-500">
          結果が見つかりませんでした。ホームからもう一度お試しください。
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white"
          >
            Homeへ戻る
          </button>
          <button
            type="button"
            onClick={() => router.push("/history")}
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-semibold text-zinc-600"
          >
            履歴を見る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-pink-600">診断結果</p>
        <h1 className="text-3xl font-bold text-zinc-900">
          {decisionLabels[run.output.decision]}
        </h1>
        <p className="text-sm text-zinc-500">{decisionSubcopy[run.output.decision]}</p>
      </header>

      <DecisionScale decision={decisionScale} index={decisionIndex} />

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-800">今すぐやる</h2>
        <ul className="mt-4 grid gap-3 text-sm text-zinc-600">
          {run.output.actions.map((action) => (
            <li key={action.id} className="rounded-xl border border-zinc-200 p-4">
              <p className="text-sm text-zinc-700">{action.text}</p>
              {action.linkOut ? (
                <a
                  href={action.linkOut.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => logActionClick(`link:${action.id}`)}
                  className="mt-3 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  {action.linkOut.label}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-800">理由</h2>
        <div className="mt-4 grid gap-3">
          {run.output.reasons.map((reason) => (
            <div key={reason.id} className="rounded-xl border border-zinc-200 p-4">
              <p className="text-sm text-zinc-700">{reason.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-emerald-900">
            AIに相談する（プロンプトをコピー）
          </h2>
          <p className="text-sm text-emerald-700">
            {run.mode === "long"
              ? "長診断の内容をまとめたプロンプトです。"
              : "もっと深掘りしたいときに使えます。"}
          </p>
        </div>
        <textarea
          readOnly
          value={longPrompt}
          className="mt-4 min-h-[180px] w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs text-emerald-900"
        />
        <button
          type="button"
          onClick={handleCopyPrompt}
          className="mt-4 inline-flex rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white"
        >
          プロンプトをコピー
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-800">共有テキスト</h2>
        <p className="mt-3 whitespace-pre-line text-sm text-zinc-600">
          {run.output.shareText}
        </p>
        <button
          type="button"
          onClick={handleCopyShare}
          className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white"
        >
          共有テキストをコピー
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-800">
          学習のために匿名データを送信
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          個人が特定される情報は送信されません。いつでも送信内容を選べます。
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          チェックしない場合、価格・商品名は送信されません。
        </p>
        <div className="mt-4 flex flex-col gap-3 text-sm text-zinc-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includePrice}
              onChange={(event) => {
                const next = event.target.checked;
                setIncludePrice(next);
                window.localStorage.setItem(TELEMETRY_INCLUDE_PRICE_KEY, String(next));
              }}
              className="h-4 w-4 rounded border-zinc-300 text-pink-600"
            />
            価格を送る（任意）
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeItemName}
              onChange={(event) => {
                const next = event.target.checked;
                setIncludeItemName(next);
                window.localStorage.setItem(TELEMETRY_INCLUDE_ITEM_NAME_KEY, String(next));
              }}
              className="h-4 w-4 rounded border-zinc-300 text-pink-600"
            />
            商品名を送る（任意）
          </label>
        </div>
        <button
          type="button"
          onClick={async () => {
            const ok = await sendTelemetry("run_export", run, {
              includePrice,
              includeItemName,
            });
            if (ok) {
              window.localStorage.setItem(TELEMETRY_OPT_IN_KEY, "true");
              setTelemetryOptIn(true);
              showToast("匿名データを送信しました");
            } else {
              showToast("送信に失敗しました");
            }
          }}
          className="mt-4 inline-flex rounded-full bg-pink-600 px-5 py-2 text-sm font-semibold text-white"
        >
          匿名データを送信する
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-800">
          このあとどうした？
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { id: "bought", label: "買った" },
            { id: "waited", label: "保留した" },
            { id: "not_bought", label: "買わなかった" },
            { id: "unknown", label: "まだ" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleFeedback(option.id as FeedbackImmediate)}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                feedback === option.id
                  ? "border-pink-500 bg-pink-50 text-pink-700"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-pink-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 md:flex-row">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-600"
        >
          もう一度診断
        </button>
        <button
          type="button"
          onClick={() => router.push("/history")}
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
        >
          履歴を見る
        </button>
      </section>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-full bg-zinc-900 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
