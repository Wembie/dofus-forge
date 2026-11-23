-- Add third faces with default outfits and eight current-client landscapes.
-- Preserve saved profiles, earlier choices, ownership policies and catalog grants.
begin;

insert into public.profile_avatar_catalog (path) values
  ('/avatars/classes/v1/cra-look-3-m.webp'),
  ('/avatars/classes/v1/cra-look-3-f.webp'),
  ('/avatars/classes/v1/ecaflip-look-3-m.webp'),
  ('/avatars/classes/v1/ecaflip-look-3-f.webp'),
  ('/avatars/classes/v1/eniripsa-look-3-m.webp'),
  ('/avatars/classes/v1/eniripsa-look-3-f.webp'),
  ('/avatars/classes/v1/enutrof-look-3-m.webp'),
  ('/avatars/classes/v1/enutrof-look-3-f.webp'),
  ('/avatars/classes/v1/eliotrope-look-3-m.webp'),
  ('/avatars/classes/v1/eliotrope-look-3-f.webp'),
  ('/avatars/classes/v1/feca-look-3-m.webp'),
  ('/avatars/classes/v1/feca-look-3-f.webp'),
  ('/avatars/classes/v1/foggernaut-look-3-m.webp'),
  ('/avatars/classes/v1/foggernaut-look-3-f.webp'),
  ('/avatars/classes/v1/forgelance-look-3-m.webp'),
  ('/avatars/classes/v1/forgelance-look-3-f.webp'),
  ('/avatars/classes/v1/huppermage-look-3-m.webp'),
  ('/avatars/classes/v1/huppermage-look-3-f.webp'),
  ('/avatars/classes/v1/iop-look-3-m.webp'),
  ('/avatars/classes/v1/iop-look-3-f.webp'),
  ('/avatars/classes/v1/masqueraider-look-3-m.webp'),
  ('/avatars/classes/v1/masqueraider-look-3-f.webp'),
  ('/avatars/classes/v1/osamodas-look-3-m.webp'),
  ('/avatars/classes/v1/osamodas-look-3-f.webp'),
  ('/avatars/classes/v1/ouginak-look-3-m.webp'),
  ('/avatars/classes/v1/ouginak-look-3-f.webp'),
  ('/avatars/classes/v1/pandawa-look-3-m.webp'),
  ('/avatars/classes/v1/pandawa-look-3-f.webp'),
  ('/avatars/classes/v1/rogue-look-3-m.webp'),
  ('/avatars/classes/v1/rogue-look-3-f.webp'),
  ('/avatars/classes/v1/sacrier-look-3-m.webp'),
  ('/avatars/classes/v1/sacrier-look-3-f.webp'),
  ('/avatars/classes/v1/sadida-look-3-m.webp'),
  ('/avatars/classes/v1/sadida-look-3-f.webp'),
  ('/avatars/classes/v1/sram-look-3-m.webp'),
  ('/avatars/classes/v1/sram-look-3-f.webp'),
  ('/avatars/classes/v1/xelor-look-3-m.webp'),
  ('/avatars/classes/v1/xelor-look-3-f.webp')
on conflict (path) do nothing;

insert into public.profile_banner_catalog (path) values
  ('/banners/locations/v1/amakna-castle.webp'),
  ('/banners/locations/v1/trool-fair.webp'),
  ('/banners/locations/v1/dragoeuf.webp'),
  ('/banners/locations/v1/nimotopia.webp'),
  ('/banners/locations/v1/akwadala.webp'),
  ('/banners/locations/v1/feudala.webp'),
  ('/banners/locations/v1/terrdala.webp'),
  ('/banners/locations/v1/aerdala.webp')
on conflict (path) do nothing;

commit;
