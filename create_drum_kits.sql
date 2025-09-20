create extension if not exists pgcrypto;

create table if not exists public.drum_kits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12,2),
  upc_code text,
  is_active boolean not null default true,
  stock_level integer default 0,
  contents jsonb not null default '[]'::jsonb,
  features jsonb not null default '[]'::jsonb,
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  detail_image_url text,
  on_demo boolean default false,
  on_demo_label text,
  slug text unique,
  primary_image_url text,
  category text,
  specs jsonb,
  module_engine text,
  kits_factory integer,
  kits_user integer,
  sounds integer,
  module_touchscreen_in integer,
  snare_in integer,
  snare_zones integer,
  toms_count integer,
  toms_sizes_in text[],
  kick_tower boolean,
  hihat_in integer,
  crash_count integer,
  ride_zones integer,
  bluetooth_audio boolean,
  usb_midi boolean,
  learning_block jsonb
);

-- RLS (public read active items)
alter table public.drum_kits enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='drum_kits'
      and policyname='Public read active drum kits'
  ) then
    execute $$create policy "Public read active drum kits"
             on public.drum_kits for select
             to anon using (is_active = true)$$;
  end if;
end$$;

-- Realtime
do $$ begin
  begin execute 'alter publication supabase_realtime add table public.drum_kits';
  exception when duplicate_object then null; end;
end $$;
