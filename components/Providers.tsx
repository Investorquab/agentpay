"use client";

import { PollarProvider } from "@pollar/react";
import type { ReactNode } from "react";

// Pollar's official docs call this the publishable key.
// Keep the old variable name as a fallback so existing .env files keep working.
const POLLAR_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_POLLAR_API_KEY;

export function Providers({ children }: { children: ReactNode }) {
  if (!POLLAR_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }

  return (
    <PollarProvider client={{ apiKey: POLLAR_PUBLISHABLE_KEY, stellarNetwork: "testnet" }}>
      {children}
    </PollarProvider>
  );
}
