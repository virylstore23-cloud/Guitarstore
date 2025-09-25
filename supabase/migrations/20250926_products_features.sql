create or replace view public.products_features as
select
  coalesce(nullif(upc,''), nullif(upc_code,''))::text as upc,
  coalesce(mesh,false)             as mesh,
  coalesce(usb_midi,false)         as usb_midi,
  coalesce(bluetooth_audio,false)  as bluetooth_audio,
  (
    select array_agg(distinct f)
    from unnest(coalesce(features, '{}'::text[])) f
    where length(f) <= 24
  ) as features
from public.drum_kits
where coalesce(is_active,true) = true
  and coalesce(nullif(upc,''), nullif(upc_code,'')) is not null;
