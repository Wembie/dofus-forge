-- Add the expanded premium custom-rank badge finish catalog.
-- Apply after 20261018140000_expand_custom_rank_catalog.sql.
begin;

alter table public.custom_rank_benefits
  drop constraint if exists custom_rank_benefits_catalog_check;
alter table public.custom_rank_benefits
  add constraint custom_rank_benefits_catalog_check check (
    (benefit_key = 'profile_badge_style' and benefit_value in (
      'standard', 'founder', 'creator', 'royal', 'neon', 'crystal', 'holographic',
      'obsidian', 'minimal', 'arcane', 'vintage', 'champion', 'celestial', 'infernal',
      'emerald', 'sapphire', 'ruby', 'bronze', 'silver', 'platinum', 'carbon', 'aurora',
      'cosmic', 'toxic', 'gold_foil', 'royal_seal', 'blue_steel', 'copper', 'pearl',
      'marble', 'enamel', 'runic', 'dragonfire', 'frost', 'storm', 'oceanic', 'forest',
      'desert', 'sakura', 'twilight', 'bloodmoon', 'prismatic', 'glitch', 'matrix',
      'velvet', 'champagne', 'coral', 'lavender', 'moss', 'ancient', 'relic', 'crimson',
      'amethyst', 'opal', 'rose_gold', 'black_tie', 'obsidian_gold', 'sapphire_glass',
      'ruby_facet', 'emerald_facet', 'ice_crystal', 'solar_flare', 'nebula', 'void',
      'thunder', 'emberglow', 'soulfire', 'deep_space', 'royal_purple', 'monsoon',
      'bamboo', 'leatherbound', 'silk', 'porcelain', 'steel_engraved', 'constellation'
    ))
    or (benefit_key = 'build_limit' and (
      benefit_value ~ '^[1-9][0-9]{0,4}$' or benefit_value = '100000' or benefit_value = 'unlimited'
    ))
  );

commit;
