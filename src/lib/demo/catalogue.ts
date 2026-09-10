import type { Asset, ConstituentVersion, Narrative } from "@/lib/types";
import type { MockAssetConfig } from "@/lib/data/mock-provider";

interface NarrativeSeed {
  slug: Narrative["slug"];
  name: string;
  shortName: string;
  description: string;
  icon: string;
  accentColor: string;
  assets: { symbol: string; name: string; basePrice: number; baseVolume: number; volatility: number }[];
}

export const NARRATIVE_SEEDS: NarrativeSeed[] = [
  {
    slug: "ai",
    name: "Artificial Intelligence",
    shortName: "AI",
    description:
      "Tokens powering decentralized compute, model marketplaces, agent networks and data economies for machine learning.",
    icon: "BrainCircuit",
    accentColor: "#B6F36B",
    assets: [
      { symbol: "FET", name: "Fetch.ai", basePrice: 1.4, baseVolume: 120e6, volatility: 0.02 },
      { symbol: "RNDR", name: "Render", basePrice: 6.2, baseVolume: 90e6, volatility: 0.018 },
      { symbol: "TAO", name: "Bittensor", basePrice: 420, baseVolume: 60e6, volatility: 0.022 },
      { symbol: "AGIX", name: "SingularityNET", basePrice: 0.6, baseVolume: 40e6, volatility: 0.024 },
      { symbol: "OCEAN", name: "Ocean Protocol", basePrice: 0.55, baseVolume: 25e6, volatility: 0.021 },
    ],
  },
  {
    slug: "rwa",
    name: "Real World Assets",
    shortName: "RWA",
    description:
      "Protocols tokenizing treasuries, credit, commodities and other off-chain assets for on-chain settlement.",
    icon: "Landmark",
    accentColor: "#22D3EE",
    assets: [
      { symbol: "ONDO", name: "Ondo", basePrice: 0.95, baseVolume: 80e6, volatility: 0.016 },
      { symbol: "MKR", name: "Maker", basePrice: 1850, baseVolume: 70e6, volatility: 0.014 },
      { symbol: "POLYX", name: "Polymesh", basePrice: 0.32, baseVolume: 12e6, volatility: 0.02 },
      { symbol: "CFG", name: "Centrifuge", basePrice: 0.48, baseVolume: 8e6, volatility: 0.021 },
      { symbol: "PENDLE", name: "Pendle", basePrice: 3.8, baseVolume: 55e6, volatility: 0.019 },
    ],
  },
  {
    slug: "gaming",
    name: "Gaming",
    shortName: "Gaming",
    description: "Game economies, gaming-focused chains and in-game asset infrastructure.",
    icon: "Gamepad2",
    accentColor: "#FB7185",
    assets: [
      { symbol: "IMX", name: "Immutable", basePrice: 1.6, baseVolume: 45e6, volatility: 0.02 },
      { symbol: "GALA", name: "Gala", basePrice: 0.03, baseVolume: 60e6, volatility: 0.023 },
      { symbol: "AXS", name: "Axie Infinity", basePrice: 5.4, baseVolume: 35e6, volatility: 0.022 },
      { symbol: "RON", name: "Ronin", basePrice: 1.9, baseVolume: 20e6, volatility: 0.024 },
      { symbol: "BEAM", name: "Beam", basePrice: 0.02, baseVolume: 18e6, volatility: 0.026 },
    ],
  },
  {
    slug: "defi",
    name: "DeFi",
    shortName: "DeFi",
    description: "Decentralized exchanges, lending markets, liquid staking and yield infrastructure.",
    icon: "Coins",
    accentColor: "#8B5CF6",
    assets: [
      { symbol: "UNI", name: "Uniswap", basePrice: 8.1, baseVolume: 150e6, volatility: 0.016 },
      { symbol: "AAVE", name: "Aave", basePrice: 160, baseVolume: 110e6, volatility: 0.017 },
      { symbol: "LDO", name: "Lido DAO", basePrice: 1.7, baseVolume: 70e6, volatility: 0.018 },
      { symbol: "CRV", name: "Curve", basePrice: 0.42, baseVolume: 65e6, volatility: 0.02 },
      { symbol: "JUP", name: "Jupiter", basePrice: 0.9, baseVolume: 85e6, volatility: 0.021 },
    ],
  },
  {
    slug: "depin",
    name: "DePIN",
    shortName: "DePIN",
    description: "Decentralized physical infrastructure: wireless, storage, compute and sensor networks.",
    icon: "RadioTower",
    accentColor: "#F59E0B",
    assets: [
      { symbol: "HNT", name: "Helium", basePrice: 6.5, baseVolume: 30e6, volatility: 0.02 },
      { symbol: "FIL", name: "Filecoin", basePrice: 4.9, baseVolume: 140e6, volatility: 0.017 },
      { symbol: "AR", name: "Arweave", basePrice: 22, baseVolume: 40e6, volatility: 0.021 },
      { symbol: "IOTX", name: "IoTeX", basePrice: 0.045, baseVolume: 22e6, volatility: 0.022 },
      { symbol: "AKT", name: "Akash", basePrice: 3.1, baseVolume: 15e6, volatility: 0.024 },
    ],
  },
  {
    slug: "layer2",
    name: "Layer 2",
    shortName: "L2",
    description: "Rollups and scaling networks settling to Ethereum and other base layers.",
    icon: "Layers",
    accentColor: "#38BDF8",
    assets: [
      { symbol: "ARB", name: "Arbitrum", basePrice: 0.85, baseVolume: 200e6, volatility: 0.017 },
      { symbol: "OP", name: "Optimism", basePrice: 1.7, baseVolume: 150e6, volatility: 0.018 },
      { symbol: "STRK", name: "Starknet", basePrice: 0.6, baseVolume: 60e6, volatility: 0.021 },
      { symbol: "ZK", name: "ZKsync", basePrice: 0.17, baseVolume: 55e6, volatility: 0.022 },
      { symbol: "MNT", name: "Mantle", basePrice: 0.75, baseVolume: 45e6, volatility: 0.016 },
    ],
  },
  {
    slug: "privacy",
    name: "Privacy",
    shortName: "Privacy",
    description: "Confidential transactions, shielded pools and privacy-preserving computation.",
    icon: "ShieldCheck",
    accentColor: "#A3E635",
    assets: [
      { symbol: "XMR", name: "Monero", basePrice: 165, baseVolume: 50e6, volatility: 0.013 },
      { symbol: "ZEC", name: "Zcash", basePrice: 32, baseVolume: 40e6, volatility: 0.018 },
      { symbol: "SCRT", name: "Secret", basePrice: 0.35, baseVolume: 6e6, volatility: 0.022 },
      { symbol: "DASH", name: "Dash", basePrice: 28, baseVolume: 30e6, volatility: 0.017 },
      { symbol: "ROSE", name: "Oasis", basePrice: 0.08, baseVolume: 20e6, volatility: 0.021 },
    ],
  },
  {
    slug: "socialfi",
    name: "SocialFi",
    shortName: "SocialFi",
    description: "On-chain social graphs, creator tokens and decentralized identity networks.",
    icon: "MessageSquareHeart",
    accentColor: "#F472B6",
    assets: [
      { symbol: "DEGEN", name: "Degen", basePrice: 0.012, baseVolume: 25e6, volatility: 0.028 },
      { symbol: "FRIEND", name: "Friend.tech", basePrice: 0.9, baseVolume: 10e6, volatility: 0.03 },
      { symbol: "CYBER", name: "Cyber", basePrice: 3.2, baseVolume: 20e6, volatility: 0.025 },
      { symbol: "MASK", name: "Mask Network", basePrice: 2.6, baseVolume: 30e6, volatility: 0.022 },
      { symbol: "TON", name: "Toncoin", basePrice: 5.8, baseVolume: 180e6, volatility: 0.015 },
    ],
  },
  {
    slug: "memecoins",
    name: "Memecoins",
    shortName: "Memes",
    description: "Community-driven tokens where attention, not utility, drives flows.",
    icon: "PartyPopper",
    accentColor: "#FBBF24",
    assets: [
      { symbol: "DOGE", name: "Dogecoin", basePrice: 0.14, baseVolume: 700e6, volatility: 0.02 },
      { symbol: "SHIB", name: "Shiba Inu", basePrice: 0.000018, baseVolume: 300e6, volatility: 0.022 },
      { symbol: "PEPE", name: "Pepe", basePrice: 0.0000095, baseVolume: 400e6, volatility: 0.03 },
      { symbol: "WIF", name: "dogwifhat", basePrice: 2.1, baseVolume: 250e6, volatility: 0.033 },
      { symbol: "BONK", name: "Bonk", basePrice: 0.000021, baseVolume: 150e6, volatility: 0.031 },
    ],
  },
];

