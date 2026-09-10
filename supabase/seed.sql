-- CALLSCORE — catalogue seed (idempotent)
-- Run after the migration: supabase db reset  (applies migrations + seed)
-- or: psql "$DATABASE_URL" -f supabase/seed.sql

insert into public.assets (id, symbol, name, provider_id, price_decimals, active) values
  ('asset-btc', 'BTC', 'Bitcoin', 'bitcoin', 2, true),
  ('asset-eth', 'ETH', 'Ethereum', 'ethereum', 2, true),
  ('asset-sol', 'SOL', 'Solana', 'solana', 3, true)
on conflict (id) do update set symbol = excluded.symbol, name = excluded.name, provider_id = excluded.provider_id, price_decimals = excluded.price_decimals, active = excluded.active;

insert into public.signals (id, slug, name, description, icon, accent_color, active) values
  ('sig-momentum', 'momentum', 'Momentum', 'Recent price acceleration. Is the move speeding up or fading?', 'TrendingUp', '#0E8F7E', true),
  ('sig-volume', 'volume', 'Volume', 'Trading activity behind the move. Strong volume can confirm a direction.', 'BarChart3', '#2563EB', true),
  ('sig-volatility', 'volatility', 'Volatility', 'How wide the price is swinging. High volatility means larger, less predictable moves.', 'Activity', '#B45309', true),
  ('sig-market-trend', 'market-trend', 'Market Trend', 'The broader multi-day direction of the asset.', 'LineChart', '#15803D', true),
  ('sig-social-sentiment', 'social-sentiment', 'Social Sentiment', 'The mood of social discussion around the asset.', 'MessageCircle', '#BE185D', true),
  ('sig-fear-greed', 'fear-greed', 'Fear & Greed', 'Overall crypto market emotion, from extreme fear to extreme greed.', 'Gauge', '#C2313F', true),
  ('sig-btc-dominance', 'bitcoin-dominance', 'Bitcoin Dominance', 'Bitcoin''s share of total crypto market value. Shifts hint at risk appetite.', 'PieChart', '#F59E0B', true),
  ('sig-market-breadth', 'market-breadth', 'Market Breadth', 'How many assets are moving in the same direction as the leaders.', 'Layers', '#7C3AED', true)
on conflict (id) do update set slug = excluded.slug, name = excluded.name, description = excluded.description, icon = excluded.icon, accent_color = excluded.accent_color, active = excluded.active;

insert into public.ai_profiles (id, slug, name, tagline, description, strategy_type, strategy_version, accent_color, prefers, active) values
  ('ai-oracle', 'oracle', 'ATLAS', 'Weighs trend, momentum and volume', 'Patient and systematic. ATLAS only commits when the multi-day trend, short-term momentum and volume agree, and sits Neutral when they don''t.', 'rule-based-synthesis', 'atlas-v1.0.0', '#C2410C', array['market-trend','momentum','volume'], true),
  ('ai-vector', 'vector', 'PULSE', 'Rides short-term momentum', 'Quick and decisive. PULSE follows the last one to three days of price action and is rarely Neutral.', 'rule-based-momentum', 'pulse-v1.0.0', '#B45309', array['momentum','market-trend','volatility'], true),
  ('ai-echo', 'echo', 'DRIFT', 'Reads sentiment, fades crowded moves', 'Contrarian by temperament. DRIFT follows the narrative until price runs too far from its weekly mean, then calls the reversal.', 'rule-based-sentiment', 'drift-v1.0.0', '#BE185D', array['social-sentiment','volume','market-breadth'], true)
on conflict (id) do update set slug = excluded.slug, name = excluded.name, tagline = excluded.tagline, description = excluded.description, strategy_type = excluded.strategy_type, strategy_version = excluded.strategy_version, accent_color = excluded.accent_color, prefers = excluded.prefers, active = excluded.active;

insert into public.badges (id, slug, name, description, icon) values
  ('badge-first-signal', 'first-signal', 'First Signal', 'Locked your first forecast.', 'Radio'),
  ('badge-three-day-streak', 'three-day-streak', 'Three-Day Streak', 'Three correct Rounds in a row.', 'Flame'),
  ('badge-five-day-streak', 'five-day-streak', 'Five-Day Streak', 'Five correct Rounds in a row.', 'Zap'),
  ('badge-perfect-week', 'perfect-week', 'Perfect Week', 'Seven correct Rounds in a row.', 'Crown'),
  ('badge-beat-the-ai', 'beat-the-ai', 'Beat the AI', 'Correct while every AI analyst in the Round was wrong.', 'Cpu'),
  ('badge-crowd-breaker', 'crowd-breaker', 'Crowd Breaker', 'Correct against the crowd majority.', 'Users'),
  ('badge-btc-specialist', 'btc-specialist', 'BTC Specialist', 'Five correct BTC Rounds.', 'Bitcoin'),
  ('badge-eth-specialist', 'eth-specialist', 'ETH Specialist', 'Five correct ETH Rounds.', 'Hexagon'),
  ('badge-sol-specialist', 'sol-specialist', 'SOL Specialist', 'Five correct SOL Rounds.', 'Sun'),
  ('badge-momentum-master', 'momentum-master', 'Momentum Master', 'Five correct forecasts citing Momentum.', 'TrendingUp'),
  ('badge-contrarian-win', 'contrarian-win', 'Contrarian Win', 'Correct with a direction fewer than 25% of the crowd chose.', 'GitBranch'),
  ('badge-founding-analyst', 'founding-analyst', 'Founding Caller', 'Locked a forecast in the first week of a season. Never awarded again.', 'Award')
on conflict (id) do update set slug = excluded.slug, name = excluded.name, description = excluded.description, icon = excluded.icon;

insert into public.levels (level, name, min_xp) values
  (1, 'Observer', 0), (2, 'Scout', 250), (3, 'Analyst', 750), (4, 'Strategist', 1500), (5, 'Signal Hunter', 3000), (6, 'Oracle', 6000)
on conflict (level) do update set name = excluded.name, min_xp = excluded.min_xp;

-- Example: a first published Round for tomorrow (00:00–12:00 lock, settles 24h after open).
-- Uncomment and adjust, or create Rounds from /admin.
-- insert into public.rounds (asset_id, title, slug, status, opens_at, locks_at, ends_at, ai_profile_ids)
-- values ('asset-btc', 'BTC Daily Round', 'btc-daily-first', 'upcoming',
--         date_trunc('day', now()) + interval '1 day', date_trunc('day', now()) + interval '1 day 12 hours', date_trunc('day', now()) + interval '2 day',
--         array['ai-oracle','ai-vector','ai-echo']);
