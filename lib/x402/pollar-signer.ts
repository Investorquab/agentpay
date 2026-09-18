import type { ClientStellarSigner } from "@x402/stellar";
import type { PollarClient } from "@pollar/core";
import { rpc } from "@stellar/stellar-sdk";

/**
 * Bridges a Pollar embedded wallet into x402's ClientStellarSigner
 * interface (address + signAuthEntry + optional signTransaction).
 *
 * The agent never receives a private key. Pollar owns the authenticated
 * wallet session and performs the actual signing operation.
 *
 * Pollar validates and caps auth-entry validity server-side. We therefore
 * use a short, single-payment window rather than a long-lived authorization.
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

  signAuthEntry: ClientStellarSigner["signAuthEntry"] = async (authEntry) => {
    const ledger = await this.currentLedger();

    // Keep the auth grant within a short window. Pollar also enforces
    // its own server-side maximum validity for embedded-wallet signing.
    const validUntilLedger = ledger + 60;

    const outcome = await this.client.signAuthEntry(authEntry, { validUntilLedger });

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
