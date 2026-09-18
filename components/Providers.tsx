"use client";

import { PollarProvider } from "@pollar/react";
import type { ReactNode } from "react";

const POLLAR_API_KEY = process.env.NEXT_PUBLIC_POLLAR_API_KEY;

export function Providers({ children }: { children: ReactNode }) {
  if (!POLLAR_API_KEY) {
    // No dashboard key configured yet — render children directly.
    // The demo (raw testnet keypair) signer still works fully; only
    // the "real Pollar wallet" toggle is unavailable until this is set.
    return <>{children}</>;
  }

  return (
    <PollarProvider client={{ apiKey: POLLAR_API_KEY, stellarNetwork: "testnet" }}>
      {children}
    </PollarProvider>
  );
}
