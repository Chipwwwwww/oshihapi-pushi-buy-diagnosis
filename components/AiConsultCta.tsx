"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type Props = {
  longPrompt: string;
  onCopyPrompt: () => Promise<void>;
};

export default function AiConsultCta({ longPrompt, onCopyPrompt }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="space-y-4 border-emerald-200 bg-emerald-50 dark:ring-1 dark:ring-white/10">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-emerald-900">AIに相談してさらに深掘り（任意）</h2>
        <p className="text-sm text-emerald-800">
          必要なときだけ開いて使えます。AIは自動で起動しません。
        </p>
      </div>
      <Button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {isOpen ? "AI相談用プロンプトを閉じる" : "AIで理由を聞く（任意）"}
      </Button>
      {isOpen ? (
        <>
          <textarea
            readOnly
            value={longPrompt}
            className="min-h-[180px] w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900"
          />
          <Button
            onClick={() => {
              void onCopyPrompt();
            }}
            className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            プロンプトをコピー
          </Button>
        </>
      ) : null}
    </Card>
  );
}
