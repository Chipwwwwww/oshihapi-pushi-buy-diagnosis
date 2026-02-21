import { COPY_BY_MODE } from "@/src/oshihapi/modes/copy_dictionary";
import type { StyleMode } from "@/src/oshihapi/modes/useStyleMode";
import type { Question } from "@/src/oshihapi/model";

export function resolveQuestionText(question: Question, styleMode: StyleMode): { text: string; sameAsStandard: boolean } {
  const standard = question.title;
  const styled = COPY_BY_MODE[styleMode].questions[question.id]?.title;
  const text = styled ?? standard;
  return { text, sameAsStandard: text === standard };
}

export function resolveOptionLabel(
  questionId: string,
  option: { id: string; label: string },
  styleMode: StyleMode,
): { label: string; sameAsStandard: boolean } {
  const standard = option.label;
  const styled = COPY_BY_MODE[styleMode].questions[questionId]?.options?.[option.id];
  const label = styled ?? standard;
  return { label, sameAsStandard: label === standard };
}
