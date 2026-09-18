/**
 * AgentPay service catalog. Every service is protected by x402.
 */

const configuredNetwork = process.env.NEXT_PUBLIC_X402_NETWORK;
export const STELLAR_NETWORK = configuredNetwork === "stellar:pubnet" ? "stellar:pubnet" : "stellar:testnet";

export const RECEIVING_ADDRESS = process.env.RECEIVING_ADDRESS ?? "";

export type ToolId = "crypto" | "weather" | "url" | "wordcount";

export interface ToolDefinition {
  id: ToolId;
  label: string;
  description: string;
  price: string;
  inputHint: string;
}

export const TOOLS: ToolDefinition[] = [
  { id: "crypto", label: "Live Crypto Price", description: "Current market data from CoinGecko.", price: "0.01", inputHint: "symbol=bitcoin" },
  { id: "weather", label: "Live Weather", description: "Current conditions from Open-Meteo.", price: "0.01", inputHint: "city=Lagos" },
  { id: "url", label: "URL Fetch", description: "Retrieve a public webpage for agent inspection.", price: "0.01", inputHint: "url=https://example.com" },
  { id: "wordcount", label: "Text Analysis", description: "Analyze words, characters, sentences and reading time.", price: "0.02", inputHint: "text=..." },
];

export function getTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id);
}