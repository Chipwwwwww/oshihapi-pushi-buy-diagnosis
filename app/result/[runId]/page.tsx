"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { DecisionRun, FeedbackImmediate } from "@/src/oshihapi/model";
import { findRun, updateRun } from "@/src/oshihapi/runStorage";

const decisionLabels: Record<string, string> = {
  BUY: "買う",
  THINK: "保留",
  SKIP: "やめる",
};

export default function ResultPage() {
  const router = useRouter();
  const params = useParams<{ runId: string }>();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackImmediate | undefined>(undefined);

  const runId = params?.runId;
  const run = useMemo<DecisionRun | undefined>(() => {
    if (!runId) return undefined;
    return findRun(runId);
  }, [runId]);

  useEffect(() => {
    setFeedback(run?.feedback_immediate);
  }, [run]);

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

  const handleCopy = async () => {
    if (!run) return;
    try {
      await navigator.clipboard.writeText(run.output.shareText);
      setCopied(true);
      logActionClick("copy_share_text");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleFeedback = (value: FeedbackImmediate) => {
    if (!runId) return;
    const nextRun = updateRun(runId, (current) => ({
      ...current,
      feedback_immediate: value,
    }));
    setFeedback(nextRun?.feedback_immediate ?? value);
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
        <p className="text-sm text-zinc-500">
          信頼度: {run.output.confidence}%
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-800">理由</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-600">
          {run.output.reasons.map((reason) => (
            <li key={reason.id}>{reason.text}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-800">次のアクション</h2>
        <ul className="mt-3 space-y-3 text-sm text-zinc-600">
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
        <h2 className="text-base font-semibold text-zinc-800">買い方メモ</h2>
        <p className="mt-3 text-sm text-zinc-600">{run.output.merchMethod.note}</p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-800">共有テキスト</h2>
        <p className="mt-3 whitespace-pre-line text-sm text-zinc-600">
          {run.output.shareText}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white"
        >
          共有テキストをコピー
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-800">
          このあとどうした？
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { id: "bought", label: "買った" },
            { id: "hold", label: "保留" },
            { id: "not_bought", label: "買わなかった" },
            { id: "not_yet", label: "まだ" },
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

      {copied ? (
        <div className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-full bg-zinc-900 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg">
          コピーしました
        </div>
      ) : null}
    </div>
  );
}
