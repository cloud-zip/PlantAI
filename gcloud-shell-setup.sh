#!/bin/bash
# Smart Plant Care - Google Cloud Shell One-Liner Setup
# Copy this entire script and paste into Google Cloud Shell
# It creates all files and folders automatically

set -e

echo "Creating Smart Plant Care project structure..."

mkdir -p plant-care/supabase/functions/{device-sensor-ingest,device-relay-poll,device-relay-confirm}
cd plant-care

# ==================== schema.sql ====================
cat > schema.sql << 'SCHEMA_EOF'
-- Smart Plant Care Dashboard - Supabase Schema
-- Run via: supabase db execute --file schema.sql

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

insert into public.plants (id, name, type, region_city, region_state, region_country)
values ('00000000-0000-0000-0000-000000000001', 'Demo Tomato', 'Tomato', 'Patna', 'Bihar', 'India')
on conflict (id) do nothing;

insert into public.devices (id, plant_id, name, enabled)
values ('esp32-field-001', '00000000-0000-0000-0000-000000000001', 'ESP32 Prototype', true)
on conflict (id) do update set
  plant_id = excluded.plant_id,
  enabled = true;

alter table public.plants enable row level security;
alter table public.devices enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.relay_commands enable row level security;

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
SCHEMA_EOF

echo "✓ schema.sql created"

# ==================== setup.sh ====================
cat > setup.sh << 'SETUP_EOF'
#!/bin/bash
# Smart Plant Care - Supabase Setup Script
# Run this from your project root (where supabase/ folder lives)
# Prerequisites: supabase CLI installed and logged in
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh YOUR_PROJECT_REF
#
# Example:
#   ./setup.sh abcdefghijklmnop

set -e

PROJECT_REF="${1:?Usage: ./setup.sh YOUR_PROJECT_REF}"
DEVICE_TOKEN="abe2be26284fd13708ec2e29175c6217f9b44cfaea92664ecca96c0d0e616c62"

echo ""
echo "========================================"
echo " Smart Plant Care - Supabase Setup"
echo " Project: $PROJECT_REF"
echo "========================================"
echo ""

# ── STEP 1: Link project ──────────────────────────────────────────────────────
echo "[1/6] Linking Supabase project..."
supabase link --project-ref "$PROJECT_REF"

# ── STEP 2: Apply SQL schema ──────────────────────────────────────────────────
echo ""
echo "[2/6] Applying database schema..."
supabase db execute --file schema.sql

echo "  ✓ Tables created: plants, devices, sensor_readings, relay_commands"
echo "  ✓ Indexes created"
echo "  ✓ RLS enabled with public read policies"
echo "  ✓ Seed data inserted (Demo Tomato plant + esp32-field-001 device)"

# ── STEP 3: Set DEVICE_TOKEN secret ──────────────────────────────────────────
echo ""
echo "[3/6] Setting DEVICE_TOKEN secret..."
supabase secrets set DEVICE_TOKEN="$DEVICE_TOKEN"
echo "  ✓ DEVICE_TOKEN set"

# ── STEP 4: Deploy Edge Functions (JWT verification DISABLED) ─────────────────
echo ""
echo "[4/6] Deploying Edge Functions (--no-verify-jwt)..."

supabase functions deploy device-sensor-ingest --no-verify-jwt
echo "  ✓ device-sensor-ingest deployed"

supabase functions deploy device-relay-poll --no-verify-jwt
echo "  ✓ device-relay-poll deployed"

supabase functions deploy device-relay-confirm --no-verify-jwt
echo "  ✓ device-relay-confirm deployed"

# ── STEP 5: Test sensor ingest ────────────────────────────────────────────────
echo ""
echo "[5/6] Testing device-sensor-ingest with sample payload..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "https://${PROJECT_REF}.supabase.co/functions/v1/device-sensor-ingest" \
  -H "Content-Type: application/json" \
  -H "x-device-token: ${DEVICE_TOKEN}" \
  -d '{
    "device_id": "esp32-field-001",
    "temperature_c": 32.1,
    "humidity_percent": 58,
    "soil_moisture_raw": 2200,
    "soil_moisture_percent": 34,
    "soil_sensor_type": "capacitive",
    "npk_n": 42,
    "npk_p": 18,
    "npk_k": 31,
    "npk_source": "rs485_modbus",
    "relay_motor_on": false
  }')

