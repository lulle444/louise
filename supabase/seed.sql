-- SIGNAL ARENA — catalogue seed (idempotent)
-- Run after the migration: supabase db reset  (applies migrations + seed)
-- or: psql "$DATABASE_URL" -f supabase/seed.sql

insert into public.assets (id, symbol, name, provider_id, price_decimals, active) values
  ('asset-btc', 'BTC', 'Bitcoin', 'bitcoin', 2, true),
  ('asset-eth', 'ETH', 'Ethereum', 'ethereum', 2, true),
  ('asset-sol', 'SOL', 'Solana', 'solana', 3, true)
on conflict (id) do update set symbol = excluded.symbol, name = excluded.name, provider_id = excluded.provider_id, price_decimals = excluded.price_decimals, active = excluded.active;

insert into public.signals (id, slug, name, description, icon, accent_color, active) values
  ('sig-momentum', 'momentum', 'Momentum', 'Recent price acceleration. Is the move speeding up or fading?', 'TrendingUp', '#21D4FD', true),
  ('sig-volume', 'volume', 'Volume', 'Trading activity behind the move. Strong volume can confirm a direction.', 'BarChart3', '#60A5FA', true),
  ('sig-volatility', 'volatility', 'Volatility', 'How wide the price is swinging. High volatility means larger, less predictable moves.', 'Activity', '#FBBF24', true),
  ('sig-market-trend', 'market-trend', 'Market Trend', 'The broader multi-day direction of the asset.', 'LineChart', '#34D399', true),
  ('sig-social-sentiment', 'social-sentiment', 'Social Sentiment', 'The mood of social discussion around the asset.', 'MessageCircle', '#F472B6', true),
  ('sig-fear-greed', 'fear-greed', 'Fear & Greed', 'Overall crypto market emotion, from extreme fear to extreme greed.', 'Gauge', '#FB7185', true),
  ('sig-btc-dominance', 'bitcoin-dominance', 'Bitcoin Dominance', 'Bitcoin''s share of total crypto market value. Shifts hint at risk appetite.', 'PieChart', '#F59E0B', true),
  ('sig-market-breadth', 'market-breadth', 'Market Breadth', 'How many assets are moving in the same direction as the leaders.', 'Layers', '#A78BFA', true)
on conflict (id) do update set slug = excluded.slug, name = excluded.name, description = excluded.description, icon = excluded.icon, accent_color = excluded.accent_color, active = excluded.active;

insert into public.ai_profiles (id, slug, name, tagline, description, strategy_type, strategy_version, accent_color, prefers, active) values
  ('ai-oracle', 'oracle', 'ORACLE', 'Balanced multi-signal synthesis', 'Measured and analytical. ORACLE weighs trend, momentum and volume together and only commits when the signals agree.', 'rule-based-synthesis', 'oracle-v1.0.0', '#8B5CF6', array['market-trend','momentum','volume'], true),
  ('ai-vector', 'vector', 'VECTOR', 'Momentum and directional trend', 'Fast, technical and decisive. VECTOR follows short-term momentum and is rarely Neutral.', 'rule-based-momentum', 'vector-v1.0.0', '#21D4FD', array['momentum','market-trend','volatility'], true),
  ('ai-echo', 'echo', 'ECHO', 'Crowd and narrative analysis', 'Socially aware and adaptive. ECHO reads sentiment and breadth, and leans contrarian when a move looks over-extended.', 'rule-based-sentiment', 'echo-v1.0.0', '#EC4899', array['social-sentiment','volume','market-breadth'], true)
on conflict (id) do update set slug = excluded.slug, name = excluded.name, tagline = excluded.tagline, description = excluded.description, strategy_type = excluded.strategy_type, strategy_version = excluded.strategy_version, accent_color = excluded.accent_color, prefers = excluded.prefers, active = excluded.active;

insert into public.badges (id, slug, name, description, icon) values
  ('badge-first-signal', 'first-signal', 'First Signal', 'Locked your first forecast.', 'Radio'),
  ('badge-three-day-streak', 'three-day-streak', 'Three-Day Streak', 'Three correct Battles in a row.', 'Flame'),
  ('badge-five-day-streak', 'five-day-streak', 'Five-Day Streak', 'Five correct Battles in a row.', 'Zap'),
  ('badge-perfect-week', 'perfect-week', 'Perfect Week', 'Seven correct Battles in a row.', 'Crown'),
  ('badge-beat-the-ai', 'beat-the-ai', 'Beat the AI', 'Correct while every AI analyst in the Battle was wrong.', 'Cpu'),
  ('badge-crowd-breaker', 'crowd-breaker', 'Crowd Breaker', 'Correct against the crowd majority.', 'Users'),
  ('badge-btc-specialist', 'btc-specialist', 'BTC Specialist', 'Five correct BTC Battles.', 'Bitcoin'),
  ('badge-eth-specialist', 'eth-specialist', 'ETH Specialist', 'Five correct ETH Battles.', 'Hexagon'),
  ('badge-sol-specialist', 'sol-specialist', 'SOL Specialist', 'Five correct SOL Battles.', 'Sun'),
  ('badge-momentum-master', 'momentum-master', 'Momentum Master', 'Five correct forecasts citing Momentum.', 'TrendingUp'),
  ('badge-contrarian-win', 'contrarian-win', 'Contrarian Win', 'Correct with a direction fewer than 25% of the crowd chose.', 'GitBranch'),
  ('badge-founding-analyst', 'founding-analyst', 'Founding Analyst', 'Locked a forecast in the first week of a season. Never awarded again.', 'Award')
on conflict (id) do update set slug = excluded.slug, name = excluded.name, description = excluded.description, icon = excluded.icon;

insert into public.levels (level, name, min_xp) values
  (1, 'Observer', 0), (2, 'Scout', 250), (3, 'Analyst', 750), (4, 'Strategist', 1500), (5, 'Signal Hunter', 3000), (6, 'Oracle', 6000)
on conflict (level) do update set name = excluded.name, min_xp = excluded.min_xp;

-- Example: a first published Battle for tomorrow (00:00–12:00 lock, settles 24h after open).
-- Uncomment and adjust, or create Battles from /admin.
-- insert into public.battles (asset_id, title, slug, status, opens_at, locks_at, ends_at, ai_profile_ids)
-- values ('asset-btc', 'BTC Daily Battle', 'btc-daily-first', 'upcoming',
--         date_trunc('day', now()) + interval '1 day', date_trunc('day', now()) + interval '1 day 12 hours', date_trunc('day', now()) + interval '2 day',
--         array['ai-oracle','ai-vector','ai-echo']);
