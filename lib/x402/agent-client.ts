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
  capUsd: number;
  spentUsd: number;
  maxPaymentUsd?: number;
}

export function createAgent(signer: ClientStellarSigner) {
  const client = new x402Client();
  client.register(STELLAR_NETWORK, new ExactStellarScheme(signer));
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  return {
    async callTool(
      url: string,
      priceUsd: number,
      budget: AgentBudget
    ): Promise<{ response: Response; entry: LedgerEntry }> {
      const id = crypto.randomUUID();
      const maxPayment = budget.maxPaymentUsd ?? 0.03;

      if (priceUsd > maxPayment) {
        return {
          response: new Response(null, { status: 402 }),
          entry: {
            id,
            tool: url,
            amount: priceUsd.toFixed(4),
            status: "blocked",
            reason: "per-payment limit is $" + maxPayment.toFixed(2),
            at: Date.now(),
          },
        };
      }

      if (budget.spentUsd + priceUsd > budget.capUsd) {
        return {
          response: new Response(null, { status: 402 }),
          entry: {
            id,
            tool: url,
            amount: priceUsd.toFixed(4),
            status: "blocked",
            reason: "would exceed session budget ($" + budget.capUsd.toFixed(2) + " cap)",
            at: Date.now(),
          },
        };
      }

      try {
        const response = await fetchWithPayment(url);
        const header = response.headers.get("X-PAYMENT-RESPONSE");
        const settlement = header ? decodePaymentResponseHeader(header) : undefined;

        let reason: string | undefined;
        if (!response.ok) {
          try {
            const body = await response.clone().json();
            reason = body?.reason || body?.message || ("HTTP " + response.status);
          } catch {
            reason = "HTTP " + response.status;
          }
        }

        return {
          response,
          entry: {
            id,
            tool: url,
            amount: priceUsd.toFixed(4),
            status: response.ok ? "paid" : "failed",
            transaction: settlement?.transaction,
            network: settlement?.network,
            reason,
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
