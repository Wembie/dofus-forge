-- Add fourth faces with default outfits and eight current-client landscapes.
-- Preserve saved profiles, earlier choices, ownership policies and catalog grants.
begin;

insert into public.profile_avatar_catalog (path) values
  ('/avatars/classes/v1/cra-look-4-m.webp'),
  ('/avatars/classes/v1/cra-look-4-f.webp'),
  ('/avatars/classes/v1/ecaflip-look-4-m.webp'),
  ('/avatars/classes/v1/ecaflip-look-4-f.webp'),
  ('/avatars/classes/v1/eniripsa-look-4-m.webp'),
  ('/avatars/classes/v1/eniripsa-look-4-f.webp'),
  ('/avatars/classes/v1/enutrof-look-4-m.webp'),
  ('/avatars/classes/v1/enutrof-look-4-f.webp'),
  ('/avatars/classes/v1/eliotrope-look-4-m.webp'),
  ('/avatars/classes/v1/eliotrope-look-4-f.webp'),
  ('/avatars/classes/v1/feca-look-4-m.webp'),
  ('/avatars/classes/v1/feca-look-4-f.webp'),
  ('/avatars/classes/v1/foggernaut-look-4-m.webp'),
  ('/avatars/classes/v1/foggernaut-look-4-f.webp'),
  ('/avatars/classes/v1/forgelance-look-4-m.webp'),
  ('/avatars/classes/v1/forgelance-look-4-f.webp'),
  ('/avatars/classes/v1/huppermage-look-4-m.webp'),
  ('/avatars/classes/v1/huppermage-look-4-f.webp'),
  ('/avatars/classes/v1/iop-look-4-m.webp'),
  ('/avatars/classes/v1/iop-look-4-f.webp'),
  ('/avatars/classes/v1/masqueraider-look-4-m.webp'),
  ('/avatars/classes/v1/masqueraider-look-4-f.webp'),
  ('/avatars/classes/v1/osamodas-look-4-m.webp'),
  ('/avatars/classes/v1/osamodas-look-4-f.webp'),
  ('/avatars/classes/v1/ouginak-look-4-m.webp'),
  ('/avatars/classes/v1/ouginak-look-4-f.webp'),
  ('/avatars/classes/v1/pandawa-look-4-m.webp'),
  ('/avatars/classes/v1/pandawa-look-4-f.webp'),
  ('/avatars/classes/v1/rogue-look-4-m.webp'),
  ('/avatars/classes/v1/rogue-look-4-f.webp'),
  ('/avatars/classes/v1/sacrier-look-4-m.webp'),
  ('/avatars/classes/v1/sacrier-look-4-f.webp'),
  ('/avatars/classes/v1/sadida-look-4-m.webp'),
  ('/avatars/classes/v1/sadida-look-4-f.webp'),
  ('/avatars/classes/v1/sram-look-4-m.webp'),
  ('/avatars/classes/v1/sram-look-4-f.webp'),
  ('/avatars/classes/v1/xelor-look-4-m.webp'),
  ('/avatars/classes/v1/xelor-look-4-f.webp')
on conflict (path) do nothing;

insert into public.profile_banner_catalog (path) values
  ('/banners/locations/v1/evil-forest.webp'),
  ('/banners/locations/v1/cania-lake.webp'),
  ('/banners/locations/v1/gisgoul.webp'),
  ('/banners/locations/v1/bwork-village.webp'),
  ('/banners/locations/v1/zoth-village.webp'),
  ('/banners/locations/v1/mount-torrid.webp'),
  ('/banners/locations/v1/buried-village.webp'),
  ('/banners/locations/v1/castaway-island.webp')
on conflict (path) do nothing;

commit;
