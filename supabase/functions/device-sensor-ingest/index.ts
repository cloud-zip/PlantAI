// Supabase Edge Function: device-sensor-ingest
// ESP32 posts sensor JSON here. Function validates device token and inserts into Postgres.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id, x-device-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asInt(value: unknown): number | null {
  const n = asNumber(value);
  return n === null ? null : Math.round(n);
}

function clamp(value: number | null, min: number, max: number): number | null {
  if (value === null) return null;
  return Math.max(min, Math.min(max, value));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const expectedToken = Deno.env.get("DEVICE_TOKEN");
  const suppliedToken = req.headers.get("x-device-token") ?? "";

  if (!expectedToken || suppliedToken !== expectedToken) {
    return jsonResponse({ error: "Unauthorized device" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_e) {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const headerDeviceId = req.headers.get("x-device-id");
  const deviceId = String(body.device_id || headerDeviceId || "").trim();

  if (!deviceId) {
    return jsonResponse({ error: "device_id is required" }, 400);
  }

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, plant_id, enabled")
    .eq("id", deviceId)
    .maybeSingle();

  if (deviceError) {
    return jsonResponse({ error: "Device lookup failed", details: deviceError.message }, 500);
  }

  if (!device || !device.enabled) {
    return jsonResponse({ error: "Device not registered or disabled" }, 403);
  }

  const reading = {
    device_id: deviceId,
    plant_id: device.plant_id,
    temperature_c: asNumber(body.temperature_c),
    humidity_percent: clamp(asNumber(body.humidity_percent), 0, 100),
    soil_moisture_raw: asInt(body.soil_moisture_raw),
    soil_moisture_percent: clamp(asInt(body.soil_moisture_percent), 0, 100),
    soil_sensor_type: String(body.soil_sensor_type || "unknown").slice(0, 80),
    npk_n: asInt(body.npk_n),
    npk_p: asInt(body.npk_p),
    npk_k: asInt(body.npk_k),
    npk_source: String(body.npk_source || "unknown").slice(0, 120),
    relay_motor_on: Boolean(body.relay_motor_on),
  };

  const { data, error } = await supabase
    .from("sensor_readings")
    .insert(reading)
    .select("id, recorded_at")
    .single();

  if (error) {
    return jsonResponse({ error: "Insert failed", details: error.message }, 500);
  }

  await supabase
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", deviceId);

  return jsonResponse({ ok: true, reading_id: data.id, recorded_at: data.recorded_at });
});
