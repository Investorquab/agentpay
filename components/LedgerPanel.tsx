"use client";

import type { LedgerEntry } from "@/lib/x402/agent-client";
import { STELLAR_NETWORK } from "@/lib/x402/config";

function explorerUrl(txHash: string) {
  const net = STELLAR_NETWORK === "stellar:pubnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/tx/${txHash}`;
}

function statusColor(status: LedgerEntry["status"]) {
  if (status === "paid") return "var(--accent)";
  if (status === "blocked") return "var(--warn)";
  return "var(--danger)";
}

export function LedgerPanel({ entries }: { entries: LedgerEntry[] }) {
  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
        <span className="text-xs uppercase tracking-widest dim-text">Settlement ledger</span>
        <span className="flex items-center gap-2 text-xs mono dim-text">
          <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--accent)" }} />
          live
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1.5">
        {entries.length === 0 && (
          <div className="flex-1 flex items-center justify-center dim-text text-sm mono px-6 text-center">
            No payments yet. Ask the agent for something below.
          </div>
        )}

        {entries.map((e) => (
          <div key={e.id} className="panel-raised px-3 py-2.5 slide-in">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{e.tool}</span>
              <span
                className="text-xs mono px-1.5 py-0.5 rounded uppercase tracking-wide"
                style={{ color: statusColor(e.status), background: "rgba(255,255,255,0.04)" }}
              >
                {e.status}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs mono dim-text">
                {new Date(e.at).toLocaleTimeString()}
              </span>
              <span className="text-sm mono accent-text">${e.amount}</span>
            </div>
            {e.transaction && (
              <a
                href={explorerUrl(e.transaction)}
                target="_blank"
                rel="noreferrer"
                className="block mt-1.5 text-xs mono underline decoration-dotted"
                style={{ color: "var(--ink-dim)" }}
              >
                {e.transaction.slice(0, 10)}...{e.transaction.slice(-6)} · view on stellar.expert
              </a>
            )}
            {e.reason && (
              <div className="mt-1.5 text-xs" style={{ color: statusColor(e.status) }}>
                {e.reason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
