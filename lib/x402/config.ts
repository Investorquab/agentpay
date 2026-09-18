/**
 * Shared x402 configuration.
 *
 * Everything here is intentionally boring and centralized: one network,
 * one facilitator, one price list. Swap NEXT_PUBLIC_X402_NETWORK to
 * "stellar:pubnet" and point RECEIVING_ADDRESS at a mainnet account to
 * go live; nothing else in the app needs to change.
 */

export const STELLAR_NETWORK =
  (process.env.NEXT_PUBLIC_X402_NETWORK as "stellar:testnet" | "stellar:pubnet") ??
  "stellar:testnet";

/** Address the facilitator settles payments to. Set in .env.local. */
export const RECEIVING_ADDRESS = process.env.RECEIVING_ADDRESS ?? "";

export type ToolId = "quote" | "joke" | "weather" | "wordcount";

export interface ToolDefinition {
  id: ToolId;
  label: string;
  description: string;
  /** USD price as a decimal string, e.g. "0.01". */
  price: string;
}

/**
 * The paid tool catalog. Every entry here becomes a real 402-gated
 * endpoint at /api/tools/[id]. Add a tool by adding a row here and a
 * matching case in lib/tools/registry.ts.
 */
export const TOOLS: ToolDefinition[] = [
  {
    id: "quote",
    label: "Market Quote",
    description: "Simulated live quote for a ticker symbol",
    price: "0.01",
  },
  {
    id: "weather",
    label: "Weather Lookup",
    description: "Current conditions for a named city",
    price: "0.01",
  },
  {
    id: "joke",
    label: "Programmer Joke",
    description: "One fresh joke, chosen server-side",
    price: "0.005",
  },
  {
    id: "wordcount",
    label: "Text Analysis",
    description: "Word/char count and reading time for pasted text",
    price: "0.02",
  },
];

export function getTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id);
}
