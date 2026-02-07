"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AnswerValue,
  DecisionRun,
  InputMeta,
  ItemKind,
  Mode,
  Question,
} from "@/src/oshihapi/model";
import { merch_v2_ja } from "@/src/oshihapi/merch_v2_ja";
import { evaluate } from "@/src/oshihapi/engine";
import { saveRun } from "@/src/oshihapi/runStorage";

const MODE_FALLBACK: Mode = "normal";
const DEADLINE_VALUES = [
  "today",
  "tomorrow",
  "in3days",
  "in1week",
  "unknown",
] as const;
const ITEM_KIND_VALUES = [
  "goods",
  "blind_draw",
  "used",
  "preorder",
  "ticket",
] as const;

type DeadlineValue = NonNullable<InputMeta["deadline"]>;

const isDeadlineValue = (value: string): value is DeadlineValue =>
  DEADLINE_VALUES.includes(value as DeadlineValue);

const isItemKindValue = (value: string): value is ItemKind =>
  ITEM_KIND_VALUES.includes(value as ItemKind);

const parseMode = (value: string | null): Mode =>
  value === "urgent" || value === "normal" ? value : MODE_FALLBACK;

const parsePriceYen = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseDeadline = (value: string | null): InputMeta["deadline"] => {
  if (!value) return undefined;
  return isDeadlineValue(value) ? value : "unknown";
};

const parseItemKind = (value: string | null): InputMeta["itemKind"] => {
  if (!value) return undefined;
  return isItemKindValue(value) ? value : "goods";
};

const decisionLabels: Record<string, string> = {
  BUY: "買う",
  THINK: "保留",
  SKIP: "やめる",
};

export default function FlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = parseMode(searchParams.get("mode"));
  const itemName = searchParams.get("itemName") ?? undefined;
  const priceYen = parsePriceYen(searchParams.get("priceYen"));
  const deadline = parseDeadline(searchParams.get("deadline"));
  const itemKind = parseItemKind(searchParams.get("itemKind"));

  const questions = useMemo(() => {
    if (mode === "urgent") {
      return merch_v2_ja.questions.filter((q) => q.urgentCore);
    }
    return merch_v2_ja.questions.filter((q) => q.required);
  }, [mode]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];

  const normalizedAnswers = useMemo(() => {
    const next = { ...answers };
    for (const question of questions) {
      if (question.type !== "scale") continue;
      const value = next[question.id];
      if (typeof value === "number") continue;
      const fallback = question.defaultValue ?? question.min;
      if (fallback !== undefined) {
        next[question.id] = fallback;
      }
    }
    return next;
  }, [answers, questions]);

  const isAnswered = (question: Question | undefined) => {
    if (!question) return false;
    const value = answers[question.id];
    if (question.type === "scale" || question.type === "number") {
      if (question.type === "scale" && typeof value !== "number") {
        const fallback = question.defaultValue ?? question.min;
        return fallback !== undefined;
      }
      return value !== undefined && value !== null && value !== "";
    }
    return value != null;
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    const runId = crypto.randomUUID();
    const output = evaluate({
      questionSet: { ...merch_v2_ja, questions },
      meta: { itemName, priceYen, deadline, itemKind },
      answers: normalizedAnswers,
    });

    const run: DecisionRun = {
      runId,
      createdAt: Date.now(),
      locale: "ja",
      category: "merch",
      mode,
      meta: { itemName, priceYen, deadline, itemKind },
      answers: normalizedAnswers,
      output,
    };

    setSubmitting(true);
    saveRun(run);
    router.push(`/result/${runId}`);
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      router.push("/");
    } else {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-10">
        <p className="text-sm text-zinc-500">質問が見つかりませんでした。</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Homeへ戻る
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-pink-600">質問フロー</p>
        <h1 className="text-2xl font-bold text-zinc-900">
          {mode === "urgent" ? "急いで診断" : "じっくり診断"}
        </h1>
        <p className="text-xs text-zinc-500">
          {currentIndex + 1}/{questions.length}
        </p>
        <div className="mt-2 h-2 w-full rounded-full bg-zinc-200">
          <div
            className="h-2 rounded-full bg-pink-500 transition-all"
            style={{
              width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%`,
            }}
          />
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            {currentQuestion.title}
          </h2>
          {currentQuestion.description ? (
            <p className="text-sm text-zinc-500">{currentQuestion.description}</p>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          {currentQuestion.type === "scale" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{currentQuestion.leftLabel ?? "低い"}</span>
                <span>{currentQuestion.rightLabel ?? "高い"}</span>
              </div>
              <input
                type="range"
                min={currentQuestion.min ?? 0}
                max={currentQuestion.max ?? 5}
                step={currentQuestion.step ?? 1}
                value={
                  (typeof normalizedAnswers[currentQuestion.id] === "number"
                    ? normalizedAnswers[currentQuestion.id]
                    : currentQuestion.defaultValue ?? currentQuestion.min ?? 0) as number
                }
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: Number(event.target.value),
                  }))
                }
                className="w-full accent-pink-500"
              />
              <p className="text-sm text-zinc-600">
                選択値: {answers[currentQuestion.id]}
              </p>
            </div>
          ) : null}

          {currentQuestion.type === "single" && currentQuestion.options ? (
            <div className="grid gap-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option.id }))
                  }
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    answers[currentQuestion.id] === option.id
                      ? "border-pink-500 bg-pink-50 text-pink-700"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-pink-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-600"
        >
          戻る
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!isAnswered(currentQuestion) || submitting}
          className="rounded-full bg-zinc-900 px-8 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {currentIndex === questions.length - 1 ? "結果を見る" : "次へ"}
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 text-xs text-zinc-500">
        <p>判断の表示例：{decisionLabels.BUY} / {decisionLabels.THINK} / {decisionLabels.SKIP}</p>
      </section>
    </div>
  );
}
