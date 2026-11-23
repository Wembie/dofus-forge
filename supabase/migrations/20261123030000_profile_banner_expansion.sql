-- Add current-client location art without changing saved profile covers.
-- Existing catalog entries, grants and profile ownership policies are retained.
begin;

insert into public.profile_banner_catalog (path) values
  ('/banners/locations/v1/moon.webp'),
  ('/banners/locations/v1/wabbits.webp'),
  ('/banners/locations/v1/otomai.webp'),
  ('/banners/locations/v1/vulkania.webp'),
  ('/banners/locations/v1/tainela.webp'),
  ('/banners/locations/v1/koalaks.webp'),
  ('/banners/locations/v1/abraknid.webp'),
  ('/banners/locations/v1/minotoror.webp'),
  ('/banners/locations/v1/osavora.webp'),
  ('/banners/locations/v1/saharach.webp'),
  ('/banners/locations/v1/sarakech.webp'),
  ('/banners/locations/v1/albuera.webp'),
  ('/banners/locations/v1/ereboria.webp'),
  ('/banners/locations/v1/nawidad.webp'),
  ('/banners/locations/v1/pazcuak.webp'),
  ('/banners/locations/v1/dragocerdo.webp')
on conflict (path) do nothing;

commit;
