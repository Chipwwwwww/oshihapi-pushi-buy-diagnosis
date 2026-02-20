"use client";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { containerClass, helperTextClass, inputBaseClass, pageTitleClass, sectionTitleClass } from "@/components/ui/tokens";
import {
  buildConfirmSettingsUrl,
  buildConfirmUrl,
  buildFlowUrl,
  deadlineOptions,
  itemKindOptions,
  parseDeadlineValue,
  parseItemKindValue,
} from "../confirmQuery";

const parsePriceYen = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? String(parsed) : null;
};

type SettingsStep = "kind" | "price_deadline" | "name";

const stepOrder: SettingsStep[] = ["kind", "price_deadline", "name"];

const parseStep = (value: string | null): SettingsStep => {
  if (value === "price_deadline" || value === "name") {
    return value;
  }
  return "kind";
};

export default function ConfirmSettingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const deadline = parseDeadlineValue(searchParams.get("deadline") ?? "unknown");
  const itemKind = parseItemKindValue(searchParams.get("itemKind") ?? "goods");
  const itemName = searchParams.get("itemName") ?? "";
  const priceYen = searchParams.get("priceYen") ?? "";
  const step = parseStep(searchParams.get("step"));

  const itemNamePlaceholder = itemKind === "game_billing" ? "例：限定ガチャ10連 / 月パス" : "例：推しアクスタ 2025";

  const replaceQuery = (updates: Record<string, string | null>) => {
    router.replace(buildConfirmSettingsUrl(searchParams, updates));
  };

  const moveStep = (nextStep: SettingsStep) => {
    replaceQuery({ step: nextStep });
  };

  return (
    <div className={`${containerClass} flex min-h-screen flex-col gap-4 py-5 pb-[calc(env(safe-area-inset-bottom)+92px)]`}>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-accent">確認/調整（任意）</p>
        <h1 className={pageTitleClass}>入力（任意）を追加</h1>
        <div className="flex items-center gap-2">
          {stepOrder.map((stepName, index) => (
            <button
              key={stepName}
              type="button"
              aria-label={`ステップ${index + 1}`}
              onClick={() => moveStep(stepName)}
              className={`h-2.5 w-2.5 rounded-full transition ${step === stepName ? "bg-primary" : "bg-slate-300 dark:bg-white/20"}`}
            />
          ))}
        </div>
      </header>

      {step === "kind" ? (
        <Card className="space-y-3 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <h2 className={sectionTitleClass}>種別</h2>
          <p className={helperTextClass}>迷ったらグッズ</p>
          <div className="grid grid-cols-2 gap-2">
            {itemKindOptions.map((option) => (
              <Button
                key={option.value}
                variant={itemKind === option.value ? "primary" : "outline"}
                onClick={() => replaceQuery({ itemKind: parseItemKindValue(option.value) })}
                className="w-full rounded-xl px-2"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </Card>
      ) : null}

      {step === "price_deadline" ? (
        <Card className="space-y-4 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <div className="space-y-2">
            <h2 className={sectionTitleClass}>価格</h2>
            <p className={helperTextClass}>だいたいでOK</p>
            <input
              value={priceYen}
              onChange={(event) => replaceQuery({ priceYen: parsePriceYen(event.target.value) })}
              placeholder="例：8800"
              inputMode="numeric"
              className={inputBaseClass}
            />
          </div>
          <div className="space-y-2">
            <h2 className={sectionTitleClass}>締切</h2>
            <p className={helperTextClass}>未定でもOK</p>
            <div className="grid grid-cols-3 gap-2">
              {deadlineOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={deadline === option.value ? "primary" : "outline"}
                  onClick={() => replaceQuery({ deadline: parseDeadlineValue(option.value) })}
                  className="w-full rounded-xl px-2"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {step === "name" ? (
        <Card className="space-y-3 border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50">
          <h2 className={sectionTitleClass}>商品名</h2>
          <p className={helperTextClass}>空でもOK</p>
          <input
            value={itemName}
            onChange={(event) => replaceQuery({ itemName: event.target.value.trim() ? event.target.value : null })}
            placeholder={itemNamePlaceholder}
            className={inputBaseClass}
          />
        </Card>
      ) : null}

      <div className="mt-auto" />

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[520px] flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
          <Button onClick={() => router.push(buildFlowUrl(searchParams))} className="w-full text-base">
            この設定で診断へ
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => router.push(buildConfirmUrl(searchParams))} className="w-full text-base">
              戻る
            </Button>
            {step === "kind" ? (
              <Button onClick={() => moveStep("price_deadline")} className="w-full text-base">
                次へ
              </Button>
            ) : null}
            {step === "price_deadline" ? (
              <Button onClick={() => moveStep("name")} className="w-full text-base">
                次へ
              </Button>
            ) : null}
            {step === "name" ? (
              <Button onClick={() => moveStep("price_deadline")} className="w-full text-base">
                前へ
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
