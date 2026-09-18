import "server-only";
import { ExactStellarScheme as ExactStellarServerScheme } from "@x402/stellar/exact/server";
import type { PaymentRequirements } from "@x402/core/types";
import { RECEIVING_ADDRESS, STELLAR_NETWORK, type ToolDefinition } from "./config";

const scheme = new ExactStellarServerScheme();

/**
 * Builds the PaymentRequirements a client must satisfy to call `tool`.
 * Deterministic in everything except maxTimeoutSeconds, so the same
 * requirements can be reconstructed on the payment retry without
 * needing server-side session state between the 402 and the paid call.
 */
export async function buildRequirements(tool: ToolDefinition): Promise<PaymentRequirements> {
  if (!RECEIVING_ADDRESS) {
    throw new Error("RECEIVING_ADDRESS is not set in .env");
  }

  const base: PaymentRequirements = {
    scheme: "exact",
    network: STELLAR_NETWORK,
    asset: "", // filled in by parsePrice below
    amount: "", // filled in by parsePrice below
    payTo: RECEIVING_ADDRESS,
    maxTimeoutSeconds: 120,
    extra: {},
  };

  const assetAmount = await scheme.parsePrice(tool.price, STELLAR_NETWORK);

  const enhanced = await scheme.enhancePaymentRequirements(
    { ...base, asset: assetAmount.asset, amount: assetAmount.amount },
    { x402Version: 2, scheme: "exact", network: STELLAR_NETWORK, extra: { areFeesSponsored: true } },
    []
  );

  return enhanced;
}
