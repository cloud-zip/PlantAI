-- Smart Plant Care Dashboard — ESP32/Supabase MVP schema
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Demo Plant',
  type text not null default 'Tomato',
  region_city text,
  region_state text,
  region_country text default 'India',
  created_at timestamptz not null default now()
);

create table if not exists public.devices (
  id text primary key,
  plant_id uuid references public.plants(id) on delete set null,
  name text not null default 'ESP32 Field Device',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists public.sensor_readings (
  id bigint generated always as identity primary key,
  device_id text references public.devices(id) on delete set null,
  plant_id uuid references public.plants(id) on delete set null,
  temperature_c numeric,
  humidity_percent numeric,
  soil_moisture_raw integer,
  soil_moisture_percent integer check (soil_moisture_percent between 0 and 100),
  soil_sensor_type text,
  npk_n integer,
  npk_p integer,
  npk_k integer,
  npk_source text,
  relay_motor_on boolean default false,
  recorded_at timestamptz not null default now()
);

create table if not exists public.relay_commands (
  id uuid primary key default gen_random_uuid(),
  device_id text references public.devices(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  action text not null check (action in ('on', 'off')),
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 3600),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'executed', 'rejected', 'expired')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  executed_at timestamptz
);

create index if not exists idx_sensor_readings_device_time
  on public.sensor_readings(device_id, recorded_at desc);

create index if not exists idx_sensor_readings_plant_time
  on public.sensor_readings(plant_id, recorded_at desc);

create index if not exists idx_relay_commands_device_status_time
  on public.relay_commands(device_id, status, created_at asc);

-- Demo seed. Change plant details later in your app.
insert into public.plants (id, name, type, region_city, region_state, region_country)
values ('00000000-0000-0000-0000-000000000001', 'Demo Tomato', 'Tomato', 'Patna', 'Bihar', 'India')
on conflict (id) do nothing;

insert into public.devices (id, plant_id, name, enabled)
values ('esp32-field-001', '00000000-0000-0000-0000-000000000001', 'ESP32 Prototype', true)
on conflict (id) do update set
  plant_id = excluded.plant_id,
  enabled = true;

-- RLS: keep enabled. Frontend policies can be added later with Supabase Auth.
alter table public.plants enable row level security;
alter table public.devices enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.relay_commands enable row level security;

-- For MVP dashboard without auth, you may temporarily allow public read.
-- Do NOT allow public inserts; ESP32 writes through Edge Function using service role.
drop policy if exists "public read plants" on public.plants;
create policy "public read plants"
  on public.plants for select
  to anon
  using (true);

drop policy if exists "public read devices" on public.devices;
create policy "public read devices"
  on public.devices for select
  to anon
  using (true);

drop policy if exists "public read sensor readings" on public.sensor_readings;
create policy "public read sensor readings"
  on public.sensor_readings for select
  to anon
  using (true);

drop policy if exists "public read relay commands" on public.relay_commands;
create policy "public read relay commands"
  on public.relay_commands for select
  to anon
  using (true);
