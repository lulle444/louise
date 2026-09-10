-- Catalogue seed (narratives, assets, constituent versions, AI profiles, badges).
-- For the full deterministic demo world (users, races, snapshots, results) run:
--   npm run seed:supabase
-- which uses the service-role key and the same seed code as Demo Mode.

insert into ai_profiles (id, code, name, tagline, description, strategy_version, accent_color) values
  ('ai_rotator', 'ROTATOR', 'ROTATOR', 'Follows momentum and volume.', 'ROTATOR ranks narratives by momentum consistency (60%) and volume change (40%) from the pre-lock snapshot, drafts the top two as Leader and Challenger, and picks its Wildcard from the highest-momentum narrative outside the top four.', 'ai-rules-v1', '#22D3EE'),
  ('ai_atlas', 'ATLAS', 'ATLAS', 'Balances performance and breadth.', 'ATLAS blends normalized price performance (50%) with market breadth (50%). It drafts the top two as Leader and Challenger and picks the widest-breadth narrative ranked 5th or lower as its Wildcard.', 'ai-rules-v1', '#8B5CF6'),
  ('ai_nova', 'NOVA', 'NOVA', 'Searches for improving underdogs.', 'NOVA compares the pre-lock snapshot with the previous week''s snapshot. It drafts the two most-improved narratives as Leader and Challenger and picks the lowest-ranked narrative with a positive improvement as its Wildcard.', 'ai-rules-v1', '#FB7185')
on conflict (id) do nothing;

insert into badges (code, name, description, icon) values
  ('first_lineup', 'First Lineup', 'Locked your first Race lineup.', 'Flag'),
  ('winner_called', 'Winner Called', 'Your Leader finished 1st.', 'Trophy'),
  ('wildcard_master', 'Wildcard Master', 'A Wildcard gained four or more positions.', 'Sparkles'),
  ('perfect_podium', 'Perfect Podium', 'Leader 1st, Challenger top 3 and Wildcard up in a single Race.', 'Medal'),
  ('beat_the_ai', 'Beat the AI', 'Out-scored all three AI coaches in a settled Race.', 'Cpu'),
  ('crowd_breaker', 'Crowd Breaker', 'Beat the crowd consensus lineup with a different Leader.', 'Users'),
  ('ai_specialist', 'AI Specialist', 'Three correct calls involving the Artificial Intelligence narrative.', 'BrainCircuit'),
  ('rwa_specialist', 'RWA Specialist', 'Three correct calls involving the Real World Assets narrative.', 'Landmark'),
  ('gaming_specialist', 'Gaming Specialist', 'Three correct calls involving the Gaming narrative.', 'Gamepad2'),
  ('three_race_streak', 'Three-Race Streak', 'Locked lineups in three consecutive Races.', 'Flame')
on conflict (code) do nothing;
