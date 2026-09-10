-- Callscore rebrand: AI analyst identities and signal accent colours.
-- Ids and slugs are unchanged so existing forecasts keep their references.
update public.ai_profiles set name = 'ATLAS', tagline = 'Weighs trend, momentum and volume',
  description = 'Patient and systematic. ATLAS only commits when the multi-day trend, short-term momentum and volume agree, and sits Neutral when they don''t.',
  strategy_version = 'atlas-v1.0.0', accent_color = '#C2410C' where id = 'ai-oracle';
update public.ai_profiles set name = 'PULSE', tagline = 'Rides short-term momentum',
  description = 'Quick and decisive. PULSE follows the last one to three days of price action and is rarely Neutral.',
  strategy_version = 'pulse-v1.0.0', accent_color = '#B45309' where id = 'ai-vector';
update public.ai_profiles set name = 'DRIFT', tagline = 'Reads sentiment, fades crowded moves',
  description = 'Contrarian by temperament. DRIFT follows the narrative until price runs too far from its weekly mean, then calls the reversal.',
  strategy_version = 'drift-v1.0.0', accent_color = '#BE185D' where id = 'ai-echo';

update public.signals set accent_color = c.colour from (values
  ('momentum', '#0E8F7E'), ('volume', '#2563EB'), ('volatility', '#B45309'), ('market-trend', '#15803D'),
  ('social-sentiment', '#BE185D'), ('fear-greed', '#C2313F'), ('bitcoin-dominance', '#D97706'), ('market-breadth', '#7C3AED')
) as c(slug, colour) where signals.slug = c.slug;

update public.badges set name = 'Founding Caller' where id = 'badge-founding-analyst';
-- Existing auto-scheduled titles
update public.battles set title = replace(title, 'Daily Battle', 'Daily Round') where title like '%Daily Battle%';
