"use client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Decisiveness } from "@/src/oshihapi/model";
import { parseDecisiveness, DECISIVENESS_STORAGE_KEY } from "@/src/oshihapi/decisiveness";
import { COPY_BY_MODE } from "@/src/oshihapi/modes/copy_dictionary";
import {
  getStyleModeFromSearchParams,
  setStyleModeToLocalStorage,
  type StyleMode,
} from "@/src/oshihapi/modes/useStyleMode";
import AdvancedSettingsPanel from "@/components/AdvancedSettingsPanel";
import Button from "@/components/ui/Button";
import { containerClass, helperTextClass, pageTitleClass } from "@/components/ui/tokens";
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

export default function ConfirmSettingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const styleMode = getStyleModeFromSearchParams(searchParams) ?? "standard";
  const decisiveness = parseDecisiveness(searchParams.get("decisiveness"));
  const deadline = parseDeadlineValue(searchParams.get("deadline") ?? "unknown");
  const itemKind = parseItemKindValue(searchParams.get("itemKind") ?? "goods");
  const itemName = searchParams.get("itemName") ?? "";
  const priceYen = searchParams.get("priceYen") ?? "";

  const modeCopy = COPY_BY_MODE[styleMode];
  const itemNamePlaceholder =
    itemKind === "game_billing"
      ? "例：限定ガチャ10連 / 月パス / コラボスキン"
      : "例：推しアクスタ 2025";

  const replaceQuery = (updates: Record<string, string | null>) => {
    router.replace(buildConfirmSettingsUrl(searchParams, updates));
  };

  const handleStyleModeChange = (nextMode: StyleMode) => {
    replaceQuery({ styleMode: nextMode });
    setStyleModeToLocalStorage(nextMode);
  };

  const handleDecisivenessChange = (value: Decisiveness) => {
    replaceQuery({ decisiveness: value });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DECISIVENESS_STORAGE_KEY, value);
    }
  };

  return (
    <div className={`${containerClass} flex min-h-screen flex-col gap-5 py-8`}>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-accent">確認/調整（任意）</p>
        <h1 className={pageTitleClass}>入力（任意）を追加</h1>
        <p className={helperTextClass}>必要な情報だけ追加して診断に進めます。</p>
      </header>

      <AdvancedSettingsPanel
        showStyleSection={false}
        showDecisivenessSection={false}
        styleMode={styleMode}
        styleOptionLabel={modeCopy.ui.styleOptionLabel}
        styleSectionTitle={modeCopy.ui.styleSectionTitle}
        styleSectionHelp={modeCopy.ui.styleSectionHelp}
        decisiveness={decisiveness}
        itemName={itemName}
        itemNamePlaceholder={itemNamePlaceholder}
        priceYen={priceYen}
        deadline={deadline}
        itemKind={itemKind}
        deadlineOptions={deadlineOptions}
        itemKindOptions={itemKindOptions}
        isOptionalInputOpen
        itemNameHelpText="空でもOK（例：推しアクスタ 2025）"
        priceYenHelpText="だいたいでOK（例：8800）"
        deadlineHelpText="未定でもOK"
        itemKindHelpText="迷ったらグッズ"
        onStyleModeChange={handleStyleModeChange}
        onDecisivenessChange={handleDecisivenessChange}
        onItemNameChange={(value) => replaceQuery({ itemName: value.trim() ? value : null })}
        onPriceYenChange={(value) => replaceQuery({ priceYen: parsePriceYen(value) })}
        onDeadlineChange={(value) => replaceQuery({ deadline: parseDeadlineValue(value) })}
        onItemKindChange={(value) => replaceQuery({ itemKind: parseItemKindValue(value) })}
      />

      <div className="grid gap-3">
        <Button onClick={() => router.push(buildFlowUrl(searchParams))} className="w-full text-base">
          この設定で診断へ
        </Button>
        <Button variant="outline" onClick={() => router.push(buildConfirmUrl(searchParams))} className="w-full text-base">
          戻る
        </Button>
      </div>
    </div>
  );
}
