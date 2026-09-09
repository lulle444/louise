import type { AIProfile, Asset, Signal } from "./types";

/** Seed catalogue shared by Demo Mode and the SQL seed. */

export const ASSETS: Asset[] = [
  { id: "asset-btc", symbol: "BTC", name: "Bitcoin", providerId: "bitcoin", logoUrl: null, priceDecimals: 2, active: true },
  { id: "asset-eth", symbol: "ETH", name: "Ethereum", providerId: "ethereum", logoUrl: null, priceDecimals: 2, active: true },
  { id: "asset-sol", symbol: "SOL", name: "Solana", providerId: "solana", logoUrl: null, priceDecimals: 3, active: true },
];

export const SIGNALS: Signal[] = [
  { id: "sig-momentum", slug: "momentum", name: "Momentum", description: "Recent price acceleration. Is the move speeding up or fading?", icon: "TrendingUp", accentColor: "#21D4FD", active: true },
  { id: "sig-volume", slug: "volume", name: "Volume", description: "Trading activity behind the move. Strong volume can confirm a direction.", icon: "BarChart3", accentColor: "#60A5FA", active: true },
  { id: "sig-volatility", slug: "volatility", name: "Volatility", description: "How wide the price is swinging. High volatility means larger, less predictable moves.", icon: "Activity", accentColor: "#FBBF24", active: true },
  { id: "sig-market-trend", slug: "market-trend", name: "Market Trend", description: "The broader multi-day direction of the asset.", icon: "LineChart", accentColor: "#34D399", active: true },
  { id: "sig-social-sentiment", slug: "social-sentiment", name: "Social Sentiment", description: "The mood of social discussion around the asset.", icon: "MessageCircle", accentColor: "#F472B6", active: true },
  { id: "sig-fear-greed", slug: "fear-greed", name: "Fear & Greed", description: "Overall crypto market emotion, from extreme fear to extreme greed.", icon: "Gauge", accentColor: "#FB7185", active: true },
  { id: "sig-btc-dominance", slug: "bitcoin-dominance", name: "Bitcoin Dominance", description: "Bitcoin's share of total crypto market value. Shifts hint at risk appetite.", icon: "PieChart", accentColor: "#F59E0B", active: true },
  { id: "sig-market-breadth", slug: "market-breadth", name: "Market Breadth", description: "How many assets are moving in the same direction as the leaders.", icon: "Layers", accentColor: "#A78BFA", active: true },
];

export const AI_PROFILES: AIProfile[] = [
  {
    id: "ai-oracle",
    slug: "oracle",
    name: "ORACLE",
    tagline: "Balanced multi-signal synthesis",
    description: "Measured and analytical. ORACLE weighs trend, momentum and volume together and only commits when the signals agree.",
    strategyType: "rule-based-synthesis",
    strategyVersion: "oracle-v1.0.0",
    accentColor: "#8B5CF6",
    prefers: ["market-trend", "momentum", "volume"],
    active: true,
  },
  {
    id: "ai-vector",
    slug: "vector",
    name: "VECTOR",
    tagline: "Momentum and directional trend",
    description: "Fast, technical and decisive. VECTOR follows short-term momentum and is rarely Neutral.",
    strategyType: "rule-based-momentum",
    strategyVersion: "vector-v1.0.0",
    accentColor: "#21D4FD",
    prefers: ["momentum", "market-trend", "volatility"],
    active: true,
  },
  {
    id: "ai-echo",
    slug: "echo",
    name: "ECHO",
    tagline: "Crowd and narrative analysis",
    description: "Socially aware and adaptive. ECHO reads sentiment and breadth, and leans contrarian when a move looks over-extended.",
    strategyType: "rule-based-sentiment",
    strategyVersion: "echo-v1.0.0",
    accentColor: "#EC4899",
    prefers: ["social-sentiment", "volume", "market-breadth"],
    active: true,
  },
];

export const assetBySymbol = (symbol: string): Asset | undefined => ASSETS.find((a) => a.symbol === symbol);
export const signalBySlug = (slug: string): Signal | undefined => SIGNALS.find((s) => s.slug === slug);
export const aiProfileBySlug = (slug: string): AIProfile | undefined => AI_PROFILES.find((a) => a.slug === slug);
