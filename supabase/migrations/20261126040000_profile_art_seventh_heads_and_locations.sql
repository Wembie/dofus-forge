-- Add seventh faces with usual outfits and eight current-client landscapes.
-- Preserve saved profiles, previous catalog entries and existing permissions.
begin;

insert into public.profile_avatar_catalog (path) values
  ('/avatars/classes/v1/cra-look-7-m.webp'),
  ('/avatars/classes/v1/cra-look-7-f.webp'),
  ('/avatars/classes/v1/ecaflip-look-7-m.webp'),
  ('/avatars/classes/v1/ecaflip-look-7-f.webp'),
  ('/avatars/classes/v1/eniripsa-look-7-m.webp'),
  ('/avatars/classes/v1/eniripsa-look-7-f.webp'),
  ('/avatars/classes/v1/enutrof-look-7-m.webp'),
  ('/avatars/classes/v1/enutrof-look-7-f.webp'),
  ('/avatars/classes/v1/eliotrope-look-7-m.webp'),
  ('/avatars/classes/v1/eliotrope-look-7-f.webp'),
  ('/avatars/classes/v1/feca-look-7-m.webp'),
  ('/avatars/classes/v1/feca-look-7-f.webp'),
  ('/avatars/classes/v1/foggernaut-look-7-m.webp'),
  ('/avatars/classes/v1/foggernaut-look-7-f.webp'),
  ('/avatars/classes/v1/forgelance-look-7-m.webp'),
  ('/avatars/classes/v1/forgelance-look-7-f.webp'),
  ('/avatars/classes/v1/huppermage-look-7-m.webp'),
  ('/avatars/classes/v1/huppermage-look-7-f.webp'),
  ('/avatars/classes/v1/iop-look-7-m.webp'),
  ('/avatars/classes/v1/iop-look-7-f.webp'),
  ('/avatars/classes/v1/masqueraider-look-7-m.webp'),
  ('/avatars/classes/v1/masqueraider-look-7-f.webp'),
  ('/avatars/classes/v1/osamodas-look-7-m.webp'),
  ('/avatars/classes/v1/osamodas-look-7-f.webp'),
  ('/avatars/classes/v1/ouginak-look-7-m.webp'),
  ('/avatars/classes/v1/ouginak-look-7-f.webp'),
  ('/avatars/classes/v1/pandawa-look-7-m.webp'),
  ('/avatars/classes/v1/pandawa-look-7-f.webp'),
  ('/avatars/classes/v1/rogue-look-7-m.webp'),
  ('/avatars/classes/v1/rogue-look-7-f.webp'),
  ('/avatars/classes/v1/sacrier-look-7-m.webp'),
  ('/avatars/classes/v1/sacrier-look-7-f.webp'),
  ('/avatars/classes/v1/sadida-look-7-m.webp'),
  ('/avatars/classes/v1/sadida-look-7-f.webp'),
  ('/avatars/classes/v1/sram-look-7-m.webp'),
  ('/avatars/classes/v1/sram-look-7-f.webp'),
  ('/avatars/classes/v1/xelor-look-7-m.webp'),
  ('/avatars/classes/v1/xelor-look-7-f.webp')
on conflict (path) do nothing;

insert into public.profile_banner_catalog (path) values
  ('/banners/locations/v1/bworker-cave.webp'),
  ('/banners/locations/v1/kimbo-canopy.webp'),
  ('/banners/locations/v1/tynril-lab.webp'),
  ('/banners/locations/v1/ougah-temple.webp'),
  ('/banners/locations/v1/royalmouth-greenhouse.webp'),
  ('/banners/locations/v1/obsidemon-hypogeum.webp'),
  ('/banners/locations/v1/bethel-tower.webp'),
  ('/banners/locations/v1/torkelonia-sanctuary.webp')
on conflict (path) do nothing;

commit;
