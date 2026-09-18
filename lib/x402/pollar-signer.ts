import type { ClientStellarSigner } from "@x402/stellar";
import type { PollarClient } from "@pollar/core";
import { rpc } from "@stellar/stellar-sdk";

/**
 * Bridges a Pollar embedded wallet into x402's ClientStellarSigner
 * interface (address + signAuthEntry + optional signTransaction).
 *
 * This is the actual point of the project: every other Stellar x402
 * agent wallet in the wild holds a raw secret key (`S...`) in an env
 * var or in memory. Here the agent's wallet is a real Pollar session
 * -- the human owner authenticated once (Google / passkey / email
 * OTP), Pollar holds the DPoP-bound session, and every payment this
 * signer makes is a signature the owner can revoke from any device
 * via `client.logoutEverywhere()` or `client.revokeSession()`. The
 * agent process itself never sees a private key at any point.
 *
 * `PollarClient.signAuthEntry` asks for `validUntilLedger` rather than
 * a network passphrase, because for custodial wallets Pollar's backend
 * independently validates and caps how far in the future the
 * authorization can expire (defense against an over-broad grant). We
 * compute it here from the current ledger via Soroban RPC, capped to
 * a short window appropriate for a single per-request payment.
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
    // ~10 minutes of validity at ~5s per ledger -- generous for a
    // single interactive payment, short enough to bound the grant.
    const validUntilLedger = ledger + 120;

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
