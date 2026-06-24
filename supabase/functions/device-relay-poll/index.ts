// Supabase Edge Function: device-relay-poll
// ESP32 calls this periodically to get pending relay commands.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id, x-device-token",
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

  const expectedToken = Deno.env.get("DEVICE_TOKEN");
  const suppliedToken = req.headers.get("x-device-token") ?? "";
  if (!expectedToken || suppliedToken !== expectedToken) {
    return jsonResponse({ error: "Unauthorized device" }, 401);
  }

  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device_id") || req.headers.get("x-device-id") || "";
  if (!deviceId) return jsonResponse({ error: "device_id is required" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: device } = await supabase
    .from("devices")
    .select("id, enabled")
    .eq("id", deviceId)
    .maybeSingle();

  if (!device || !device.enabled) {
    return jsonResponse({ error: "Device not registered or disabled" }, 403);
  }

  const { data: command, error } = await supabase
    .from("relay_commands")
    .select("id, action, duration_seconds, reason, created_at")
    .eq("device_id", deviceId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return jsonResponse({ error: "Command lookup failed", details: error.message }, 500);

  if (!command) return jsonResponse({ command: null });

  await supabase
    .from("relay_commands")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", command.id);

  return jsonResponse({
    command: {
      id: command.id,
      action: command.action,
      duration_seconds: command.duration_seconds ?? 10,
      reason: command.reason ?? "Dashboard command",
    },
  });
});
