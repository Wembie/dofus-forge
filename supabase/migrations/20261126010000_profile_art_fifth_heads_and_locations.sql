-- Add fifth faces with default outfits and eight current-client landscapes.
-- Preserve saved profiles, earlier choices, ownership policies and catalog grants.
begin;

insert into public.profile_avatar_catalog (path) values
  ('/avatars/classes/v1/cra-look-5-m.webp'),
  ('/avatars/classes/v1/cra-look-5-f.webp'),
  ('/avatars/classes/v1/ecaflip-look-5-m.webp'),
  ('/avatars/classes/v1/ecaflip-look-5-f.webp'),
  ('/avatars/classes/v1/eniripsa-look-5-m.webp'),
  ('/avatars/classes/v1/eniripsa-look-5-f.webp'),
  ('/avatars/classes/v1/enutrof-look-5-m.webp'),
  ('/avatars/classes/v1/enutrof-look-5-f.webp'),
  ('/avatars/classes/v1/eliotrope-look-5-m.webp'),
  ('/avatars/classes/v1/eliotrope-look-5-f.webp'),
  ('/avatars/classes/v1/feca-look-5-m.webp'),
  ('/avatars/classes/v1/feca-look-5-f.webp'),
  ('/avatars/classes/v1/foggernaut-look-5-m.webp'),
  ('/avatars/classes/v1/foggernaut-look-5-f.webp'),
  ('/avatars/classes/v1/forgelance-look-5-m.webp'),
  ('/avatars/classes/v1/forgelance-look-5-f.webp'),
  ('/avatars/classes/v1/huppermage-look-5-m.webp'),
  ('/avatars/classes/v1/huppermage-look-5-f.webp'),
  ('/avatars/classes/v1/iop-look-5-m.webp'),
  ('/avatars/classes/v1/iop-look-5-f.webp'),
  ('/avatars/classes/v1/masqueraider-look-5-m.webp'),
  ('/avatars/classes/v1/masqueraider-look-5-f.webp'),
  ('/avatars/classes/v1/osamodas-look-5-m.webp'),
  ('/avatars/classes/v1/osamodas-look-5-f.webp'),
  ('/avatars/classes/v1/ouginak-look-5-m.webp'),
  ('/avatars/classes/v1/ouginak-look-5-f.webp'),
  ('/avatars/classes/v1/pandawa-look-5-m.webp'),
  ('/avatars/classes/v1/pandawa-look-5-f.webp'),
  ('/avatars/classes/v1/rogue-look-5-m.webp'),
  ('/avatars/classes/v1/rogue-look-5-f.webp'),
  ('/avatars/classes/v1/sacrier-look-5-m.webp'),
  ('/avatars/classes/v1/sacrier-look-5-f.webp'),
  ('/avatars/classes/v1/sadida-look-5-m.webp'),
  ('/avatars/classes/v1/sadida-look-5-f.webp'),
  ('/avatars/classes/v1/sram-look-5-m.webp'),
  ('/avatars/classes/v1/sram-look-5-f.webp'),
  ('/avatars/classes/v1/xelor-look-5-m.webp'),
  ('/avatars/classes/v1/xelor-look-5-f.webp')
on conflict (path) do nothing;

insert into public.profile_banner_catalog (path) values
  ('/banners/locations/v1/kontatras-castle.webp'),
  ('/banners/locations/v1/grobe.webp'),
  ('/banners/locations/v1/kefriho.webp'),
  ('/banners/locations/v1/petrified-forest.webp'),
  ('/banners/locations/v1/kanig-village.webp'),
  ('/banners/locations/v1/merkator.webp'),
  ('/banners/locations/v1/dramak.webp'),
  ('/banners/locations/v1/obscure-dimension.webp')
on conflict (path) do nothing;

commit;
