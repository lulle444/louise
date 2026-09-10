import type { MarketDataProvider, SeriesPoint } from "./provider";
import { isValidPoint } from "./provider";

/**
 * Optional live provider backed by CoinGecko's market_chart/range endpoint.
 * Only used when MARKET_DATA_API_KEY is configured and Demo Mode is off.
 * Results are cached in memory per (symbol, window) for 10 minutes.
 */
const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", FET: "fetch-ai", RNDR: "render-token", TAO: "bittensor",
  AGIX: "singularitynet", OCEAN: "ocean-protocol", ONDO: "ondo-finance", MKR: "maker", POLYX: "polymesh",
  CFG: "centrifuge", PENDLE: "pendle", IMX: "immutable-x", GALA: "gala", AXS: "axie-infinity", RON: "ronin",
  BEAM: "beam-2", UNI: "uniswap", AAVE: "aave", LDO: "lido-dao", CRV: "curve-dao-token", JUP: "jupiter-exchange-solana",
  HNT: "helium", FIL: "filecoin", AR: "arweave", IOTX: "iotex", AKT: "akash-network", ARB: "arbitrum",
  OP: "optimism", STRK: "starknet", ZK: "zksync", MNT: "mantle", XMR: "monero", ZEC: "zcash", SCRT: "secret",
  DASH: "dash", ROSE: "oasis-network", DEGEN: "degen-base", FRIEND: "friend-tech", CYBER: "cyberconnect",
  MASK: "mask-network", TON: "the-open-network", DOGE: "dogecoin", SHIB: "shiba-inu", PEPE: "pepe",
  WIF: "dogwifcoin", BONK: "bonk",
};

const cache = new Map<string, { at: number; points: SeriesPoint[] }>();
const TTL_MS = 10 * 60 * 1000;

export class CoinGeckoProvider implements MarketDataProvider {
  readonly name = "coingecko";
  readonly isLive = true;
  constructor(private apiKey: string) {}

  async getSeries(symbol: string, fromIso: string, toIso: string): Promise<SeriesPoint[]> {
    const id = COIN_IDS[symbol];
    if (!id) return [];
    const key = `${symbol}:${fromIso}:${toIso}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.points;

    const from = Math.floor(Date.parse(fromIso) / 1000);
    const to = Math.floor(Date.parse(toIso) / 1000);
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`;
    const res = await fetch(url, { headers: { "x-cg-demo-api-key": this.apiKey }, next: { revalidate: 600 } });
    if (!res.ok) throw new Error(`CoinGecko ${res.status} for ${symbol}`);
    const json = (await res.json()) as { prices: [number, number][]; total_volumes: [number, number][] };
    const volumes = new Map(json.total_volumes.map(([t, v]) => [t, v]));
    const points = json.prices
      .map(([t, close]) => ({ t: new Date(t).toISOString(), close, volume: volumes.get(t) ?? 0 }))
      .filter(isValidPoint);
    cache.set(key, { at: Date.now(), points });
    return points;
  }
}
