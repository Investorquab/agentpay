"use client";

export function SpendMeter({
  spentUsd,
  capUsd,
  onCapChange,
}: {
  spentUsd: number;
  capUsd: number;
  onCapChange: (v: number) => void;
}) {
  const pct = Math.min(100, (spentUsd / capUsd) * 100);
  const nearLimit = pct > 75;

  return (
    <div className="panel px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-widest dim-text">Session budget</span>
        <div className="flex items-center gap-1.5 text-xs mono">
          <span className="accent-text">${spentUsd.toFixed(3)}</span>
          <span className="dim-text">/</span>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={capUsd}
            onChange={(e) => onCapChange(Math.max(0.01, Number(e.target.value)))}
            className="w-16 bg-transparent mono dim-text border-b border-dashed"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-panel-raised)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: nearLimit ? "var(--warn)" : "var(--accent)",
          }}
        />
      </div>
    </div>
  );
}
