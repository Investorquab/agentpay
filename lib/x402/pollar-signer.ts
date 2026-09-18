import type { ClientStellarSigner } from "@x402/stellar";
import type { PollarClient } from "@pollar/core";
import { rpc, xdr } from "@stellar/stellar-sdk";

/**
 * Bridges a Pollar embedded wallet into x402's ClientStellarSigner
 * interface (address + signAuthEntry + optional signTransaction).
 *
 * The agent never receives a private key. Pollar owns the authenticated
 * wallet session and performs the actual signing operation.
 *
 * Pollar's signAuthEntry API accepts base64 XDR. x402/Stellar SDK versions
 * can hand a signer an XDR object/string produced by a different SDK copy,
 * so normalize the authorization entry through our pinned Stellar SDK before
 * sending it to Pollar. This keeps the Pollar wire payload canonical.
 */
export class PollarStellarSigner implements ClientStellarSigner {
  private readonly rpcUrl: string;

  constructor(
    private readonly client: PollarClient,
    /** The wallet's Stellar public address (G... or C...). */
    public readonly address: string,
    rpcUrl = "https://soroban-testnet.stellar.org"
  ) {
    this.rpcUrl = rpcUrl;
  }

  private async currentLedger(): Promise<number> {
    const server = new rpc.Server(this.rpcUrl);
    const { sequence } = await server.getLatestLedger();
    return sequence;
  }

  private normalizeAuthEntryXdr(authEntry: unknown): string {
    // Pollar expects the canonical base64 XDR wire payload. Do not decode and
    // re-encode the entry here: the x402/Stellar SDK already produced the
    // protocol-correct XDR, and an older decoder can reject a newer auth-entry
    // credential arm before Pollar ever receives it.
    if (typeof authEntry === "string") {
      return authEntry;
    }

    if (
      typeof authEntry === "object" &&
      authEntry !== null &&
      "toXDR" in authEntry &&
      typeof (authEntry as { toXDR?: unknown }).toXDR === "function"
    ) {
      return (authEntry as { toXDR: (format: "base64") => string }).toXDR("base64");
    }

    throw new Error("x402 returned an unsupported Soroban authorization entry format");
  }

  signAuthEntry: ClientStellarSigner["signAuthEntry"] = async (authEntry) => {
    const ledger = await this.currentLedger();
    const validUntilLedger = ledger + 60;
    const entryXdr = this.normalizeAuthEntryXdr(authEntry);

    const outcome = await this.client.signAuthEntry(entryXdr, { validUntilLedger });

    if (outcome.status === "error") {
      throw new Error(outcome.details ?? "Pollar wallet declined to sign the payment");
    }

    return {
      signedAuthEntry: outcome.signedAuthEntry,
      signerAddress: this.address,
    };
  };

  signTransaction: ClientStellarSigner["signTransaction"] = async (xdr) => {
    const outcome = await this.client.signTx(xdr);

    if (outcome.status === "error") {
      throw new Error(outcome.details ?? "Pollar wallet declined to sign the transaction");
    }

    return { signedTxXdr: outcome.signedXdr };
  };
}