export function buildCatalogue(createdAt: string): {
  narratives: Narrative[];
  assets: Asset[];
  versions: ConstituentVersion[];
  mockConfigs: MockAssetConfig[];
} {
  const narratives: Narrative[] = [];
  const assets: Asset[] = [];
  const versions: ConstituentVersion[] = [];
  const mockConfigs: MockAssetConfig[] = [];
  for (const seed of NARRATIVE_SEEDS) {
    const id = `nar_${seed.slug}`;
    const versionId = `ncv_${seed.slug}_v1`;
    const weight = 1 / seed.assets.length;
    versions.push({
      id: versionId,
      narrativeId: id,
      version: 1,
      createdAt,
      note: "Initial equal-weight constituent set (weights capped at 35%).",
      constituents: seed.assets.map((a) => ({
        assetId: `ast_${a.symbol.toLowerCase()}`,
        symbol: a.symbol,
        name: a.name,
        weight,
      })),
    });
    narratives.push({
      id,
      slug: seed.slug,
      name: seed.name,
      shortName: seed.shortName,
      description: seed.description,
      icon: seed.icon,
      accentColor: seed.accentColor,
      active: true,
      currentConstituentVersionId: versionId,
    });
    for (const a of seed.assets) {
      assets.push({ id: `ast_${a.symbol.toLowerCase()}`, symbol: a.symbol, name: a.name });
      mockConfigs.push({
        symbol: a.symbol,
        narrativeSlug: seed.slug,
        basePrice: a.basePrice,
        baseVolume: a.baseVolume,
        volatility: a.volatility,
      });
    }
  }
  return { narratives, assets, versions, mockConfigs };
}
