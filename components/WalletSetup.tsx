"use client";

import { useEffect, useMemo, useState } from "react";
import { Keypair } from "@stellar/stellar-sdk";
import { usePollar } from "@pollar/react";
import type { ClientStellarSigner } from "@x402/stellar";
import { createDemoSigner } from "@/lib/x402/demo-signer";
import { PollarStellarSigner } from "@/lib/x402/pollar-signer";

const POLLAR_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_POLLAR_API_KEY;

const HAS_POLLAR = Boolean(POLLAR_PUBLISHABLE_KEY);

// usePollar() is only safe to call inside <Providers>, which only
// mounts <PollarProvider> when a key is configured. We isolate the
// hook call in its own tiny component so this file works either way.
function PollarWalletOption({ onSigner }: { onSigner: (s: ClientStellarSigner, addr: string) => void }) {
  // Only ever rendered when HAS_POLLAR is true, i.e. inside <Providers>
  // where <PollarProvider> is guaranteed to be mounted.
  const { wallet, isAuthenticated, login, getClient, logout } = usePollar();

  // A successful Pollar login already gives us the wallet we need. Select it
  // automatically so the user does not have to click a second "Use this wallet"
  // button before the agent can make a payment.
  useEffect(() => {
    if (!isAuthenticated || !wallet) return;
    onSigner(new PollarStellarSigner(getClient(), wallet.address), wallet.address);
  }, [isAuthenticated, wallet, getClient, onSigner]);

  if (isAuthenticated && wallet) {
    return (
      <div className="flex items-center justify-between panel-raised px-3 py-2.5">
        <div>
          <div className="text-xs dim-text uppercase tracking-wide">Pollar wallet connected</div>
          <div className="text-sm mono mt-0.5">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-6)}
          </div>
        </div>
        <div className="flex gap-2">
          <span
            className="text-xs px-3 py-1.5 rounded font-medium"
            style={{ background: "var(--accent)", color: "#0a0d0a" }}
          >
            Wallet selected
          </span>
          <button onClick={() => logout()} className="text-xs px-3 py-1.5 rounded dim-text panel">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => login({ provider: "google" })}
      className="w-full text-sm px-3 py-2.5 rounded panel-raised text-left hover:border-[var(--accent-dim)] transition-colors"
    >
      Sign in with Google &rarr; owner controls a real embedded Stellar wallet
    </button>
  );
}

export function WalletSetup({
  onReady,
}: {
  onReady: (signer: ClientStellarSigner, address: string) => void;
}) {
  const [mode, setMode] = useState<"demo" | "pollar">(HAS_POLLAR ? "pollar" : "demo");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<{ address: string } | null>(null);

  const derivedAddress = useMemo(() => {
    if (!secret) return null;
    try {
      return Keypair.fromSecret(secret.trim()).publicKey();
    } catch {
      return null;
    }
  }, [secret]);

  function connectDemo() {
    setError(null);
    try {
      const signer = createDemoSigner(secret.trim());
      setConnected({ address: signer.address });
      onReady(signer, signer.address);
    } catch (e) {
      setError(e instanceof Error ? e.message : "invalid secret key");
    }
  }

  return (
    <div className="panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest dim-text">Agent wallet</span>
        <div className="flex text-xs rounded-full overflow-hidden border" style={{ borderColor: "var(--line)" }}>
          <button
            onClick={() => setMode("demo")}
            className="px-3 py-1"
            style={{
              background: mode === "demo" ? "var(--accent)" : "transparent",
              color: mode === "demo" ? "#0a0d0a" : "var(--ink-dim)",
            }}
          >
            Demo keypair
          </button>
          <button
            onClick={() => setMode("pollar")}
            className="px-3 py-1"
            style={{
              background: mode === "pollar" ? "var(--accent)" : "transparent",
              color: mode === "pollar" ? "#0a0d0a" : "var(--ink-dim)",
            }}
          >
            Pollar wallet
          </button>
        </div>
      </div>

      {mode === "demo" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs dim-text leading-relaxed">
            Paste a Stellar <span className="mono">testnet</span> secret key (S...). Funded via Friendbot
            plus the Circle testnet USDC faucet. Never use a mainnet key here.
          </p>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="S..."
            className="mono text-sm panel-raised px-3 py-2 rounded"
          />
          {derivedAddress && (
            <div className="text-xs mono dim-text">
              &rarr; {derivedAddress.slice(0, 8)}...{derivedAddress.slice(-8)}
            </div>
          )}
          {error && <div className="text-xs" style={{ color: "var(--danger)" }}>{error}</div>}
          <button
            onClick={connectDemo}
            disabled={!derivedAddress}
            className="text-sm px-3 py-2 rounded font-medium disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#0a0d0a" }}
          >
            {connected ? "Reconnect" : "Connect demo wallet"}
          </button>
        </div>
      )}

      {mode === "pollar" &&
        (HAS_POLLAR ? (
          <PollarWalletOption onSigner={onReady} />
        ) : (
          <div className="text-xs dim-text leading-relaxed panel-raised px-3 py-2.5">
            Add <span className="mono">NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY</span> to{" "}
            <span className="mono">.env</span> to enable real wallet login. The demo keypair works fully without it.
          </div>
        ))}
    </div>
  );
}
