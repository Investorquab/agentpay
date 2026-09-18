"use client";

import { useState } from "react";
import { TOOLS, type ToolDefinition } from "@/lib/x402/config";

export function AgentConsole({
  connected,
  busyToolId,
  onRunTool,
}: {
  connected: boolean;
  busyToolId: string | null;
  onRunTool: (tool: ToolDefinition, input: Record<string, string>) => void;
}) {
  const [symbol, setSymbol] = useState("bitcoin");
  const [city, setCity] = useState("Lagos");
  const [url, setUrl] = useState("https://example.com");
  const [text, setText] = useState("Paste some text to analyze.");

  function inputsFor(tool: ToolDefinition): Record<string, string> {
    switch (tool.id) {
      case "crypto": return { symbol };
      case "weather": return { city };
      case "url": return { url };
      case "wordcount": return { text };
    }
  }

  return (
    <div className="panel p-4 flex flex-col gap-3">
      <span className="text-xs uppercase tracking-widest dim-text">Agent tools</span>
      <p className="text-sm dim-text leading-relaxed">
        Each button triggers a real HTTP 402 payment flow. The agent requests the service,
        receives the price, pays through the connected Stellar wallet, and only then gets the result.
      </p>

      <div className="flex flex-col gap-2 mt-1">
        {TOOLS.map((tool) => (
          <div key={tool.id} className="panel-raised px-3 py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{tool.label}</span>
                <span className="text-xs mono accent-text">{"$" + tool.price}</span>
              </div>
              <div className="text-xs dim-text mt-0.5">{tool.description}</div>

              {tool.id === "crypto" && (
                <input value={symbol} onChange={(e) => setSymbol(e.target.value.toLowerCase())}
                  className="mt-2 mono text-xs bg-transparent border-b w-32"
                  style={{ borderColor: "var(--line)" }} placeholder="bitcoin" />
              )}

              {tool.id === "weather" && (
                <input value={city} onChange={(e) => setCity(e.target.value)}
                  className="mt-2 mono text-xs bg-transparent border-b w-32"
                  style={{ borderColor: "var(--line)" }} placeholder="City" />
              )}

              {tool.id === "url" && (
                <input value={url} onChange={(e) => setUrl(e.target.value)}
                  className="mt-2 mono text-xs bg-transparent border-b w-full"
                  style={{ borderColor: "var(--line)" }} placeholder="https://example.com" />
              )}

              {tool.id === "wordcount" && (
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
                  className="mt-2 text-xs bg-transparent border rounded px-2 py-1 w-full resize-none" style={{ borderColor: "var(--line)" }} />
              )}
            </div>

            <button onClick={() => onRunTool(tool, inputsFor(tool))}
              disabled={!connected || busyToolId === tool.id}
              className="text-xs px-3 py-2 rounded font-medium shrink-0 disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#0a0d0a" }}>
              {busyToolId === tool.id ? "Paying..." : "Pay & run"}
            </button>
          </div>
        ))}
      </div>

      {!connected && <div className="text-xs dim-text mt-1">Connect a wallet above to enable payments.</div>}
    </div>
  );
}