HTTP_BODY=$(echo "$RESPONSE" | head -n1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

echo "  HTTP Status: $HTTP_CODE"
echo "  Response:    $HTTP_BODY"

if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✓ Test INSERT succeeded!"
else
  echo "  ✗ Test failed. Check function logs: supabase functions logs device-sensor-ingest"
fi

# ── STEP 6: Print ESP32 values ────────────────────────────────────────────────
echo ""
echo "[6/6] ESP32 firmware values:"
echo "========================================"
echo ""
echo 'const char* SENSOR_INGEST_URL ='
echo "  \"https://${PROJECT_REF}.supabase.co/functions/v1/device-sensor-ingest\";"
echo ""
echo 'const char* RELAY_POLL_URL ='
echo "  \"https://${PROJECT_REF}.supabase.co/functions/v1/device-relay-poll?device_id=esp32-field-001\";"
echo ""
echo 'const char* RELAY_CONFIRM_URL ='
echo "  \"https://${PROJECT_REF}.supabase.co/functions/v1/device-relay-confirm\";"
echo ""
echo 'const char* SUPABASE_ANON_KEY = "";   // JWT disabled, leave empty'
echo ""
echo 'const char* DEVICE_ID    = "esp32-field-001";'
echo "const char* DEVICE_TOKEN = \"${DEVICE_TOKEN}\";"
echo ""
echo "========================================"
echo " JWT verification: DISABLED (--no-verify-jwt)"
echo " SUPABASE_ANON_KEY: not needed"
echo "========================================"
echo ""
echo "Done!"
SETUP_EOF

chmod +x setup.sh
echo "✓ setup.sh created (executable)"

# ==================== device-sensor-ingest ====================
cat > supabase/functions/device-sensor-ingest/index.ts << 'INGEST_EOF'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // --- Auth: validate x-device-token ---
  const deviceToken = req.headers.get("x-device-token");
  const expectedToken = Deno.env.get("DEVICE_TOKEN");

  if (!expectedToken) {
    console.error("DEVICE_TOKEN secret not configured");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!deviceToken || deviceToken !== expectedToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // --- Parse body ---
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const device_id = body.device_id as string | undefined;
  if (!device_id) {
    return new Response(JSON.stringify({ error: "Missing device_id" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // --- Supabase client (service role) ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // --- Validate device exists and is enabled ---
  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, plant_id, enabled")
    .eq("id", device_id)
    .single();

  if (deviceError || !device) {
    return new Response(JSON.stringify({ error: "Device not found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!device.enabled) {
    return new Response(JSON.stringify({ error: "Device disabled" }), {
      status: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // --- Insert sensor reading ---
  const { data: reading, error: insertError } = await supabase
    .from("sensor_readings")
    .insert({
      device_id: device_id,
      plant_id: device.plant_id,
      temperature_c: body.temperature_c ?? null,
      humidity_percent: body.humidity_percent ?? null,
      soil_moisture_raw: body.soil_moisture_raw ?? null,
      soil_moisture_percent: body.soil_moisture_percent ?? null,
      soil_sensor_type: body.soil_sensor_type ?? null,
      npk_n: body.npk_n ?? null,
      npk_p: body.npk_p ?? null,
      npk_k: body.npk_k ?? null,
      npk_source: body.npk_source ?? null,
      relay_motor_on: body.relay_motor_on ?? false,
    })
    .select("id, recorded_at")
    .single();

  if (insertError) {
    console.error("Insert error:", insertError);
    return new Response(JSON.stringify({ error: "Failed to insert reading" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // --- Update device last_seen_at ---
  await supabase
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device_id);

  return new Response(
    JSON.stringify({
      ok: true,
      reading_id: reading.id,
      recorded_at: reading.recorded_at,
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    }
  );
});
INGEST_EOF

echo "✓ device-sensor-ingest/index.ts created"

# ==================== device-relay-poll ====================
cat > supabase/functions/device-relay-poll/index.ts << 'POLL_EOF'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // --- Auth: validate x-device-token ---
  const deviceToken = req.headers.get("x-device-token");
  const expectedToken = Deno.env.get("DEVICE_TOKEN");

  if (!expectedToken) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!deviceToken || deviceToken !== expectedToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // --- Get device_id from query param or header ---
  const url = new URL(req.url);
  const device_id =
    url.searchParams.get("device_id") ??
    req.headers.get("x-device-id") ??
    null;

  if (!device_id) {
    return new Response(JSON.stringify({ error: "Missing device_id" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // --- Supabase client ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // --- Find oldest pending command for this device ---
  const { data: command, error: fetchError } = await supabase
    .from("relay_commands")
    .select("id, action, duration_seconds, reason")
    .eq("device_id", device_id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return new Response(JSON.stringify({ error: "Failed to fetch command" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!command) {
    return new Response(JSON.stringify({ command: null }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // --- Mark command as sent ---
  await supabase
    .from("relay_commands")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", command.id);

  return new Response(
    JSON.stringify({
      command: {
        id: command.id,
        action: command.action,
        duration_seconds: command.duration_seconds ?? null,
        reason: command.reason ?? null,
      },
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    }
  );
});
POLL_EOF

echo "✓ device-relay-poll/index.ts created"

# ==================== device-relay-confirm ====================
cat > supabase/functions/device-relay-confirm/index.ts << 'CONFIRM_EOF'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // --- Auth: validate x-device-token ---
  const deviceToken = req.headers.get("x-device-token");
  const expectedToken = Deno.env.get("DEVICE_TOKEN");

  if (!expectedToken) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!deviceToken || deviceToken !== expectedToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // --- Parse body ---
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const command_id = body.command_id as string | undefined;
  if (!command_id) {
    return new Response(JSON.stringify({ error: "Missing command_id" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // --- Supabase client ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // --- Mark command as executed ---
  const { error: updateError } = await supabase
    .from("relay_commands")
    .update({
      status: "executed",
      executed_at: new Date().toISOString(),
    })
    .eq("id", command_id)
    .in("status", ["pending", "sent"]); // safety: only update if not already done

  if (updateError) {
    console.error("Update error:", updateError);
    return new Response(JSON.stringify({ error: "Failed to confirm command" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
CONFIRM_EOF

echo "✓ device-relay-confirm/index.ts created"

echo ""
echo "========================================"
echo " ✓ All files created successfully!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. cd plant-care"
echo "2. supabase login"
echo "3. ./setup.sh YOUR_PROJECT_REF"
echo ""
