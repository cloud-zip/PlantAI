// Supabase Edge Function: device-relay-confirm
// ESP32 can call this after executing a relay command.
// Current ESP32 firmware has polling implemented; confirmation can be added next.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const expectedToken = Deno.env.get("DEVICE_TOKEN");
  const suppliedToken = req.headers.get("x-device-token") ?? "";
  if (!expectedToken || suppliedToken !== expectedToken) {
    return jsonResponse({ error: "Unauthorized device" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const commandId = String(body.command_id || "").trim();
  if (!commandId) return jsonResponse({ error: "command_id is required" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error } = await supabase
    .from("relay_commands")
    .update({ status: "executed", executed_at: new Date().toISOString() })
    .eq("id", commandId);

  if (error) return jsonResponse({ error: "Confirm failed", details: error.message }, 500);

  return jsonResponse({ ok: true });
});
