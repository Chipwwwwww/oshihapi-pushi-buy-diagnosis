"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AnswerValue,
  BehaviorLog,
  DecisionRun,
  Decisiveness,
  InputMeta,
  ItemKind,
  Mode,
  Question,
} from "@/src/oshihapi/model";
import { merch_v2_ja } from "@/src/oshihapi/merch_v2_ja";
import { evaluate } from "@/src/oshihapi/engine";
import { evaluateGameBillingV1, getGameBillingQuestions } from "@/src/oshihapi/gameBillingNeutralV1";
import { saveRun } from "@/src/oshihapi/runStorage";
import { COPY_BY_MODE } from "@/src/oshihapi/modes/copy_dictionary";
import {
  getStyleModeFromSearchParams,
  setStyleModeToLocalStorage,
  type StyleMode,
} from "@/src/oshihapi/modes/useStyleMode";
import { MODE_DICTIONARY } from "@/src/oshihapi/modes/mode_dictionary";
import { parseDecisiveness } from "@/src/oshihapi/decisiveness";
import { MODE_META, normalizeMode } from "@/src/oshihapi/modeConfig";
import { shouldAskStorage } from "@/src/oshihapi/storageGate";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Progress from "@/components/ui/Progress";
import RadioCard from "@/components/ui/RadioCard";
import {
  containerClass,
  helperTextClass,
  inputBaseClass,
  pageTitleClass,
  sectionTitleClass,
} from "@/components/ui/tokens";

const DEADLINE_VALUES = [
  "today",
  "tomorrow",
  "in3days",
  "in1week",
  "unknown",
] as const;
const ITEM_KIND_VALUES: ItemKind[] = [
  "goods",
  "blind_draw",
  "used",
  "preorder",
  "ticket",
  "game_billing",
];

type DeadlineValue = NonNullable<InputMeta["deadline"]>;

const isDeadlineValue = (value: string): value is DeadlineValue =>
  DEADLINE_VALUES.includes(value as DeadlineValue);

const isItemKindValue = (value: string): value is ItemKind =>
  ITEM_KIND_VALUES.includes(value as ItemKind);

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

const QUICK_QUESTION_IDS = [
  "q_storage_fit",
  "q_desire",
  "q_budget_pain",
  "q_urgency",
  "q_rarity_restock",
  "q_regret_impulse",
  "q_impulse_axis_short",
] as const;

const CORE_12_QUESTION_IDS = [
  "q_storage_fit",
  "q_desire",
  "q_budget_pain",
  "q_urgency",
  "q_rarity_restock",
  "q_goal",
  "q_motives_multi",
  "q_hot_cold",
  "q_regret_impulse",
  "q_impulse_axis_short",
  "q_price_feel",
  "q_storage_space",
  "q_alternative_plan",
] as const;

const ADDON_BY_ITEM_KIND: Partial<Record<ItemKind, readonly string[]>> = {
  goods: ["q_addon_common_info", "q_addon_common_priority", "q_addon_goods_compare", "q_addon_goods_portability"],
  blind_draw: ["q_addon_common_info", "q_addon_common_priority", "q_addon_blind_draw_cap", "q_addon_blind_draw_exit"],
  ticket: ["q_addon_common_info", "q_addon_common_priority", "q_addon_ticket_schedule", "q_addon_ticket_resale_rule"],
  preorder: ["q_addon_common_info", "q_addon_common_priority", "q_addon_preorder_timeline", "q_addon_preorder_restock"],
  used: ["q_addon_common_info", "q_addon_common_priority", "q_addon_used_condition", "q_addon_used_price_gap"],
};

