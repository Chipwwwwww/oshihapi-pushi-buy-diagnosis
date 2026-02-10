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
    <div
      className={[
        "osh-scale rounded-2xl border border-border bg-card shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="osh-scale__header">
        <div>
          <div className="osh-scale__meta font-medium">診断結果</div>
          <div className="osh-scale__title mt-1 font-semibold tracking-tight">
            {t.top}
          </div>
          <div className="osh-scale__subtitle mt-1">{t.sub}</div>
        </div>
        <div className="osh-scale__meta text-right">
          <div>判定の傾き</div>
          <div className="mt-1 font-medium">{Math.round(clamped * 100)}%</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="osh-scale__track">
          {/* line */}
          <div className="osh-scale__line" />

          {/* ticks */}
          <div className="osh-scale__tick" style={{ left: "0%" }} />
          <div
            className="osh-scale__tick"
            style={{ left: "50%", transform: "translateX(-50%)" }}
          />
          <div className="osh-scale__tick" style={{ right: 0 }} />

          {/* pointer */}
          <div
            className="osh-scale__pointer-wrapper absolute top-0 -translate-x-1/2 transition-all duration-300"
            style={{ left: `${pos}%` }}
          >
            <div className="flex flex-col items-center">
              <div className="osh-scale__marker rounded-full px-2 py-1 font-medium shadow-sm">
                {t.top}
              </div>
              <div className="osh-scale__pointer h-0 w-0 border-l-8 border-r-8 border-t-10 border-l-transparent border-r-transparent" />
            </div>
          </div>
        </div>

        <div className="osh-scale__labels">
          <span>やめる</span>
          <span>保留</span>
          <span>買う</span>
        </div>
      </div>
    </div>
  );
}
