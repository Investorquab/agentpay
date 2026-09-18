import "server-only";
import { x402Facilitator } from "@x402/core/facilitator";
import { ExactStellarScheme } from "@x402/stellar/exact/facilitator";
import { createEd25519Signer } from "@x402/stellar";
import { STELLAR_NETWORK } from "./config";

/**
 * The facilitator is the piece that actually verifies a client's signed
 * payment and submits it on-chain. In production you would run this as
 * its own service (or point at a hosted one); for a hackathon-scale
 * build it lives in-process next to the resource server, which is fine
 * because Next.js API routes already run server-side only.
 *
 * TREASURY_SECRET is the facilitator's own Stellar account. Per the
 * x402 Stellar spec, facilitators always sponsor the network fee
 * (areFeesSponsored: true), so this account needs a small amount of
 * XLM for fees but the paying agent never touches XLM at all.
 */
function buildFacilitator() {
  const secret = process.env.TREASURY_SECRET;
  if (!secret) {
    throw new Error(
      "TREASURY_SECRET is not set. Generate a Stellar testnet keypair, " +
        "fund it via Friendbot, and put the secret (S...) in .env.local."
    );
  }

  const treasurySigner = createEd25519Signer(secret, STELLAR_NETWORK);

  const facilitator = new x402Facilitator();
  facilitator.register(STELLAR_NETWORK, new ExactStellarScheme([treasurySigner]));

  return facilitator;
}

let cached: x402Facilitator | null = null;

/** Singleton facilitator instance, built lazily on first request. */
export function getFacilitator(): x402Facilitator {
  if (!cached) cached = buildFacilitator();
  return cached;
}
