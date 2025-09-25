-- Give Strata Club a unique kiosk UPC; leave upc_code intact.
update public.drum_kits
set upc = '0694318026694'
where slug = 'strata-club';

-- Safety: if any row still has the old duplicate in upc (not upc_code), clean it.
update public.drum_kits
set upc = '0694318026694'
where coalesce(upc, '') = '0694318026205'
  and slug = 'strata-club';

-- Keep read permissions (no-op if already granted)
grant usage on schema public to anon, authenticated;
grant select on public.products_features to anon, authenticated;
