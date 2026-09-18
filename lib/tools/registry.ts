import "server-only";
import type { ToolId } from "@/lib/x402/config";

async function liveCrypto(symbol: string) {
  const id = symbol.toLowerCase().trim();
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`,
    { cache: "no-store" }
  );
  if (!response.ok) throw new Error(`Market data provider returned HTTP ${response.status}`);
  const data = await response.json();
  if (!data[id]) throw new Error(`Unknown CoinGecko asset: ${id}`);
  return { asset: id, priceUsd: data[id].usd, change24hPct: data[id].usd_24h_change ?? null, source: "CoinGecko", asOf: new Date().toISOString() };
}

async function liveWeather(city: string) {
  const geo = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geo.searchParams.set("name", city);
  geo.searchParams.set("count", "1");
  geo.searchParams.set("language", "en");
  geo.searchParams.set("format", "json");
  const geoResponse = await fetch(geo, { cache: "no-store" });
  if (!geoResponse.ok) throw new Error(`Geocoding provider returned HTTP ${geoResponse.status}`);
  const place = (await geoResponse.json()).results?.[0];
  if (!place) throw new Error(`City not found: ${city}`);

  const weather = new URL("https://api.open-meteo.com/v1/forecast");
  weather.searchParams.set("latitude", String(place.latitude));
  weather.searchParams.set("longitude", String(place.longitude));
  weather.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
  weather.searchParams.set("timezone", "auto");
  const response = await fetch(weather, { cache: "no-store" });
  if (!response.ok) throw new Error(`Weather provider returned HTTP ${response.status}`);
  const current = (await response.json()).current;
  return { city: place.name, country: place.country, temperatureC: current?.temperature_2m, windSpeedKmh: current?.wind_speed_10m, weatherCode: current?.weather_code, source: "Open-Meteo", asOf: current?.time ?? new Date().toISOString() };
}

async function fetchUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Invalid URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) URLs are allowed");
  const response = await fetch(url, { redirect: "follow", cache: "no-store", headers: { "user-agent": "AgentPay/0.1" } });
  if (!response.ok) throw new Error(`URL returned HTTP ${response.status}`);
  const raw = await response.text();
  const content = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { url: url.toString(), status: response.status, contentType: response.headers.get("content-type") ?? "", content: content.slice(0, 5000), truncated: content.length > 5000, fetchedAt: new Date().toISOString() };
}

function required(input: Record<string, string>, key: string) {
  const value = input[key]?.trim();
  if (!value) throw new Error(`Missing required input: ${key}`);
  return value;
}

export async function runTool(id: ToolId, input: Record<string, string>) {
  switch (id) {
    case "crypto": return liveCrypto(required(input, "symbol"));
    case "weather": return liveWeather(required(input, "city"));
    case "url": return fetchUrl(required(input, "url"));
    case "wordcount": {
      const text = input.text || "";
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const sentences = text.trim() ? (text.match(/[.!?]+(?=\s|$)/g) ?? []).length : 0;
      return { words, chars: text.length, sentences, readingTimeSec: Math.max(1, Math.round((words / 200) * 60)) };
    }
  }
}