import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import React from "react";
import { renderToString } from "react-dom/server";
import { evaluate } from "@/src/oshihapi/engine";
import { resolveFlowQuestions } from "@/src/oshihapi/flowResolver";
import { saveRun } from "@/src/oshihapi/runStorage";
import { isPlatformMarketAction } from "@/src/oshihapi/neutralizePlatformActions";
import type { AnswerValue, DecisionRun, GoodsClass, ItemKind, Mode } from "@/src/oshihapi/model";

type SearchParamsLike = {
  get: (key: string) => string | null;
  toString: () => string;
};

const ModuleLoader = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = ModuleLoader._load;
const navigationState: {
  params: Record<string, string>;
  searchParams: SearchParamsLike;
  router: { push: (href: string) => void; replace: (href: string) => void };
} = {
  params: {},
  searchParams: new URLSearchParams(),
  router: {
    push: () => undefined,
    replace: () => undefined,
  },
};

const storage = new Map<string, string>();
const localStorageMock = {
  get length() {
    return storage.size;
  },
  clear: () => storage.clear(),
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
};
(globalThis as { window?: unknown }).window = {
  localStorage: localStorageMock,
  setTimeout,
  clearTimeout,
} as unknown as Window & typeof globalThis;

ModuleLoader._load = function patchedModuleLoad(request: string, parent: NodeModule | null, isMain: boolean) {
  if (request === "next/navigation") {
    return {
      useParams: () => navigationState.params,
      useRouter: () => navigationState.router,
      useSearchParams: () => navigationState.searchParams,
    };
  }
  if (request === "next/link") {
    return {
      __esModule: true,
      default: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) =>
        React.createElement("a", { href, ...props }, children),
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function setNavigation(query: string, params: Record<string, string> = {}) {
  const nextParams = new URLSearchParams(query);
  navigationState.searchParams = {
    get: (key: string) => nextParams.get(key),
    toString: () => nextParams.toString(),
  };
  navigationState.params = params;
}

function defaultAnswer(questionId: string): AnswerValue {
  if (questionId === "q_storage_fit") return "PROBABLE";
  if (questionId === "q_storage_space") return "adjust";
  if (questionId === "q_budget_pain") return "some";
  if (questionId === "q_motives_multi") return ["use"];
  if (questionId === "q_goal") return "single";
  if (questionId === "q_addon_goods_event_limit_context") return "none";
  if (questionId === "q_addon_goods_post_event_mailorder") return "maybe";
  if (questionId === "q_addon_goods_wait_tolerance") return "medium";
  if (questionId === "q_addon_goods_first_chance_tolerance") return "medium";
  if (questionId === "q_addon_goods_used_fallback") return "medium";
  if (questionId === "q_addon_goods_scarcity_pressure") return "medium";
  if (questionId === "q_addon_goods_venue_motive") return "practical_collecting";
  if (questionId === "q_addon_goods_live_goods_motive") return "mixed";
  if (questionId === "q_addon_goods_regret_axis") return "balanced";
  if (questionId === "q_hot_cold") return "normal";
  if (questionId === "q_price_feel") return "normal";
  if (questionId === "q_alternative_plan") return "maybe";
  if (questionId === "q_rarity_restock") return "unlikely";
  if (questionId === "q_urgency") return "last";
  if (questionId === "q_regret_impulse") return "calm";
  if (questionId === "q_impulse_axis_short") return 3;
  if (questionId === "q_desire") return 5;
  if (questionId.includes("blind_draw")) return "maybe";
  if (questionId === "q_addon_media_single_vs_set_intent") return "one_best_fit_version";
  if (questionId === "q_addon_media_completion_satisfaction") return "medium";
  if (questionId === "q_addon_media_used_market_recovery") return "buy_now_primary";
  if (questionId === "q_addon_media_used_market_comfort") return "medium";
  if (questionId === "q_addon_media_completion_pressure_type") return "personal_standard";
  if (questionId === "q_addon_media_set_reward_strength") return "medium";
  if (questionId === "q_addon_media_bonus_importance") return "medium";
  if (questionId === "q_addon_media_multi_store_tolerance") return "compare_then_one";
  if (questionId === "q_addon_media_split_order_burden") return "medium";
  if (questionId === "q_addon_voice_cd_kind") return "drama_cd_main";
  if (questionId === "q_addon_voice_cast_check") return "important_confirmed";
  if (questionId === "q_addon_voice_bonus_is_audio" || questionId === "q_addon_voice_audio_bonus_value") return "nice_to_have";
  if (questionId === "q_addon_voice_listen_timing" || questionId === "q_addon_voice_listen_intent") return "listen_soon";
  if (questionId.includes("ticket")) return "partly";
  if (questionId.includes("preorder")) return "unknown";
  if (questionId.includes("used")) return "careful";
  if (questionId.includes("addon")) return "partial";
  return "some";
}

function buildRun({
  itemKind,
  goodsClass,
  mode,
  answers,
}: {
  itemKind: ItemKind;
  goodsClass: GoodsClass;
  mode: Mode;
  answers: Record<string, AnswerValue>;
}): DecisionRun {
  const meta = {
    itemKind,
    goodsClass,
    itemName: "ブラウザースモーク検証",
    priceYen: 4800,
    deadline: "tomorrow" as const,
  };
  const flow = resolveFlowQuestions({
    mode,
    itemKind,
    goodsClass,
    goodsSubtype: "general",
    useCase: itemKind === "game_billing" ? "game_billing" : "merch",
    answers,
    meta,
    styleMode: "standard",
  });
  const completedAnswers = Object.fromEntries(
    flow.questions.map((question) => [question.id, answers[question.id] ?? defaultAnswer(question.id)]),
  );
  const output = evaluate({
    questionSet: { id: "browser-smoke", locale: "ja", category: "merch", version: 1, questions: flow.questions },
    meta,
    answers: completedAnswers,
    mode,
    useCase: itemKind === "game_billing" ? "game_billing" : "merch",
  });
  return {
    runId: "browser-smoke-run",
    createdAt: Date.now(),
    locale: "ja",
    category: "merch",
    mode,
    decisiveness: "standard",
    useCase: itemKind === "game_billing" ? "game_billing" : "merch",
    meta,
    answers: completedAnswers,
    output,
    diagnosticTrace: {
      ...flow.diagnosticTrace,
      runContext: {
        ...flow.diagnosticTrace.runContext,
        styleMode: "standard",
      },
      resultInputsSummary: output.diagnosticTrace?.resultInputsSummary,
    },
  };
}

function requirePage<T>(relativePath: string): T {
  return require(path.join(process.cwd(), relativePath));
}

function ensureBuildArtifacts() {
  const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
  if (!fs.existsSync(buildIdPath)) {
    throw new Error("browser_smoke: missing .next/BUILD_ID. Run `npm run build` before `npm run qa:diagnostics`.");
  }
}

function runHomeSmoke() {
  setNavigation("");
  const Home = requirePage<{ default: () => React.ReactElement }>("app/page.tsx").default;
  const html = renderToString(React.createElement(Home));
  assert(html.includes("推し買い診断"), "browser_smoke_home: homepage should render the core diagnosis entry");
  assert(html.includes("ブラインド/くじ"), "browser_smoke_home: homepage should expose the blind-draw category path");
  assert(html.includes("CD・DVD・Blu-ray・書籍"), "browser_smoke_home: homepage should keep the media category visible");
}

function runFlowSmoke() {
  setNavigation("mode=medium&styleMode=standard&itemKind=goods&gc=media&itemName=%E3%83%89%E3%83%A9%E3%83%9ECD&priceYen=4400&deadline=tomorrow");
  const FlowPage = requirePage<{ default: () => React.ReactElement }>("app/flow/page.tsx").default;
  const html = renderToString(React.createElement(FlowPage));
  assert(html.includes("読み込み中") || html.includes("残り") || html.includes("診断"), "browser_smoke_flow: flow route should render without URL hacking");
}

function runResultSmoke() {
  storage.clear();
  const run = buildRun({
    itemKind: "goods",
    goodsClass: "media",
    mode: "long",
    answers: {
      q_desire: 5,
      q_budget_pain: "ok",
      q_price_feel: "good",
      q_regret_impulse: "calm",
      q_goal: "single",
      q_motives_multi: ["content", "use"],
      q_addon_common_info: "enough",
      q_rarity_restock: "unlikely",
      q_urgency: "last",
      q_addon_media_motive: "cast_performer",
      q_addon_media_support_scope: "one_oshi",
      q_addon_media_collection_budget: "efficient",
      q_addon_media_edition_intent: "one_best_fit",
      q_addon_media_bonus_importance: "low",
      q_addon_media_multi_store_tolerance: "one_store_ok",
      q_addon_media_split_order_burden: "low",
      q_addon_media_random_goods_intent: "none",
      q_addon_voice_cd_kind: "drama_cd_main",
      q_addon_voice_cast_check: "important_confirmed",
      q_addon_voice_bonus_is_audio: "not_important",
      q_addon_voice_listen_timing: "listen_soon",
    },
  });
  saveRun(run);
  setNavigation("styleMode=standard", { runId: run.runId });
  const ResultPage = requirePage<{ default: () => React.ReactElement }>("app/result/[runId]/page.tsx").default;
  const standardHtml = renderToString(React.createElement(ResultPage));
  assert(standardHtml.includes("まず見る結論"), "browser_smoke_result: result page should render the diagnosis-first hierarchy");
  assert(standardHtml.includes("main next step"), "browser_smoke_result: result page should preserve the next-step block");
  assert(!standardHtml.includes("pending provider"), "browser_smoke_result: placeholder provider text must stay hidden");
  assert(!run.output.actions.some((action) => isPlatformMarketAction(action)), "browser_smoke_result: core diagnosis scenario should not depend on platform-market actions");
  assert(((run.output.positiveFactors?.length ?? 0) + (run.output.negativeFactors?.length ?? 0)) > 0, "browser_smoke_result: result should retain signed factor cards");
  setNavigation("styleMode=oshi", { runId: run.runId });
  const oshiHtml = renderToString(React.createElement(ResultPage));
  assert(oshiHtml.includes("まず見る結論"), "browser_smoke_result: style-mode revisit should still render result content");
  assert(standardHtml.includes("判定の傾き") && oshiHtml.includes("判定の傾き"), "browser_smoke_result: reload/back-forward style revisits should preserve the decision hierarchy");
}

ensureBuildArtifacts();
runHomeSmoke();
runFlowSmoke();
runResultSmoke();
console.log("browser smoke pass: homepage, flow, and result routes rendered coherently");
