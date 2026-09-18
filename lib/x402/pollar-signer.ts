import type { ClientStellarSigner } from "@x402/stellar";
import type { PollarClient } from "@pollar/core";
import { Address, scValToNative, xdr } from "@stellar/stellar-sdk";

/**
 * Bridges a Pollar embedded wallet into x402's ClientStellarSigner.
 *
 * Important: x402's Stellar SDK callback passes a HashIdPreimage XDR to the
 * signer, while Pollar's signAuthEntry API expects a full
 * SorobanAuthorizationEntry XDR and returns the signed entry. This adapter
 * converts between those two wallet interfaces:
 *
 *   x402 preimage -> Pollar auth entry -> Pollar signed auth entry
 *      -> raw Ed25519 signature -> x402
 *
 * The agent never receives a private key. Pollar owns the authenticated
 * wallet session and performs the actual signing operation.
 */
export class PollarStellarSigner implements ClientStellarSigner {
  constructor(
    private readonly client: PollarClient,
    /** The wallet's Stellar public address (G... or C...). */
    public readonly address: string,
  ) {}

  private buildAuthEntryFromPreimage(preimageXdr: string): {
    entry: xdr.SorobanAuthorizationEntry;
    validUntilLedger: number;
  } {
    const preimage = xdr.HashIdPreimage.fromXDR(preimageXdr, "base64");
    const type = preimage.switch().value;

    if (
      type ===
      xdr.EnvelopeType.envelopeTypeSorobanAuthorization().value
    ) {
      const auth = preimage.sorobanAuthorization();
      const credentials = new xdr.SorobanAddressCredentials({
        address: new Address(this.address).toScAddress(),
        nonce: auth.nonce(),
        signatureExpirationLedger: auth.signatureExpirationLedger(),
        signature: xdr.ScVal.scvVoid(),
      });

      return {
        entry: new xdr.SorobanAuthorizationEntry({
          credentials:
            xdr.SorobanCredentials.sorobanCredentialsAddress(credentials),
          rootInvocation: auth.invocation(),
        }),
        validUntilLedger: auth.signatureExpirationLedger(),
      };
    }

    if (
      type ===
      xdr.EnvelopeType.envelopeTypeSorobanAuthorizationWithAddress()
        .value
    ) {
      const auth = preimage.sorobanAuthorizationWithAddress();
      const credentials = new xdr.SorobanAddressCredentials({
        address: auth.address(),
        nonce: auth.nonce(),
        signatureExpirationLedger: auth.signatureExpirationLedger(),
        signature: xdr.ScVal.scvVoid(),
      });

      return {
        entry: new xdr.SorobanAuthorizationEntry({
          credentials:
            xdr.SorobanCredentials.sorobanCredentialsAddressV2(credentials),
          rootInvocation: auth.invocation(),
        }),
        validUntilLedger: auth.signatureExpirationLedger(),
      };
    }

    throw new Error(
      "x402 returned an unsupported Stellar authorization preimage type",
    );
  }

  private extractRawSignature(signedEntryXdr: string): string {
    const signedEntry = xdr.SorobanAuthorizationEntry.fromXDR(
      signedEntryXdr,
      "base64",
    );

    const credentials = signedEntry.credentials();
    const type = credentials.switch().value;

    let signatureScVal: xdr.ScVal;

    if (
      type === xdr.SorobanCredentialsType.sorobanCredentialsAddress().value
    ) {
      signatureScVal = credentials.address().signature();
    } else if (
      type ===
      xdr.SorobanCredentialsType.sorobanCredentialsAddressV2().value
    ) {
      signatureScVal = credentials.addressV2().signature();
    } else {
      throw new Error(
        "Pollar returned an unsupported Soroban credential type",
      );
    }

    const native = scValToNative(signatureScVal) as
      | Array<{ public_key?: Uint8Array; signature?: Uint8Array }>
      | null;

    const signature = native?.[0]?.signature;

    if (!(signature instanceof Uint8Array) || signature.length === 0) {
      throw new Error("Pollar returned an auth entry without a raw signature");
    }

    return Buffer.from(signature).toString("base64");
  }

  signAuthEntry: ClientStellarSigner["signAuthEntry"] = async (preimageXdr) => {
    const { entry, validUntilLedger } =
      this.buildAuthEntryFromPreimage(preimageXdr);

    const outcome = await this.client.signAuthEntry(
      entry.toXDR("base64"),
      { validUntilLedger },
    );

    if (outcome.status === "error") {
      throw new Error(
        outcome.details ?? "Pollar wallet declined to sign the payment",
      );
    }

    return {
      // x402's SDK callback expects the raw signature bytes encoded as base64
      // here; it wraps those bytes into the Soroban signature ScVal itself.
      signedAuthEntry: this.extractRawSignature(outcome.signedAuthEntry),
      signerAddress: this.address,
    };
  };

  signTransaction: ClientStellarSigner["signTransaction"] = async (txXdr) => {
    const outcome = await this.client.signTx(txXdr);

    if (outcome.status === "error") {
      throw new Error(
        outcome.details ?? "Pollar wallet declined to sign the transaction",
      );
    }

    return { signedTxXdr: outcome.signedXdr };
  };
}
