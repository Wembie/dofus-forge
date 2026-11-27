-- Additive catalog expansion: keep existing claims and milestone rows intact.
begin;
insert into public.exclusive_rewards (slug, threshold, sort_order) values
  ('joris', 14, 12),
  ('atcham', 21, 14),
  ('bakara', 45, 22),
  ('jahash', 60, 24),
  ('otomai', 90, 26),
  ('bakara_tipsy', 90, 27),
  ('bakara_drunk_book', 120, 31),
  ('dathura', 150, 32),
  ('bakara_drunk_lecture', 180, 33),
  ('djaul', 200, 34),
  ('bakara_drunk_toast', 240, 35),
  ('jiva', 270, 36)
on conflict (slug) do nothing;
commit;
