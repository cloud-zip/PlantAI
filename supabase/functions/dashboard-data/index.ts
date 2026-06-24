// Supabase Edge Function: dashboard-data
// Public read endpoint for GitHub Pages dashboard.
// Deploy with: supabase functions deploy dashboard-data --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device_id") || "esp32-field-001";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, plant_id, name, enabled, last_seen_at")
    .eq("id", deviceId)
    .maybeSingle();

  if (deviceError) return jsonResponse({ error: "Device lookup failed", details: deviceError.message }, 500);
  if (!device || !device.enabled) return jsonResponse({ error: "Device not found or disabled" }, 404);

  const { data: plant } = await supabase
    .from("plants")
    .select("id, name, type, region_city, region_state, region_country")
    .eq("id", device.plant_id)
    .maybeSingle();

  const { data: readings, error: readingsError } = await supabase
    .from("sensor_readings")
    .select("id, device_id, plant_id, temperature_c, humidity_percent, soil_moisture_raw, soil_moisture_percent, soil_sensor_type, npk_n, npk_p, npk_k, npk_source, relay_motor_on, recorded_at")
    .eq("device_id", deviceId)
    .order("recorded_at", { ascending: false })
    .limit(1000);

  if (readingsError) {
    return jsonResponse({ error: "Readings lookup failed", details: readingsError.message }, 500);
  }

  return jsonResponse({
    device,
    plant,
    latest: readings?.[0] ?? null,
    readings: readings ?? [],
  });
});
