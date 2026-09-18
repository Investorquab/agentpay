import "server-only";
import type { ToolId } from "@/lib/x402/config";

/**
 * Actual tool logic, called only after a payment has verified and
 * settled. Kept dependency-free (no outbound fetches) so the demo
 * never breaks on a flaky third-party API mid-pitch.
 */

const JOKES = [
  "There are only 10 types of people: those who understand binary and those who don't.",
  "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'",
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "It's not a bug, it's an undocumented feature.",
  "!false — it's funny because it's true.",
];

const WEATHER_CONDITIONS = ["Clear", "Partly cloudy", "Overcast", "Light rain", "Windy"];

function seededPick<T>(list: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

export function runTool(id: ToolId, input: Record<string, string>) {
  switch (id) {
    case "quote": {
      const symbol = (input.symbol || "STLR").toUpperCase();
      const base = seededPick([12.4, 88.1, 231.6, 3.02, 55.9], symbol);
      const drift = ((Date.now() / 1000) % 100) / 100 - 0.5;
      const price = Math.max(0.01, base * (1 + drift * 0.02));
      return {
        symbol,
        price: Number(price.toFixed(2)),
        currency: "USD",
        asOf: new Date().toISOString(),
      };
    }
    case "weather": {
      const city = input.city || "Lagos";
      const condition = seededPick(WEATHER_CONDITIONS, city + new Date().toDateString());
      const tempC = 18 + (city.length % 15);
      return { city, condition, tempC, asOf: new Date().toISOString() };
    }
    case "joke": {
      const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
      return { joke };
    }
    case "wordcount": {
      const text = input.text || "";
      const words = text.trim().length ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      const readingTimeSec = Math.max(1, Math.round((words / 200) * 60));
      return { words, chars, readingTimeSec };
    }
    default:
      throw new Error(`Unknown tool: ${id}`);
  }
}
