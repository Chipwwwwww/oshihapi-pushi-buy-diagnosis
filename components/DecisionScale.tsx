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
  wait: { top: "様子見", sub: "条件が揃ったら買う" },
  buy: { top: "買う", sub: "買ってOK（上限だけ決めて）" },
} as const;

export default function DecisionScale({ decision, index, className }: DecisionScaleProps) {
  const clamped = Math.max(-1, Math.min(1, index));
  const pos = ((clamped + 1) / 2) * 100;

  const t = LABEL[decision];

  return (
    <div
      className={[
        "rounded-2xl border border-border bg-card p-4 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-muted-foreground">判定の詳細</div>
          <div className="mt-1 text-xl font-semibold tracking-tight">{t.top}</div>
          <div className="mt-1 text-sm text-muted-foreground">{t.sub}</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>判定の傾き</div>
          <div className="mt-1 font-medium">{Math.round(clamped * 100)}%</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-12">
          {/* line */}
          <div className="absolute left-0 right-0 top-6 h-1 rounded-full bg-muted" />

          {/* ticks */}
          <div className="absolute left-0 top-4 h-5 w-px bg-border" />
          <div className="absolute left-1/2 top-4 h-5 w-px -translate-x-1/2 bg-border" />
          <div className="absolute right-0 top-4 h-5 w-px bg-border" />

          <div
            className="absolute bottom-0 top-3 w-[2px] -translate-x-1/2 bg-foreground/85 transition-all duration-300"
            style={{ left: `${pos}%` }}
          />

          {/* pointer */}
          <div
            className="absolute top-0 -translate-x-1/2 transition-all duration-300"
            style={{ left: `${pos}%` }}
          >
            <div className="flex flex-col items-center">
              <div className="rounded-full border border-foreground/30 bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                {t.top}
              </div>
              <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[16px] border-l-transparent border-r-transparent border-t-foreground" />
            </div>
          </div>
        </div>

        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>やめる</span>
          <span>保留</span>
          <span>買う</span>
        </div>
      </div>
    </div>
  );
}
