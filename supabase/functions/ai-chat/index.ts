// Supabase Edge Function: ai-chat
// Deploy with: supabase functions deploy ai-chat --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const deviceId = body.device_id || "esp32-field-001";
  const message = String(body.message || "").slice(0, 4000);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: latest } = await supabase.from("sensor_readings").select("*").eq("device_id", deviceId).order("recorded_at", { ascending: false }).limit(1).maybeSingle();

  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!openrouterKey) {
    return jsonResponse({
      provider: "fallback",
      reply: `I can help with your plant. Latest readings: temperature ${latest?.temperature_c ?? "--"}°C, humidity ${latest?.humidity_percent ?? "--"}%, soil ${latest?.soil_moisture_percent ?? "--"}%, NPK ${latest?.npk_n ?? "--"}/${latest?.npk_p ?? "--"}/${latest?.npk_k ?? "--"}. Configure OPENROUTER_API_KEY for full AI chat.`,
    });
  }

  try {
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openrouterKey}` },
      body: JSON.stringify({
        model: Deno.env.get("OPENROUTER_MODEL") || "qwen/qwen-3.5-flash",
        messages: [
          { role: "system", content: "You are a concise plant care assistant for farmers. Use the supplied sensor context. Do not overclaim from low-cost sensors." },
          { role: "user", content: JSON.stringify({ message, latest, image_count: body.image_count || 0 }) },
        ],
      }),
    });
    const aiJson = await aiRes.json();
    return jsonResponse({ provider: "openrouter", reply: aiJson?.choices?.[0]?.message?.content || "No AI reply." });
  } catch (e) {
    return jsonResponse({ provider: "fallback_after_ai_error", reply: `AI service error. Local summary: soil ${latest?.soil_moisture_percent ?? "--"}%, temperature ${latest?.temperature_c ?? "--"}°C.` });
  }
});