export default function FlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode: Mode = normalizeMode(searchParams.get("mode"));
  const itemName = searchParams.get("itemName") ?? undefined;
  const priceYen = parsePriceYen(searchParams.get("priceYen"));
  const deadline = parseDeadline(searchParams.get("deadline"));
  const itemKind = parseItemKind(searchParams.get("itemKind"));
  const decisiveness: Decisiveness = parseDecisiveness(searchParams.get("decisiveness"));
  const styleMode: StyleMode = getStyleModeFromSearchParams(searchParams) ?? "standard";

  const useCase = itemKind === "game_billing" ? "game_billing" : "merch";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  const questions = useMemo(() => {
    if (useCase === "game_billing") {
      return getGameBillingQuestions(mode, answers);
    }

    const baseIds = mode === "short" ? QUICK_QUESTION_IDS : CORE_12_QUESTION_IDS;
    const addonIds = mode === "long" && itemKind ? (ADDON_BY_ITEM_KIND[itemKind] ?? []) : [];
    const ids = [...baseIds, ...addonIds].filter((id) => {
      if (id !== "q_storage_fit") return true;
      return shouldAskStorage(itemKind);
    });
    return ids
      .map((id) => merch_v2_ja.questions.find((question) => question.id === id))
      .filter((question): question is Question => Boolean(question));
  }, [answers, itemKind, mode, useCase]);

  const [submitting, setSubmitting] = useState(false);
  const startTimeRef = useRef<number>(0);
  const questionStartRef = useRef<number>(0);
  const timePerQuestionRef = useRef<number[]>([]);
  const numChangesRef = useRef(0);
  const numBacktracksRef = useRef(0);

  const currentQuestion = questions[currentIndex];
  const currentQuestionCopy = currentQuestion
    ? COPY_BY_MODE[styleMode].questions[currentQuestion.id]
    : undefined;
  const currentTitle = currentQuestionCopy?.title ?? currentQuestion?.title ?? "";
  const currentHelper = currentQuestionCopy?.helper ?? currentQuestion?.description;

  const getOptionLabel = (questionId: string, optionId: string, fallback: string) =>
    COPY_BY_MODE[styleMode].questions[questionId]?.options?.[optionId] ?? fallback;

  const handleStyleModeChange = (nextMode: StyleMode) => {
    setStyleModeToLocalStorage(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("styleMode", nextMode);
    router.replace(`/flow?${params.toString()}`);
  };

  useEffect(() => {
    startTimeRef.current = Date.now();
    questionStartRef.current = Date.now();
    timePerQuestionRef.current = Array.from({ length: questions.length }, () => 0);
    numChangesRef.current = 0;
    numBacktracksRef.current = 0;
  }, [questions.length]);

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
    if (!question.required) return true;
    const value = answers[question.id];
    if (question.type === "scale" || question.type === "number") {
      if (question.type === "scale" && typeof value !== "number") {
        const fallback = question.defaultValue ?? question.min;
        return fallback !== undefined;
      }
      return value !== undefined && value !== null && value !== "";
    }
    if (question.type === "text") {
      return typeof value === "string" && value.trim().length > 0;
    }
    if (question.type === "multi") {
      return Array.isArray(value) && value.length > 0;
    }
    return value != null;
  };

  const recordQuestionTime = (index: number) => {
    const elapsed = Date.now() - questionStartRef.current;
    if (elapsed < 0) return;
    const bucket = timePerQuestionRef.current[index] ?? 0;
    timePerQuestionRef.current[index] = bucket + elapsed;
    questionStartRef.current = Date.now();
  };

  const updateAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => {
      const prevValue = prev[questionId];
      const isSame =
        Array.isArray(prevValue) && Array.isArray(value)
          ? prevValue.length === value.length &&
            prevValue.every((entry, idx) => entry === value[idx])
          : prevValue === value;
      if (prevValue !== undefined && !isSame) {
        numChangesRef.current += 1;
      }
      return { ...prev, [questionId]: value };
    });
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    if (currentIndex < questions.length - 1) {
      recordQuestionTime(currentIndex);
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    recordQuestionTime(currentIndex);
    const runId = crypto.randomUUID();
    const output =
      useCase === "game_billing"
        ? (() => {
            const gameOutput = evaluateGameBillingV1(normalizedAnswers);
            const decisionLabel: "買う" | "保留" | "やめる" =
              gameOutput.decision === "BUY"
                ? "買う"
                : gameOutput.decision === "SKIP"
                  ? "やめる"
                  : "保留";

            return {
              decision: gameOutput.decision,
              confidence: 70,
              score: Math.max(-1, Math.min(1, gameOutput.score / 12)),
              scoreSummary: {
                desire: 50,
                affordability: 50,
                urgency: 50,
                rarity: 50,
                restockChance: 50,
                regretRisk: 50,
                impulse: 50,
                opportunityCost: 50,
              },
              reasons: gameOutput.reasons.map((text, index) => ({ id: `gb_reason_${index + 1}`, text })),
              actions: gameOutput.nextActions.map((text, index) => ({ id: `gb_action_${index + 1}`, text })),
              merchMethod: {
                method: "PASS" as const,
                note: "ゲーム課金（中立）v1",
              },
              shareText: [
                `判定: ${decisionLabels[gameOutput.decision]}`,
                ...gameOutput.reasons,
              ].join("\n"),
              presentation: {
                decisionLabel,
                headline:
                  gameOutput.decision === "BUY"
                    ? "条件がそろっているので進められそう"
                    : gameOutput.decision === "SKIP"
                      ? "今回は見送っても大丈夫"
                      : "いったん保留で様子を見るのが安心",
                badge: `判定：${decisionLabels[gameOutput.decision]}`,
                note: "※判定は変わりません",
                tags: ["GAME_BILLING"],
              },
            };
          })()
        : evaluate({
            questionSet: { ...merch_v2_ja, questions },
            meta: { itemName, priceYen, deadline, itemKind },
            answers: normalizedAnswers,
            mode,
            decisiveness,
          });

    const behavior: BehaviorLog = {
      time_total_ms: Date.now() - startTimeRef.current,
      time_per_q_ms: timePerQuestionRef.current,
      num_changes: numChangesRef.current,
      num_backtracks: numBacktracksRef.current,
      actions_clicked: [],
    };

    const run: DecisionRun = {
      runId,
      createdAt: Date.now(),
      locale: "ja",
      category: "merch",
      useCase,
      mode,
      decisiveness,
      meta: { itemName, priceYen, deadline, itemKind },
      answers: normalizedAnswers,
      gameBillingAnswers: useCase === "game_billing" ? normalizedAnswers : undefined,
      output,
      behavior,
    };

    setSubmitting(true);
    saveRun(run);
    router.push(`/result/${runId}?styleMode=${styleMode}`);
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      router.push("/");
    } else {
      recordQuestionTime(currentIndex);
      numBacktracksRef.current += 1;
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!currentQuestion) {
    return (
      <div className={`${containerClass} flex min-h-screen flex-col items-center justify-center gap-4 py-10`}>
        <p className={helperTextClass}>質問が見つかりませんでした。</p>
        <Button onClick={() => router.push("/")} className="w-full">
          Homeへ戻る
        </Button>
      </div>
    );
  }

  return (
    <div className={`${containerClass} flex min-h-screen flex-col gap-6 py-10 pb-24`}>
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} className="px-3">
            戻る
          </Button>
          <p className={helperTextClass}>
            {currentIndex + 1}/{questions.length}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-accent">質問フロー</p>
          <h1 className={pageTitleClass}>
            {MODE_META[mode].flowTitle}
          </h1>
        </div>
        <Progress value={currentIndex + 1} max={questions.length} />
      </header>

      <Card className="space-y-4">
        <div className="space-y-2">
          <h2 className={sectionTitleClass}>{currentTitle}</h2>
          {currentHelper ? (
            <p className={helperTextClass}>{currentHelper}</p>
          ) : null}
        </div>

        <div className="space-y-4">
          {currentQuestion.type === "scale" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
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
                  updateAnswer(currentQuestion.id, Number(event.target.value))
                }
                className="w-full accent-primary"
              />
              <p className={helperTextClass}>
                選択値: {answers[currentQuestion.id]}
              </p>
            </div>
          ) : null}

          {currentQuestion.type === "single" && currentQuestion.options ? (
            <div className="grid gap-4">
              {currentQuestion.options.map((option) => (
                <RadioCard
                  key={option.id}
                  title={getOptionLabel(currentQuestion.id, option.id, option.label)}
                  isSelected={answers[currentQuestion.id] === option.id}
                  type="button"
                  onClick={() => updateAnswer(currentQuestion.id, option.id)}
                />
              ))}
            </div>
          ) : null}
          {currentQuestion.type === "multi" && currentQuestion.options ? (
            <div className="grid gap-3">
              {(() => {
                const raw = answers[currentQuestion.id];
                const selectedValues: string[] = Array.isArray(raw)
                  ? raw.filter((value): value is string => typeof value === "string")
                  : [];
                const maxSelect =
                  currentQuestion.maxSelect ?? Number.POSITIVE_INFINITY;
                const isMaxed =
                  Number.isFinite(maxSelect) && selectedValues.length >= maxSelect;
                const toggle = (value: string) => {
                  const next = selectedValues.includes(value)
                    ? selectedValues.filter((entry) => entry !== value)
                    : [...selectedValues, value];

                  if (Number.isFinite(maxSelect) && next.length > maxSelect) return;

                  updateAnswer(currentQuestion.id, next);
                };
                return (
                  <>
                    {currentQuestion.options.map((option) => {
                      const isSelected = selectedValues.includes(option.id);
                      const disabled = isMaxed && !isSelected;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggle(option.id)}
                          disabled={disabled}
                          className={[
                            "flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:focus-visible:ring-pink-400/50",
                            isSelected
                              ? "border-primary/70 bg-primary/10 text-foreground shadow-sm ring-2 ring-primary/30 dark:border-pink-400/60 dark:bg-white/10 dark:text-zinc-50 dark:ring-pink-400/60"
                              : "border-border bg-card text-foreground hover:border-primary/40 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50 dark:hover:border-pink-400/40",
                            disabled ? "cursor-not-allowed opacity-60" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="text-base font-semibold">
                            {getOptionLabel(currentQuestion.id, option.id, option.label)}
                          </span>
                          <span
                            className={[
                              "flex h-5 w-5 items-center justify-center rounded border-2",
                              isSelected
                                ? "border-primary bg-primary text-white dark:border-pink-400 dark:bg-pink-400"
                                : "border-muted-foreground text-transparent dark:border-white/30",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                    {typeof currentQuestion.maxSelect === "number" && isMaxed ? (
                      <p className={helperTextClass}>
                        {styleMode === "kawaii"
                          ? `いま${currentQuestion.maxSelect}こ選んでるよ。入れ替えるなら1こ外してね。`
                          : styleMode === "oshi"
                            ? `現在${currentQuestion.maxSelect}件まで選択中。差し替えるなら1件外そう。`
                            : `現在${currentQuestion.maxSelect}個まで選択中です。入れ替える場合はいずれかを外してください。`}
                      </p>
                    ) : null}
                  </>
                );
              })()}
            </div>
          ) : null}
          {currentQuestion.type === "text" ? (
            <textarea
              value={String(answers[currentQuestion.id] ?? "")}
              onChange={(event) => updateAnswer(currentQuestion.id, event.target.value)}
              placeholder="例：予算とのバランスが不安、再販情報が知りたい"
              className={`${inputBaseClass} min-h-[140px]`}
            />
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4">
        <p className={helperTextClass}>
          判断の表示例：{MODE_DICTIONARY[styleMode].text.verdictLabel.BUY} / {MODE_DICTIONARY[styleMode].text.verdictLabel.THINK} / {MODE_DICTIONARY[styleMode].text.verdictLabel.SKIP}
        </p>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-2 dark:border-white/10 dark:bg-white/6">
          {(["standard", "kawaii", "oshi"] as const).map((modeOption) => (
            <button
              key={modeOption}
              type="button"
              onClick={() => handleStyleModeChange(modeOption)}
              className={[
                "min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition",
                styleMode === modeOption
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-transparent text-slate-700 hover:bg-white dark:text-zinc-200 dark:hover:bg-white/10",
              ].join(" ")}
            >
              {MODE_DICTIONARY[modeOption].labels.name}
            </button>
          ))}
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 py-4 backdrop-blur">
        <div className={`${containerClass} flex items-center gap-4`}>
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1 rounded-xl"
          >
            戻る
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isAnswered(currentQuestion) || submitting}
            isLoading={submitting}
            className="flex-1 rounded-xl text-base"
          >
            {currentIndex === questions.length - 1 ? "結果を見る" : "次へ"}
          </Button>
        </div>
      </div>
    </div>
  );
}
