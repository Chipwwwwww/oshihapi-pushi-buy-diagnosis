import { MODE_DICTIONARY } from "@/src/oshihapi/modes/mode_dictionary";
import { RESULT_COPY } from "@/src/oshihapi/modes/mode_copy_ja";
import { QUESTION_COPY } from "@/src/oshihapi/modes/questionCopy";
import type { StyleMode } from "@/src/oshihapi/modes/useStyleMode";

export const COPY_BY_MODE: Record<
  StyleMode,
  {
    ui: {
      styleSectionTitle: string;
      styleSectionHelp: string;
      styleOptionLabel: Record<StyleMode, string>;
      resultSummaryTitle: string;
      adviceTitle: string;
      actionsTitle: string;
      reasonsTitle: string;
    };
    questions: Record<
      string,
      {
        title?: string;
        helper?: string;
        options?: Record<string, string>;
      }
    >;
    result: {
      verdictTitle: Record<"BUY" | "THINK" | "SKIP", string>;
      verdictLead: Record<"BUY" | "THINK" | "SKIP", string>;
      waitTypeLabel: Record<string, string>;
      reasonTagLabel: Record<string, string>;
      actionLabel: Record<string, string>;
      actionHelp: Record<string, string>;
    };
  }
> = {
  standard: {
    ui: RESULT_COPY.standard.ui,
    questions: {},
    result: {
      verdictTitle: MODE_DICTIONARY.standard.text.verdictLabel,
      verdictLead: RESULT_COPY.standard.verdictSubcopy,
      waitTypeLabel: MODE_DICTIONARY.standard.text.waitTypeLabel,
      reasonTagLabel: MODE_DICTIONARY.standard.text.reasonTagLabel,
      actionLabel: MODE_DICTIONARY.standard.text.actionLabel,
      actionHelp: RESULT_COPY.standard.actionExplain,
    },
  },
  kawaii: {
    ui: RESULT_COPY.kawaii.ui,
    questions: Object.fromEntries(
      Object.entries(QUESTION_COPY.kawaii).map(([questionId, question]) => [
        questionId,
        {
          title: question.title,
          helper: question.helper,
          options: Object.fromEntries(
            Object.entries(question.options ?? {}).map(([optionId, option]) => [
              optionId,
              option.label ?? "",
            ]),
          ),
        },
      ]),
    ),
    result: {
      verdictTitle: MODE_DICTIONARY.kawaii.text.verdictLabel,
      verdictLead: RESULT_COPY.kawaii.verdictSubcopy,
      waitTypeLabel: MODE_DICTIONARY.kawaii.text.waitTypeLabel,
      reasonTagLabel: MODE_DICTIONARY.kawaii.text.reasonTagLabel,
      actionLabel: MODE_DICTIONARY.kawaii.text.actionLabel,
      actionHelp: RESULT_COPY.kawaii.actionExplain,
    },
  },
  oshi: {
    ui: RESULT_COPY.oshi.ui,
    questions: Object.fromEntries(
      Object.entries(QUESTION_COPY.oshi).map(([questionId, question]) => [
        questionId,
        {
          title: question.title,
          helper: question.helper,
          options: Object.fromEntries(
            Object.entries(question.options ?? {}).map(([optionId, option]) => [
              optionId,
              option.label ?? "",
            ]),
          ),
        },
      ]),
    ),
    result: {
      verdictTitle: MODE_DICTIONARY.oshi.text.verdictLabel,
      verdictLead: RESULT_COPY.oshi.verdictSubcopy,
      waitTypeLabel: MODE_DICTIONARY.oshi.text.waitTypeLabel,
      reasonTagLabel: MODE_DICTIONARY.oshi.text.reasonTagLabel,
      actionLabel: MODE_DICTIONARY.oshi.text.actionLabel,
      actionHelp: RESULT_COPY.oshi.actionExplain,
    },
  },
};
