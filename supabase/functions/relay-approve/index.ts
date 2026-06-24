// Supabase Edge Function: relay-approve
// Deploy with: supabase functions deploy relay-approve --no-verify-jwt
// Purpose: create exactly one fresh pending relay command for ESP32.
// Important behavior:
// - Cancels older pending commands for the same device before inserting a new one.
// - OFF command is immediate and has no duration.
// - ON command duration is clamped to 1..3600 seconds.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));

  const deviceId = String(body.device_id || "esp32-field-001").trim();
  const action = body.action === "off" ? "off" : "on";
  const requestedDuration = Number(body.duration_seconds || 10);
  const durationSeconds = action === "on"
    ? Math.max(1, Math.min(3600, Number.isFinite(requestedDuration) ? requestedDuration : 10))
    : null;
  const reason = String(body.reason || `Website ${action.toUpperCase()} command`).slice(0, 500);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, plant_id, enabled")
    .eq("id", deviceId)
    .maybeSingle();

  if (deviceError) return jsonResponse({ error: deviceError.message }, 500);
  if (!device || !device.enabled) return jsonResponse({ error: "Device not found or disabled" }, 404);

  // Cancel stale commands that ESP32 has not picked up yet.
  // This prevents an old ON command from executing before a newer OFF command.
  await supabase
    .from("relay_commands")
    .update({ status: "rejected" })
    .eq("device_id", deviceId)
    .eq("status", "pending");

  const { data, error } = await supabase
    .from("relay_commands")
    .insert({
      device_id: deviceId,
      plant_id: device.plant_id,
      action,
      duration_seconds: durationSeconds,
      reason,
      status: "pending",
    })
    .select("id, action, duration_seconds, status, created_at")
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({
    ok: true,
    command: data,
    message: action === "on"
      ? `Motor ON command queued for ${durationSeconds} seconds.`
      : "Motor OFF command queued.",
  });
});
