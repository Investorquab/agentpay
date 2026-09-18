"use client";

import { useState } from "react";
import type { ClientStellarSigner } from "@x402/stellar";
import { createAgent, type LedgerEntry, type AgentBudget } from "@/lib/x402/agent-client";
import type { ToolDefinition } from "@/lib/x402/config";
import { WalletSetup } from "@/components/WalletSetup";
import { SpendMeter } from "@/components/SpendMeter";
import { AgentConsole } from "@/components/AgentConsole";
import { LedgerPanel } from "@/components/LedgerPanel";

export default function Home() {
  const [signer, setSigner] = useState<ClientStellarSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [budget, setBudget] = useState<AgentBudget>({ capUsd: 0.1, spentUsd: 0 });
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [busyToolId, setBusyToolId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<unknown>(null);

  async function handleRunTool(tool: ToolDefinition, input: Record<string, string>) {
    if (!signer) return;
    setBusyToolId(tool.id);

    const agent = createAgent(signer);
    const params = new URLSearchParams(input);
    const url = `/api/tools/${tool.id}?${params.toString()}`;
    const priceUsd = Number(tool.price);

    const { response, entry } = await agent.callTool(url, priceUsd, budget);

    setEntries((prev) => [entry, ...prev]);
    if (entry.status === "paid") {
      setBudget((b) => ({ ...b, spentUsd: b.spentUsd + priceUsd }));
      try {
        setLastResult(await response.json());
      } catch {
        setLastResult(null);
      }
    }
    setBusyToolId(null);
  }

  return (
    <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-6 py-8 gap-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Agent<span className="accent-text">Pay</span>
          </h1>
          <p className="text-sm dim-text mt-1">
            An AI agent with its own non-custodial wallet, paying per request over x402 on
            Stellar. The wallet is a Pollar session, not a private key sitting in an env file.
          </p>
        </div>
        {address && (
          <div className="text-xs mono dim-text panel px-3 py-1.5">
            {address.slice(0, 6)}...{address.slice(-6)}
          </div>
        )}
      </header>

      <div className="scanline-divider" />

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 flex-1 min-h-0">
        <div className="flex flex-col gap-4">
          <WalletSetup
            onReady={(s, addr) => {
              setSigner(s);
              setAddress(addr);
            }}
          />
          <SpendMeter
            spentUsd={budget.spentUsd}
            capUsd={budget.capUsd}
            onCapChange={(v) => setBudget((b) => ({ ...b, capUsd: v }))}
          />
          <AgentConsole
            connected={Boolean(signer)}
            busyToolId={busyToolId}
            onRunTool={handleRunTool}
          />

          {lastResult !== null && (
            <div className="panel p-4">
              <span className="text-xs uppercase tracking-widest dim-text">Last result</span>
              <pre className="mono text-xs mt-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="min-h-[420px] lg:min-h-0">
          <LedgerPanel entries={entries} />
        </div>
      </div>
    </main>
  );
}
