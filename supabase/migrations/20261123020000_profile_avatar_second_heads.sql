-- Expand the approved collection with second faces and default outfits.
-- Existing avatars, profiles, grants and ownership policies remain unchanged.
begin;

insert into public.profile_avatar_catalog (path) values
  ('/avatars/classes/v1/cra-look-2-m.webp'),
  ('/avatars/classes/v1/cra-look-2-f.webp'),
  ('/avatars/classes/v1/ecaflip-look-2-m.webp'),
  ('/avatars/classes/v1/ecaflip-look-2-f.webp'),
  ('/avatars/classes/v1/eniripsa-look-2-m.webp'),
  ('/avatars/classes/v1/eniripsa-look-2-f.webp'),
  ('/avatars/classes/v1/enutrof-look-2-m.webp'),
  ('/avatars/classes/v1/enutrof-look-2-f.webp'),
  ('/avatars/classes/v1/eliotrope-look-2-m.webp'),
  ('/avatars/classes/v1/eliotrope-look-2-f.webp'),
  ('/avatars/classes/v1/feca-look-2-m.webp'),
  ('/avatars/classes/v1/feca-look-2-f.webp'),
  ('/avatars/classes/v1/foggernaut-look-2-m.webp'),
  ('/avatars/classes/v1/foggernaut-look-2-f.webp'),
  ('/avatars/classes/v1/forgelance-look-2-m.webp'),
  ('/avatars/classes/v1/forgelance-look-2-f.webp'),
  ('/avatars/classes/v1/huppermage-look-2-m.webp'),
  ('/avatars/classes/v1/huppermage-look-2-f.webp'),
  ('/avatars/classes/v1/iop-look-2-m.webp'),
  ('/avatars/classes/v1/iop-look-2-f.webp'),
  ('/avatars/classes/v1/masqueraider-look-2-m.webp'),
  ('/avatars/classes/v1/masqueraider-look-2-f.webp'),
  ('/avatars/classes/v1/osamodas-look-2-m.webp'),
  ('/avatars/classes/v1/osamodas-look-2-f.webp'),
  ('/avatars/classes/v1/ouginak-look-2-m.webp'),
  ('/avatars/classes/v1/ouginak-look-2-f.webp'),
  ('/avatars/classes/v1/pandawa-look-2-m.webp'),
  ('/avatars/classes/v1/pandawa-look-2-f.webp'),
  ('/avatars/classes/v1/rogue-look-2-m.webp'),
  ('/avatars/classes/v1/rogue-look-2-f.webp'),
  ('/avatars/classes/v1/sacrier-look-2-m.webp'),
  ('/avatars/classes/v1/sacrier-look-2-f.webp'),
  ('/avatars/classes/v1/sadida-look-2-m.webp'),
  ('/avatars/classes/v1/sadida-look-2-f.webp'),
  ('/avatars/classes/v1/sram-look-2-m.webp'),
  ('/avatars/classes/v1/sram-look-2-f.webp'),
  ('/avatars/classes/v1/xelor-look-2-m.webp'),
  ('/avatars/classes/v1/xelor-look-2-f.webp')
on conflict (path) do nothing;

commit;
