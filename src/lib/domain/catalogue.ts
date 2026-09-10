import type { AIProfile, Asset, Signal } from "./types";

/** Seed catalogue shared by Demo Mode and the SQL seed. */

export const ASSETS: Asset[] = [
  { id: "asset-btc", symbol: "BTC", name: "Bitcoin", providerId: "bitcoin", logoUrl: null, priceDecimals: 2, active: true },
  { id: "asset-eth", symbol: "ETH", name: "Ethereum", providerId: "ethereum", logoUrl: null, priceDecimals: 2, active: true },
  { id: "asset-sol", symbol: "SOL", name: "Solana", providerId: "solana", logoUrl: null, priceDecimals: 3, active: true },
];

export const SIGNALS: Signal[] = [
  { id: "sig-momentum", slug: "momentum", name: "Momentum", description: "Recent price acceleration. Is the move speeding up or fading?", icon: "TrendingUp", accentColor: "#0E8F7E", active: true },
  { id: "sig-volume", slug: "volume", name: "Volume", description: "Trading activity behind the move. Strong volume can confirm a direction.", icon: "BarChart3", accentColor: "#2563EB", active: true },
  { id: "sig-volatility", slug: "volatility", name: "Volatility", description: "How wide the price is swinging. High volatility means larger, less predictable moves.", icon: "Activity", accentColor: "#B45309", active: true },
  { id: "sig-market-trend", slug: "market-trend", name: "Market Trend", description: "The broader multi-day direction of the asset.", icon: "LineChart", accentColor: "#15803D", active: true },
  { id: "sig-social-sentiment", slug: "social-sentiment", name: "Social Sentiment", description: "The mood of social discussion around the asset.", icon: "MessageCircle", accentColor: "#BE185D", active: true },
  { id: "sig-fear-greed", slug: "fear-greed", name: "Fear & Greed", description: "Overall crypto market emotion, from extreme fear to extreme greed.", icon: "Gauge", accentColor: "#C2313F", active: true },
  { id: "sig-btc-dominance", slug: "bitcoin-dominance", name: "Bitcoin Dominance", description: "Bitcoin's share of total crypto market value. Shifts hint at risk appetite.", icon: "PieChart", accentColor: "#D97706", active: true },
  { id: "sig-market-breadth", slug: "market-breadth", name: "Market Breadth", description: "How many assets are moving in the same direction as the leaders.", icon: "Layers", accentColor: "#7C3AED", active: true },
];

export const AI_PROFILES: AIProfile[] = [
  {
    id: "ai-oracle",
    slug: "oracle",
    name: "ATLAS",
    tagline: "Weighs trend, momentum and volume",
    description: "Patient and systematic. ATLAS only commits when the multi-day trend, short-term momentum and volume agree, and sits Neutral when they don't.",
    strategyType: "rule-based-synthesis",
    strategyVersion: "atlas-v1.0.0",
    accentColor: "#C2410C",
    prefers: ["market-trend", "momentum", "volume"],
    active: true,
  },
  {
    id: "ai-vector",
    slug: "vector",
    name: "PULSE",
    tagline: "Rides short-term momentum",
    description: "Quick and decisive. PULSE follows the last one to three days of price action and is rarely Neutral.",
    strategyType: "rule-based-momentum",
    strategyVersion: "pulse-v1.0.0",
    accentColor: "#B45309",
    prefers: ["momentum", "market-trend", "volatility"],
    active: true,
  },
  {
    id: "ai-echo",
    slug: "echo",
    name: "DRIFT",
    tagline: "Reads sentiment, fades crowded moves",
    description: "Contrarian by temperament. DRIFT follows the narrative until price runs too far from its weekly mean, then calls the reversal.",
    strategyType: "rule-based-sentiment",
    strategyVersion: "drift-v1.0.0",
    accentColor: "#BE185D",
    prefers: ["social-sentiment", "volume", "market-breadth"],
    active: true,
  },
];

export const assetBySymbol = (symbol: string): Asset | undefined => ASSETS.find((a) => a.symbol === symbol);
export const signalBySlug = (slug: string): Signal | undefined => SIGNALS.find((s) => s.slug === slug);
export const aiProfileBySlug = (slug: string): AIProfile | undefined => AI_PROFILES.find((a) => a.slug === slug);
