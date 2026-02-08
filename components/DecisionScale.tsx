"use client";

type Decision = "buy" | "wait" | "no";

export type DecisionScaleProps = {
  decision: Decision;
  /**
   * -1.0（強いやめる）〜 +1.0（強い買う）
   * 0 は保留寄り
   */
  index: number;
  className?: string;
};

const LABEL = {
  no: { top: "やめる", sub: "今回は見送ろう" },
  wait: { top: "保留", sub: "条件が揃ったら買う" },
  buy: { top: "買う", sub: "買ってOK（上限だけ決めて）" },
} as const;

export default function DecisionScale({ decision, index, className }: DecisionScaleProps) {
  const clamped = Math.max(-1, Math.min(1, index));
  const pos = ((clamped + 1) / 2) * 100;

  const t = LABEL[decision];

  return (
    <div className={["rounded-2xl border bg-white p-4 shadow-sm", className].filter(Boolean).join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-neutral-500">診断結果</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">{t.top}</div>
          <div className="mt-1 text-sm text-neutral-600">{t.sub}</div>
        </div>
        <div className="text-right text-xs text-neutral-500">
          <div>判定の傾き</div>
          <div className="mt-1 font-medium">{Math.round(clamped * 100)}%</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-12">
          {/* line */}
          <div className="absolute left-0 right-0 top-6 h-1 rounded-full bg-neutral-200" />

          {/* ticks */}
          <div className="absolute left-0 top-4 h-5 w-px bg-neutral-300" />
          <div className="absolute left-1/2 top-4 h-5 w-px -translate-x-1/2 bg-neutral-300" />
          <div className="absolute right-0 top-4 h-5 w-px bg-neutral-300" />

          {/* pointer */}
          <div
            className="absolute top-0 -translate-x-1/2 transition-all duration-300"
            style={{ left: `${pos}%` }}
          >
            <div className="flex flex-col items-center">
              <div className="rounded-full border bg-white px-2 py-1 text-xs font-medium shadow-sm">
                {t.top}
              </div>
              <div className="h-0 w-0 border-l-8 border-r-8 border-t-10 border-l-transparent border-r-transparent border-t-red-500" />
            </div>
          </div>
        </div>

        <div className="mt-1 flex justify-between text-xs text-neutral-500">
          <span>やめる</span>
          <span>保留</span>
          <span>買う</span>
        </div>
      </div>
    </div>
  );
}
