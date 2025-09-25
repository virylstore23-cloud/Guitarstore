create or replace view public.products_features as
select
  coalesce(nullif(upc,''), nullif(upc_code,''))::text                 as upc,
  coalesce(mesh, false)                                                as mesh,
  coalesce(usb_midi, false)                                            as usb_midi,
  coalesce(bluetooth_audio, false)                                     as bluetooth_audio,
  (
    select array_agg(distinct f)
    from (
      select jsonb_array_elements_text(
               case
                 when jsonb_typeof(features) = 'array' then features
                 else '[]'::jsonb
               end
             ) as f
    ) x
    where length(f) <= 24
  ) as features
from public.drum_kits
where coalesce(is_active, true) = true
  and coalesce(nullif(upc,''), nullif(upc_code,'')) is not null;

-- optional: let clients read the view
grant usage on schema public to anon, authenticated;
grant select on public.products_features to anon, authenticated;
