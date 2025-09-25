do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='drum_kits' and column_name='features'
  ) then
    alter table public.drum_kits add column features jsonb;
  end if;
end$$;

with payload as (
  select jsonb_array_elements($$REPLACE_ME_WITH_YOUR_JSON$$::jsonb)
) , rows as (
  select
    (j->>'upc')::text as upc,
    nullif(j->>'mesh','')::boolean as mesh,
    nullif(j->>'usb_midi','')::boolean as usb_midi,
    nullif(j->>'bluetooth_audio','')::boolean as bluetooth_audio,
    coalesce((select jsonb_agg(value) from jsonb_array_elements_text(j->'features')), '[]'::jsonb) as features
  from payload p(j)
)
update public.drum_kits d
set mesh            = coalesce(r.mesh, d.mesh),
    usb_midi        = coalesce(r.usb_midi, d.usb_midi),
    bluetooth_audio = coalesce(r.bluetooth_audio, d.bluetooth_audio),
    features        = r.features
from rows r
where coalesce(d.upc, d.upc_code) = r.upc;

grant usage on schema public to anon, authenticated;
grant select on public.products_features to anon, authenticated;
