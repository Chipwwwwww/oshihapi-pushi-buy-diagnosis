import type { AnswerValue, Question } from "@/src/oshihapi/model";

export function pruneAnswersAfterQuestion(
  answers: Record<string, AnswerValue>,
  questions: Question[],
  questionId: string,
): Record<string, AnswerValue> {
  const next = { ...answers };
  const answeredQuestionIndex = questions.findIndex((question) => question.id === questionId);
  if (answeredQuestionIndex < 0) return next;
  for (let index = answeredQuestionIndex + 1; index < questions.length; index += 1) {
    delete next[questions[index].id];
  }
  return next;
}
