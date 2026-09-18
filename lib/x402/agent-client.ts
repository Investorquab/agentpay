"use client";

import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { decodePaymentResponseHeader } from "@x402/core/http";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import type { ClientStellarSigner } from "@x402/stellar";
import { STELLAR_NETWORK } from "./config";

export interface LedgerEntry {
  id: string;
  tool: string;
  amount: string;
  status: "paid" | "blocked" | "failed";
  transaction?: string;
  network?: string;
  reason?: string;
  at: number;
}

export interface AgentBudget {
  /** Total USD the agent may spend this session. */
  capUsd: number;
  spentUsd: number;
}

/**
 * Everything the "agent" needs to autonomously discover a 402, pay for
 * it through the owner's Stellar wallet, and hand back the result.
 * The cumulative budget cap lives here (application-level, on top of
 * x402's own per-payment spend controls) — the SDK guards a single
 * payment from being too large, this guards the whole session.
 */
export function createAgent(signer: ClientStellarSigner) {
  const client = new x402Client();
  client.register(STELLAR_NETWORK, new ExactStellarScheme(signer));

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  return {
    /**
     * Calls a paid tool. Throws a BudgetExceededError before any
     * network request is made if the call would blow the session cap.
     */
    async callTool(
      url: string,
      priceUsd: number,
      budget: AgentBudget
    ): Promise<{ response: Response; entry: LedgerEntry }> {
      const id = crypto.randomUUID();

      if (budget.spentUsd + priceUsd > budget.capUsd) {
        return {
          response: new Response(null, { status: 402 }),
          entry: {
            id,
            tool: url,
            amount: priceUsd.toFixed(4),
            status: "blocked",
            reason: `would exceed session budget ($${budget.capUsd.toFixed(2)} cap)`,
            at: Date.now(),
          },
        };
      }

      try {
        const response = await fetchWithPayment(url);
        const settlementHeader = response.headers.get("X-PAYMENT-RESPONSE");
        const settlement = settlementHeader
          ? decodePaymentResponseHeader(settlementHeader)
          : undefined;

        return {
          response,
          entry: {
            id,
            tool: url,
            amount: priceUsd.toFixed(4),
            status: response.ok ? "paid" : "failed",
            transaction: settlement?.transaction,
            network: settlement?.network,
            at: Date.now(),
          },
        };
      } catch (err) {
        return {
          response: new Response(null, { status: 500 }),
          entry: {
            id,
            tool: url,
            amount: priceUsd.toFixed(4),
            status: "failed",
            reason: err instanceof Error ? err.message : "unknown error",
            at: Date.now(),
          },
        };
      }
    },
  };
}
