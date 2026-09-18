"use client";

import { createEd25519Signer } from "@x402/stellar";
import type { ClientStellarSigner } from "@x402/stellar";
import { STELLAR_NETWORK } from "./config";

/**
 * A plain Stellar testnet keypair wrapped as a ClientStellarSigner.
 *
 * This exists ONLY so the demo works end-to-end before you've wired up
 * a full Pollar login screen. It is exactly the "agent holds a raw
 * secret key" pattern the project argues against — see
 * pollar-signer.ts for the real, non-custodial version. Swapping one
 * for the other is a one-line change in AgentConsole: both implement
 * the identical ClientStellarSigner interface.
 *
 * Never use this path with a mainnet secret key.
 */
export function createDemoSigner(secretKey: string): ClientStellarSigner {
  const signer = createEd25519Signer(secretKey, STELLAR_NETWORK);
  return signer;
}
