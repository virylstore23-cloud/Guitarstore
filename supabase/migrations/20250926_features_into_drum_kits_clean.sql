-- SR-16
update public.drum_kits
set features = '["MIDI I/O","4 Outs","Footswitch"]'::jsonb
where coalesce(upc, upc_code) = '0694318001004';

-- SR-18
update public.drum_kits
set features = '["Built-in FX engine","MIDI In/Out"]'::jsonb
where coalesce(upc, upc_code) = '00694318010570';

-- SamplePad 4
update public.drum_kits
set features = '["4 pads","SD card sample loading","USB/MIDI"]'::jsonb,
    usb_midi = true
where coalesce(upc, upc_code) = '0694318018774';

-- SamplePad Pro
update public.drum_kits
set features = '["8 dual-zone pads","Kick & hi-hat inputs","SD card slot","USB/MIDI"]'::jsonb,
    usb_midi = true
where coalesce(upc, upc_code) = '0694318016213';

-- Strike MultiPad
update public.drum_kits
set features = '["On-board FX processors","Sampler/Looper","USB Audio/MIDI"]'::jsonb,
    usb_midi = true
where coalesce(upc, upc_code) = '0694318023426';

-- Nitro Amp
update public.drum_kits
set features = '["3\" Woofer","70 W","Rack mount"]'::jsonb
where coalesce(upc, upc_code) = '0694318026496';

-- Strike Amp 12 MK2
update public.drum_kits
set features = '["2× XLR/TRS combo inputs","2500W peak","Bluetooth audio","Contour EQ / HPF","Ground-lift","XLR Out"]'::jsonb,
    bluetooth_audio = true
where coalesce(upc, upc_code) = '0694318024331';

-- Strike Amp 8 MK2
update public.drum_kits
set features = '["2× XLR/TRS combo inputs","2000W peak","Bluetooth audio","Contour EQ / HPF","Ground-lift","XLR Out"]'::jsonb,
    bluetooth_audio = true
where coalesce(upc, upc_code) = '0694318026212';

-- Nitro Max Kit
update public.drum_kits
set features = '["32 factory kits","All-mesh heads","Bluetooth audio"]'::jsonb,
    mesh = true, usb_midi = true, bluetooth_audio = true
where coalesce(upc, upc_code) = '0694318026236';

-- Nitro Pro
update public.drum_kits
set features = '["Bluetooth audio","USB/MIDI"]'::jsonb,
    mesh = true, usb_midi = true, bluetooth_audio = true
where coalesce(upc, upc_code) = '0694318026410';

-- Nitro Pro XL
update public.drum_kits
set features = '["Bluetooth audio","Dual-zone pads","USB/MIDI"]'::jsonb,
    mesh = true, usb_midi = true, bluetooth_audio = true
where coalesce(upc, upc_code) = '0694318026540';

-- Debut Kit
update public.drum_kits
set features = '["Complete starter bundle","Mesh pads"]'::jsonb,
    mesh = true, usb_midi = true
where coalesce(upc, upc_code) = '0694318025369';

-- Surge Mesh Special Edition
update public.drum_kits
set features = '["All-mesh heads"]'::jsonb,
    mesh = true, usb_midi = true
where coalesce(upc, upc_code) = '0694318025918';

-- Strata Core
update public.drum_kits
set features = '["3-zone cymbals","7\" touchscreen","BFD engine","Mesh pads"]'::jsonb,
    mesh = true, usb_midi = true, bluetooth_audio = true
where coalesce(upc, upc_code) = '0694318026106';

-- Strata Prime
update public.drum_kits
set features = '["440 kit pieces","75 preset drum sets","BFD sound engine"]'::jsonb,
    mesh = true, usb_midi = true, bluetooth_audio = true
where coalesce(upc, upc_code) = '0694318026137';

-- Strata Club (uses the new kiosk UPC)
update public.drum_kits
set features = '["7\" touchscreen","BFD3-based engine","Bluetooth 5.0","Triple-zone ARC cymbals"]'::jsonb,
    mesh = true, usb_midi = true, bluetooth_audio = true
where coalesce(upc, upc_code) = '0694318026694';
