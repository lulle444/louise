/**
 * Learn page content: how to read each signal, and where the underlying data
 * lives. All links are to free, public, unaffiliated sources. No referral codes.
 */

export interface LearnLink {
  label: string;
  url: string;
  note: string;
}

export interface SignalGuide {
  slug: string;
  howToRead: string;
  bullishWhen: string;
  bearishWhen: string;
  trap: string;
  links: LearnLink[];
}

export const SIGNAL_GUIDES: SignalGuide[] = [
  {
    slug: "momentum",
    howToRead: "Momentum is the speed of the recent move. Compare the last one to three days against the previous week: is the move accelerating, flat, or fading?",
    bullishWhen: "Higher highs on consecutive days and RSI rising through the 50s without being stretched above 70.",
    bearishWhen: "Lower lows, RSI falling through 50, or a sharp move that stalls and reverses within a day.",
    trap: "Momentum works until it doesn't. A three-day surge is as likely to pause as to continue; check volume before you lean on it.",
    links: [
      { label: "TradingView: BTC chart", url: "https://www.tradingview.com/symbols/BTCUSD/", note: "Add RSI or MACD from the indicators menu." },
      { label: "TradingView: ETH chart", url: "https://www.tradingview.com/symbols/ETHUSD/", note: "" },
      { label: "TradingView: SOL chart", url: "https://www.tradingview.com/symbols/SOLUSD/", note: "" },
      { label: "What RSI measures", url: "https://www.tradingview.com/support/solutions/43000502338-relative-strength-index-rsi/", note: "Plain explanation of the most-used momentum gauge." },
    ],
  },
  {
    slug: "volume",
    howToRead: "Volume is how much was traded. It tells you whether a price move has participation behind it or is drifting on thin activity.",
    bullishWhen: "Price rises on rising volume. A breakout on the highest volume in a week is worth more than one on a quiet day.",
    bearishWhen: "Price rises on shrinking volume (buyers tiring), or falls on a volume spike (real selling).",
    trap: "Weekend volume is structurally low. Don't read a quiet Sunday as exhaustion.",
    links: [
      { label: "CoinGecko: Bitcoin", url: "https://www.coingecko.com/en/coins/bitcoin", note: "24h volume across exchanges; switch to ETH or SOL from the search." },
      { label: "CoinMarketCap", url: "https://coinmarketcap.com/", note: "Spot volume and 24h change per asset." },
      { label: "Coinglass", url: "https://www.coinglass.com/", note: "Derivatives volume, open interest and liquidations." },
    ],
  },
  {
    slug: "volatility",
    howToRead: "Volatility is how wide the daily swings are. High volatility means the neutral band is easy to break; low volatility means Neutral is a live option.",
    bullishWhen: "Volatility contracting after a decline, then expanding on an up day.",
    bearishWhen: "Volatility expanding on red days, especially with liquidations.",
    trap: "Volatility is direction-neutral. It tells you how far the price may move, not which way.",
    links: [
      { label: "Deribit DVOL (BTC)", url: "https://www.deribit.com/statistics/BTC/volatility-index", note: "Implied volatility from options, the market's own forecast of swing size." },
      { label: "TradingView: Bollinger Bands", url: "https://www.tradingview.com/support/solutions/43000501840-bollinger-bands-bb/", note: "Band width is a quick realised-volatility read." },
    ],
  },
  {
    slug: "market-trend",
    howToRead: "Trend is the multi-day direction. Where is price relative to its 7-day and 30-day average, and are the swing lows rising or falling?",
    bullishWhen: "Price above both averages with rising lows.",
    bearishWhen: "Price below both averages with lower highs.",
    trap: "Trend is the slowest signal. It's right most days and wrong exactly at the turns, which are the days everyone remembers.",
    links: [
      { label: "TradingView: BTC chart", url: "https://www.tradingview.com/symbols/BTCUSD/", note: "Add a 7 and 30 period moving average." },
      { label: "CoinGecko: 7-day and 30-day change", url: "https://www.coingecko.com/", note: "The table view shows 7d change for every asset." },
    ],
  },
  {
    slug: "social-sentiment",
    howToRead: "Sentiment is the mood of the discussion: how much people are talking, and how bullish the talk is.",
    bullishWhen: "Rising discussion volume with a positive tilt after a quiet period.",
    bearishWhen: "Euphoric sentiment at a price high, or capitulation language at a low (a contrarian read).",
    trap: "Sentiment lags price. By the time the timeline agrees, the move is often done.",
    links: [
      { label: "LunarCrush", url: "https://lunarcrush.com/", note: "Social volume and sentiment per asset; free tier." },
      { label: "Santiment", url: "https://santiment.net/", note: "Social trends and on-chain context; free tier." },
    ],
  },
  {
    slug: "fear-greed",
    howToRead: "A single 0 to 100 number blending volatility, volume, social activity and dominance into a mood gauge for the whole market.",
    bullishWhen: "Readings under 25 (extreme fear) that stop falling.",
    bearishWhen: "Readings over 75 (extreme greed) with momentum slowing.",
    trap: "Extreme readings can persist for weeks. It's a condition, not a timing signal.",
    links: [
      { label: "Alternative.me Fear & Greed Index", url: "https://alternative.me/crypto/fear-and-greed-index/", note: "The original daily index with history." },
      { label: "CoinMarketCap Fear & Greed", url: "https://coinmarketcap.com/charts/fear-and-greed-index/", note: "Alternative methodology, useful as a second opinion." },
    ],
  },
  {
    slug: "bitcoin-dominance",
    howToRead: "Bitcoin's share of total crypto market value. Rising dominance means money is favouring BTC over everything else.",
    bullishWhen: "For BTC: dominance rising with price. For ETH and SOL: dominance falling while BTC holds steady (rotation into alts).",
    bearishWhen: "For alts: dominance rising fast, which usually means risk-off flows out of smaller assets.",
    trap: "Dominance can rise because BTC goes up or because alts go down. Check which.",
    links: [
      { label: "TradingView: BTC.D", url: "https://www.tradingview.com/symbols/BTC.D/", note: "Dominance as a chart." },
      { label: "CoinGecko global charts", url: "https://www.coingecko.com/en/global-charts", note: "Market cap share over time." },
    ],
  },
  {
    slug: "market-breadth",
    howToRead: "Breadth is how many assets are moving with the leaders. A rally in BTC with 80 of the top 100 green is broad; BTC up alone is narrow.",
    bullishWhen: "Most of the top 100 green on the day, small caps participating.",
    bearishWhen: "Leaders up while most assets are red (narrow), or nearly everything red at once.",
    trap: "Breadth confirms; it rarely leads. Use it to grade the quality of a move, not to predict one.",
    links: [
      { label: "CoinGecko: top 100", url: "https://www.coingecko.com/", note: "Sort by 24h change and count the greens." },
      { label: "Coin360 heatmap", url: "https://coin360.com/", note: "One-glance breadth by market cap." },
    ],
  },
];

export const FORECASTING_RESOURCES: LearnLink[] = [
  { label: "What a 60% hit rate means", url: "https://en.wikipedia.org/wiki/Brier_score", note: "Brier scores: the standard way to grade probabilistic calls. Alphr uses simple hit rate on purpose; this is the deeper version." },
  { label: "Metaculus", url: "https://www.metaculus.com/", note: "Forecasting community with calibration tracking. Good practice for the habit of committing before you know." },
  { label: "Good Judgment Open", url: "https://www.gjopen.com/", note: "Open forecasting tournaments in the tradition of the Good Judgment Project." },
  { label: "Superforecasting (Tetlock & Gardner)", url: "https://en.wikipedia.org/wiki/Superforecasting", note: "Why some people are consistently better at this, and what they do differently: small updates, base rates, keeping score." },
  { label: "Calibration explained", url: "https://en.wikipedia.org/wiki/Calibration_(statistics)", note: "When you say 4/5 confidence, are you right 80% of the time? Your Call Profile tracks exactly this." },
];
