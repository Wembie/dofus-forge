-- Expand the curated icon set and premium badge finishes for custom ranks.
-- Apply after 20261018130000_custom_rank_customization.sql.
begin;

alter table public.custom_rank_definitions
  drop constraint if exists custom_rank_definitions_icon_check;
alter table public.custom_rank_definitions
  add constraint custom_rank_definitions_icon_check check (icon in (
    'alarm_clock', 'anvil', 'aperture', 'award', 'axe', 'badge', 'badge_alert',
    'badge_cent', 'badge_check', 'badge_plus', 'bell', 'bird', 'blocks', 'book_marked',
    'book_open', 'bot', 'briefcase', 'brush', 'bug', 'building', 'cable', 'camera',
    'candy', 'castle', 'cat', 'chart', 'chess_king', 'circle_dollar', 'circle_gauge',
    'circle_star', 'clapperboard', 'cloud_lightning', 'cloud_moon', 'cloud_sun',
    'cloud_sun_rain', 'club', 'clover', 'code', 'coffee', 'cog', 'coins', 'command',
    'compass', 'cpu', 'crosshair', 'crown', 'cylinder', 'dna', 'door', 'egg', 'eye',
    'factory', 'feather', 'file_badge', 'fingerprint', 'flag', 'flame', 'flame_kindling',
    'flask', 'flask_round', 'flower', 'footprints', 'gamepad', 'gem', 'ghost', 'gift',
    'glasses', 'globe', 'graduation_cap', 'guitar', 'hammer', 'hand_coins', 'handshake',
    'headphones', 'headset', 'heart', 'heart_handshake', 'heart_pulse', 'house',
    'infinity', 'joystick', 'key', 'keyboard', 'landmark', 'lamp', 'lamp_desk', 'leaf',
    'lightbulb', 'medal', 'microscope', 'moon', 'moon_star', 'mountain', 'mountain_snow',
    'music', 'network', 'orbit', 'palette', 'panel_top', 'paw', 'piggy_bank', 'pickaxe',
    'puzzle', 'rabbit', 'radio', 'rocket', 'satellite', 'scissors', 'scroll', 'shield',
    'shield_check', 'shield_ellipsis', 'ship', 'shopping_bag', 'shovel', 'skull',
    'snowflake', 'sparkle', 'sparkles', 'sprout', 'squirrel', 'star', 'sun', 'sword',
    'swords', 'target', 'telescope', 'tent_tree', 'ticket', 'tree', 'trophy', 'turtle',
    'umbrella', 'users', 'wand', 'waves', 'wind', 'wine', 'wrench', 'zap'
  ));

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
      'velvet', 'champagne', 'coral', 'lavender', 'moss', 'ancient', 'relic', 'crimson'
    ))
    or (benefit_key = 'build_limit' and (
      benefit_value ~ '^[1-9][0-9]{0,4}$' or benefit_value = '100000' or benefit_value = 'unlimited'
    ))
  );

commit;
