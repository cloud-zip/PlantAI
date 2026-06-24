// Supabase Edge Function: ai-generate
// Deploy with: supabase functions deploy ai-generate --no-verify-jwt
// Optional secrets for real AI:
//   OPENROUTER_API_KEY
//   OPENROUTER_MODEL=qwen/qwen-3.5-flash
// If no AI key is present, returns a safe rule-based fallback.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function fallbackPlan(latest: any) {
  const soil = Number(latest?.soil_moisture_percent);
  const temp = Number(latest?.temperature_c);
  const n = Number(latest?.npk_n);
  const p = Number(latest?.npk_p);
  const k = Number(latest?.npk_k);
  const tasks: string[] = [];
  if (Number.isFinite(soil) && soil < 30) tasks.push("Water in the morning and recheck soil moisture after 20–30 minutes.");
  if (Number.isFinite(soil) && soil > 75) tasks.push("Avoid watering; soil is already wet. Check drainage.");
  if (Number.isFinite(temp) && temp > 38) tasks.push("Heat stress risk. Provide shade during afternoon if possible.");
  if (Number.isFinite(n) && n < 25) tasks.push("Nitrogen appears low. Confirm with plant observation before fertilizer.");
  if (Number.isFinite(p) && p < 20) tasks.push("Phosphorus appears low. Confirm before applying fertilizer.");
  if (Number.isFinite(k) && k < 25) tasks.push("Potassium appears low. Monitor stress and leaf edge symptoms.");
  if (!tasks.length) tasks.push("Readings look stable. Continue normal monitoring.");

  return {
    summary: tasks[0],
    watering_plan: Number.isFinite(soil) && soil < 30 ? { action: "turn_watering_motor_on", duration_minutes: 5, confidence: 78 } : null,
    fertilizer_recommendation: [n, p, k].some((x) => Number.isFinite(x) && x < 25)
      ? { recommendation: "Possible NPK deficiency detected. Confirm before fertilizer application.", confidence: 65 }
      : null,
    seven_day_schedule: tasks.slice(0, 7).map((task, i) => ({ day: `Day ${i + 1}`, task })),
    extra_information: ["Rule-based fallback used. Configure OPENROUTER_API_KEY for full AI recommendations."],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const deviceId = body.device_id || "esp32-field-001";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: device } = await supabase.from("devices").select("id, plant_id").eq("id", deviceId).maybeSingle();
  const { data: plant } = device?.plant_id
    ? await supabase.from("plants").select("*").eq("id", device.plant_id).maybeSingle()
    : { data: null } as any;
  const { data: latest } = await supabase.from("sensor_readings").select("*").eq("device_id", deviceId).order("recorded_at", { ascending: false }).limit(1).maybeSingle();

  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!openrouterKey) {
    return jsonResponse({ provider: "fallback", plan: fallbackPlan(latest) });
  }

  const prompt = `Return only valid JSON. Create a concise plant care plan. Use conditional sections only when needed. Context: ${JSON.stringify({ plant, latest, has_image: Boolean(body.image), image_count: body.image_count || 0 })}`;
  try {
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openrouterKey}` },
      body: JSON.stringify({
        model: Deno.env.get("OPENROUTER_MODEL") || "qwen/qwen-3.5-flash",
        messages: [
          { role: "system", content: "You are an agriculture care assistant. Return valid JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const aiJson = await aiRes.json();
    const text = aiJson?.choices?.[0]?.message?.content || "{}";
    const plan = JSON.parse(text);
    return jsonResponse({ provider: "openrouter", plan });
  } catch (_e) {
    return jsonResponse({ provider: "fallback_after_ai_error", plan: fallbackPlan(latest) });
  }
});
