"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { DecisionRun } from "@/src/oshihapi/model";
import { findRun } from "@/src/oshihapi/runStorage";

const decisionLabels: Record<string, string> = {
  BUY: "買う",
  THINK: "保留",
  SKIP: "やめる",
};

export default function ResultPage() {
  const router = useRouter();
  const params = useParams<{ runId: string }>();
  const [run, setRun] = useState<DecisionRun | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!params?.runId) return;
    const found = findRun(params.runId);
    setRun(found ?? null);
  }, [params?.runId]);

  const handleCopy = async () => {
    if (!run) return;
    try {
      await navigator.clipboard.writeText(run.output.shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (!run) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-10">
        <p className="text-sm text-zinc-500">結果が見つかりませんでした。</p>
        <button
          type="button"
          onClick={() => router.push("/history")}
          className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white"
        >
          履歴を見る
        </button>
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
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-600">
          {run.output.actions.map((action) => (
            <li key={action.id}>{action.text}</li>
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
          {copied ? "コピーしました" : "共有テキストをコピー"}
        </button>
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
    </div>
  );
}
