-- Ensure features column exists (safe to re-run)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='drum_kits' and column_name='features'
  ) then
    alter table public.drum_kits add column features jsonb;
  end if;
end$$;

-- Load your JSON and update matching rows by UPC (coalesce(upc, upc_code))
with payload as (
  select jsonb_array_elements($$[
  {
    "upc": "00694318010570",
    "mesh": false,
    "usb_midi": false,
    "bluetooth_audio": false,
    "features": ["Built-in FX engine","MIDI In/Out"]
  },
  {
    "upc": "0694318001004",
    "mesh": false,
    "usb_midi": false,
    "bluetooth_audio": false,
    "features": ["4 Outs","Footswitch","MIDI I/O"]
  },
  {
    "upc": "0694318016213",
    "mesh": false,
    "usb_midi": true,
    "bluetooth_audio": false,
    "features": ["8 dual-zone pads","Kick & hi-hat inputs","SD card slot","USB/MIDI"]
  },
  {
    "upc": "0694318016398",
    "mesh": false,
    "usb_midi": false,
    "bluetooth_audio": false,
    "features": ["40 mm","98 dB","Over-ear"]
  },
  {
    "upc": "0694318018774",
    "mesh": false,
    "usb_midi": true,
    "bluetooth_audio": false,
    "features": ["4 pads","SD card sample loading","USB/MIDI"]
  },
  {
    "upc": "0694318023419",
    "mesh": false,
    "usb_midi": false,
    "bluetooth_audio": false,
    "features": ["38 cm Arm","Ball-joint","Clamp + boom"]
  },
  {
    "upc": "0694318023426",
    "mesh": false,
    "usb_midi": true,
    "bluetooth_audio": false,
    "features": ["On-board FX processors","Sampler/Looper","USB Audio/MIDI"]
  },
  {
    "upc": "0694318024157",
    "mesh": false,
    "usb_midi": true,
    "bluetooth_audio": false,
    "features": ["300+ sounds","All-mesh heads","Velocity sensitive pads"]
  },
  {
    "upc": "0694318024331",
    "mesh": false,
    "usb_midi": false,
    "bluetooth_audio": true,
    "features": ["2× XLR/TRS combo inputs","2500W peak","Bluetooth audio","Contour EQ / HPF","Ground-lift","XLR Out"]
  },
  {
    "upc": "0694318025000",
    "mesh": true,
    "usb_midi": true,
    "bluetooth_audio": true,
    "features": ["60 preset kits","9-piece mesh kit","Metronome/recording","USB/MIDI"]
  },
  {
    "upc": "0694318025369",
    "mesh": true,
    "usb_midi": true,
    "bluetooth_audio": false,
    "features": ["Complete starter bundle","Mesh pads"]
  },
  {
    "upc": "0694318025918",
    "mesh": true,
    "usb_midi": true,
    "bluetooth_audio": false,
    "features": ["All-mesh heads"]
  },
  {
    "upc": "0694318026106",
    "mesh": true,
    "usb_midi": true,
    "bluetooth_audio": true,
    "features": ["3-zone cymbals","7\" touchscreen","BFD engine","Mesh pads"]
  },
  {
    "upc": "0694318026137",
    "mesh": true,
    "usb_midi": true,
    "bluetooth_audio": true,
    "features": ["440 kit pieces","75 preset drum sets","BFD sound engine"]
  },
  {
    "upc": "0694318026212",
    "mesh": false,
    "usb_midi": false,
    "bluetooth_audio": true,
    "features": ["2× XLR/TRS combo inputs","2000W peak","Bluetooth audio","Contour EQ / HPF","Ground-lift","XLR Out"]
  },
  {
    "upc": "0694318026236",
    "mesh": true,
    "usb_midi": true,
    "bluetooth_audio": true,
    "features": ["32 factory kits","All-mesh heads","Bluetooth audio"]
  },
  {
    "upc": "0694318026243",
    "mesh": false,
    "usb_midi": false,
    "bluetooth_audio": false,
    "features": ["All required mounts","Connection cable","Extra cymbal pad","Extra tom pad"]
  },
  {
    "upc": "0694318026410",
    "mesh": true,
    "usb_midi": true,
    "bluetooth_audio": true,
    "features": ["Bluetooth audio","USB/MIDI"]
  },
  {
    "upc": "0694318026496",
    "mesh": false,
    "usb_midi": false,
    "bluetooth_audio": false,
    "features": ["3\" Woofer","70 W","Rack mount"]
  },
  {
    "upc": "0694318026540",
    "mesh": true,
    "usb_midi": true,
    "bluetooth_audio": true,
    "features": ["Bluetooth audio","Dual-zone pads","USB/MIDI"]
  },
  {
    "upc": "0694318026694",
    "mesh": true,
    "usb_midi": true,
    "bluetooth_audio": true,
    "features": ["7\" touchscreen","BFD3-based engine","Bluetooth 5.0","Triple-zone ARC cymbals"]
  }
]$$::jsonb)
) 
, rows as (
  select
    (j->>'upc')::text                                        as upc,
    nullif(j->>'mesh','')::boolean                           as mesh,
    nullif(j->>'usb_midi','')::boolean                       as usb_midi,
    nullif(j->>'bluetooth_audio','')::boolean                as bluetooth_audio,
    coalesce(
      (select jsonb_agg(value) from jsonb_array_elements_text(j->'features')),
      '[]'::jsonb
    )                                                        as features
  from payload p(j)
)
update public.drum_kits d
set mesh            = coalesce(r.mesh, d.mesh),
    usb_midi        = coalesce(r.usb_midi, d.usb_midi),
    bluetooth_audio = coalesce(r.bluetooth_audio, d.bluetooth_audio),
    features        = r.features
from rows r
where coalesce(d.upc, d.upc_code) = r.upc;

-- Re-grant read access (idempotent)
grant usage on schema public to anon, authenticated;
grant select on public.products_features to anon, authenticated;
