-- Add sixth faces with usual outfits and eight current-client landscapes.
-- Preserve saved profiles, previous catalog entries and existing permissions.
begin;

insert into public.profile_avatar_catalog (path) values
  ('/avatars/classes/v1/cra-look-6-m.webp'),
  ('/avatars/classes/v1/cra-look-6-f.webp'),
  ('/avatars/classes/v1/ecaflip-look-6-m.webp'),
  ('/avatars/classes/v1/ecaflip-look-6-f.webp'),
  ('/avatars/classes/v1/eniripsa-look-6-m.webp'),
  ('/avatars/classes/v1/eniripsa-look-6-f.webp'),
  ('/avatars/classes/v1/enutrof-look-6-m.webp'),
  ('/avatars/classes/v1/enutrof-look-6-f.webp'),
  ('/avatars/classes/v1/eliotrope-look-6-m.webp'),
  ('/avatars/classes/v1/eliotrope-look-6-f.webp'),
  ('/avatars/classes/v1/feca-look-6-m.webp'),
  ('/avatars/classes/v1/feca-look-6-f.webp'),
  ('/avatars/classes/v1/foggernaut-look-6-m.webp'),
  ('/avatars/classes/v1/foggernaut-look-6-f.webp'),
  ('/avatars/classes/v1/forgelance-look-6-m.webp'),
  ('/avatars/classes/v1/forgelance-look-6-f.webp'),
  ('/avatars/classes/v1/huppermage-look-6-m.webp'),
  ('/avatars/classes/v1/huppermage-look-6-f.webp'),
  ('/avatars/classes/v1/iop-look-6-m.webp'),
  ('/avatars/classes/v1/iop-look-6-f.webp'),
  ('/avatars/classes/v1/masqueraider-look-6-m.webp'),
  ('/avatars/classes/v1/masqueraider-look-6-f.webp'),
  ('/avatars/classes/v1/osamodas-look-6-m.webp'),
  ('/avatars/classes/v1/osamodas-look-6-f.webp'),
  ('/avatars/classes/v1/ouginak-look-6-m.webp'),
  ('/avatars/classes/v1/ouginak-look-6-f.webp'),
  ('/avatars/classes/v1/pandawa-look-6-m.webp'),
  ('/avatars/classes/v1/pandawa-look-6-f.webp'),
  ('/avatars/classes/v1/rogue-look-6-m.webp'),
  ('/avatars/classes/v1/rogue-look-6-f.webp'),
  ('/avatars/classes/v1/sacrier-look-6-m.webp'),
  ('/avatars/classes/v1/sacrier-look-6-f.webp'),
  ('/avatars/classes/v1/sadida-look-6-m.webp'),
  ('/avatars/classes/v1/sadida-look-6-f.webp'),
  ('/avatars/classes/v1/sram-look-6-m.webp'),
  ('/avatars/classes/v1/sram-look-6-f.webp'),
  ('/avatars/classes/v1/xelor-look-6-m.webp'),
  ('/avatars/classes/v1/xelor-look-6-f.webp')
on conflict (path) do nothing;

insert into public.profile_banner_catalog (path) values
  ('/banners/locations/v1/crocuzko.webp'),
  ('/banners/locations/v1/master-crow-library.webp'),
  ('/banners/locations/v1/giant-kralove.webp'),
  ('/banners/locations/v1/dopple-village.webp'),
  ('/banners/locations/v1/breeders-village.webp'),
  ('/banners/locations/v1/dantinea-palace.webp'),
  ('/banners/locations/v1/solar-tower.webp'),
  ('/banners/locations/v1/tortured-cemetery.webp')
on conflict (path) do nothing;

commit;
