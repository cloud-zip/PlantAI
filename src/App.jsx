import { useEffect, useMemo, useRef, useState } from 'react';

const GOLD = {
  surface: '#13140f',
  lowest: '#0d0f0a',
  low: '#1b1c17',
  container: '#1f201b',
  high: '#292a25',
  highest: '#34352f',
  text: '#e4e3da',
  variant: '#c5c9ac',
  outline: '#8f9378',
  outlineVariant: '#444932',
  lime: '#d4ff00',
  limeDim: '#b0d500',
  secondary: '#c6c7c0',
  tertiary: '#ffffff',
  error: '#ffb4ab',
  errorContainer: '#93000a'
};

function getRuntimeSupabaseUrl() {
  try {
    return JSON.parse(localStorage.getItem('plantai_settings') || '{}').supabaseUrl || localStorage.getItem('plantai_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
  } catch {
    return localStorage.getItem('plantai_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
  }
}
const SUPABASE_URL = getRuntimeSupabaseUrl();
const DEVICE_ID = 'esp32-field-001';
const endpoint = (name) => {
  const url = getRuntimeSupabaseUrl();
  return url ? `${url.replace(/\/$/, '')}/functions/v1/${name}` : '';
};

const providers = {
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'qwen/qwen-3.5-flash' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  groq: { label: 'GroqCloud', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant' },
  nvidia: { label: 'Nvidia NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', model: 'moonshotai/kimi-k2-instruct' },
  custom: { label: 'Custom OpenAI-Compatible', baseUrl: '', model: '' },
};

const plantProfiles = {
  rice: { label: 'Rice / Paddy (Oryza sativa)', ideal: 'Warm climate 20-35°C, high water availability, humidity 60-80%, moist/flooded soil depending stage, nitrogen demand moderate-high.' },
  wheat: { label: 'Wheat (Triticum aestivum)', ideal: 'Cool growing season 15-25°C, moderate moisture, soil moisture 40-60%, loam/clay loam soil, balanced NPK.' },
  millet: { label: 'Millet / Pearl/Finger/Foxtail', ideal: 'Drought-tolerant, 25-35°C, low-moderate watering, grows well in sandy/silty soils with good drainage.' },
  tomato: { label: 'Tomato (Solanum lycopersicum)', ideal: 'Warm climate 20-30°C, moist well-drained soil, high potassium requirement for fruiting, 50-70% humidity.' },
  chili: { label: 'Chili Pepper (Capsicum annuum)', ideal: 'Warm climate 22-35°C, moderate watering, well-draining sandy loam soil, avoid waterlogging.' },
  brinjal: { label: 'Brinjal / Eggplant (Solanum melongena)', ideal: 'Warm weather crop 25-32°C, silt loam or clay loam, high nutrient needs, regular watering.' },
  cucumber: { label: 'Cucumber (Cucumis sativus)', ideal: 'Warm 22-30°C, constant soil moisture, high humidity, nitrogen & potassium rich organic soil.' },
  carrot: { label: 'Carrot (Daucus carota)', ideal: 'Cool temperature 15-20°C, deep loose sandy soil, constant moderate watering, avoid heavy nitrogen.' },
  spinach: { label: 'Spinach (Spinacia oleracea)', ideal: 'Cool weather 12-20°C, rich loam soil, high nitrogen demand, keep soil moist but not wet.' },
  potato: { label: 'Potato (Solanum tuberosum)', ideal: 'Cool climate 15-20°C, loose well-aerated sandy loam, moderate soil moisture, high potassium.' },
  onion: { label: 'Onion (Allium cepa)', ideal: '13-24°C, shallow root system requires frequent shallow watering, well-drained sandy loam.' },
  capsicum: { label: 'Capsicum / Bell Pepper', ideal: 'Warm 18-30°C, well-draining moist loam, avoid excessive nitrogen to prevent flower drop.' },
  lettuce: { label: 'Lettuce (Lactuca sativa)', ideal: 'Cool 15-18°C, moist well-drained sandy loam, high organic matter, nitrogen responsive.' },
  broccoli: { label: 'Broccoli (Brassica oleracea)', ideal: 'Cool season 13-20°C, fertile loam, high water requirement, needs rich boron and nitrogen.' },
  custom: { label: 'Custom Crop / Plant', ideal: 'Custom conditions. Adjust sensor limits according to crop guidelines.' }
};

const weatherPlaces = {
  patna: { label: 'Patna, Bihar', city: 'Patna', country: 'India', latitude: 25.5941, longitude: 85.1376 },
  kolkata: { label: 'Kolkata, West Bengal', city: 'Kolkata', country: 'India', latitude: 22.5726, longitude: 88.3639 },
  chandpara: { label: 'Greenfield / Brooktown Region', city: 'Greenfield / Brooktown', country: 'India', latitude: 22.899, longitude: 88.761 },
  habra: { label: 'Brooktown, North County, West Bengal', city: 'Brooktown', country: 'India', latitude: 22.842, longitude: 88.656 },
  delhi: { label: 'Delhi NCR', city: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090 },
  mumbai: { label: 'Mumbai, Maharashtra', city: 'Mumbai', country: 'India', latitude: 19.0760, longitude: 72.8777 },
  custom: { label: 'Custom latitude/longitude', city: '', country: 'India', latitude: '', longitude: '' },
};

const defaultSettings = {
  provider: 'openrouter', apiKey: '', baseUrl: providers.openrouter.baseUrl, model: providers.openrouter.model,
  mode: 'direct', depth: 'Balanced', careStyle: 'Normal', budget: 'Low-cost', glass: 42, sensorInterval: 30, maxWatering: 10, cooldown: 5,
  supabaseUrl: SUPABASE_URL, plantType: 'millet', plantName: 'My favorite plant', city: 'Patna', country: 'India', latitude: 25.5941, longitude: 85.1376, weatherPlace: 'patna', fieldAreaSqM: 0.1, soilType: 'Standard Soil', useVirtualSoil: false, secretUnlocked: false, showKey: false, plantingDate: '2026-06-01'
};

function loadSettings() {
  try {
    return { ...defaultSettings, ...(JSON.parse(localStorage.getItem('plantai_settings') || '{}')) };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(s) {
  localStorage.setItem('plantai_settings', JSON.stringify(s));
}

function setCookie(name, value, days = 30) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${days * 86400}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  return document.cookie.split('; ').find(x => x.startsWith(`${name}=`))?.split('=')[1];
}

function fmtTime(v) {
  if (!v) return 'No update yet';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
}

function ago(v) {
  if (!v) return 'unknown';
  const m = Math.round(Math.max(0, Date.now() - new Date(v).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function statusMoisture(v) {
  const n = num(v);
  if (n === null) return ['No data', 'default'];
  if (n < 30) return ['Dry', 'error'];
  if (n > 75) return ['Wet', 'warning'];
  return ['Optimal', 'primary'];
}

function statusRange(v, low, high) {
  const n = num(v);
  if (n === null) return ['No data', 'default'];
  if (n < low) return ['Low', 'warning'];
  if (n > high) return ['High', 'warning'];
  return ['Stable', 'primary'];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function estimateVirtualSoil(data, weather, settings) {
  const rain7 = (weather?.daily?.rain_sum || []).slice(0, 7).reduce((a, b) => a + Number(b || 0), 0);
  const relayBoost = (data.readings || []).slice(0, 24).filter(r => r.relay_motor_on).length * 4;
  const soilBase = settings.soilType === 'clay' ? 50 : settings.soilType === 'sandy' ? 28 : settings.soilType === 'silt' ? 42 : 38;
  const areaPenalty = Math.min(12, Math.max(0, Number(settings.fieldAreaSqM || 10) - 10) * 0.15);
  return Math.round(clamp(soilBase + rain7 * 3.2 + relayBoost - areaPenalty, 8, 92));
}

function computeHealthScore(latest, weather, settings) {
  let score = 100;
  const temp = num(latest.temperature_c), hum = num(latest.humidity_percent), soil = num(latest.soil_moisture_percent);
  const n = num(latest.npk_n), ph = num(latest.npk_p), k = num(latest.npk_k);
  if (temp !== null) {
    if (temp < 15 || temp > 40) score -= 18;
    else if (temp < 18 || temp > 35) score -= 8;
  } else score -= 8;
  if (hum !== null) {
    if (hum < 30 || hum > 90) score -= 12;
    else if (hum < 40 || hum > 82) score -= 5;
  } else score -= 6;
  if (soil !== null) {
    if (soil < 25 || soil > 82) score -= 22;
    else if (soil < 35 || soil > 72) score -= 8;
  } else score -= 10;
  [n, ph, k].forEach(x => {
    if (x === null || x <= 0) score -= 4;
    else if (x < 25 || x > 220) score -= 7;
  });
  const rainToday = num(weather?.current?.rain) || 0;
  if (rainToday > 20 && soil !== null && soil > 70) score -= 8;
  if (settings.useVirtualSoil) score -= 3;
  return Math.round(clamp(score, 35, 99));
}

function effectiveLatest(data, weather, settings) {
  const latest = { ...data.latest };
  if (settings.useVirtualSoil) {
    latest.soil_moisture_percent = estimateVirtualSoil(data, weather, settings);
  }
  return latest;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed ${res.status}`);
  return json;
}

async function queueRelayCommand(action, durationMinutes, reason) {
  const url = endpoint('relay-approve');
  if (!url) throw new Error('Supabase endpoint is not set. Open Settings → Supabase Endpoint.');
  const cleanAction = action === 'off' ? 'off' : 'on';
  const durationSeconds = cleanAction === 'on' ? Math.max(1, Number(durationMinutes || 1)) * 60 : null;
  return fetchJson(url, {
    method: 'POST',
    body: JSON.stringify({
      device_id: DEVICE_ID,
      action: cleanAction,
      duration_seconds: durationSeconds,
      reason,
      source: 'website_dashboard',
      requested_at: new Date().toISOString(),
    }),
  });
}

function calculateStrokeOffset(value, max = 100) {
  const percent = Math.min(Math.max((num(value) || 0) / max, 0), 1);
  return 251.2 - (251.2 * percent);
}

function calculateDaysSincePlanting(plantingDate) {
  if (!plantingDate) return 0;
  const start = new Date(plantingDate);
  const today = new Date();
  const diffTime = today - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return isNaN(diffDays) ? 0 : Math.max(0, diffDays);
}

// RESTORE AI CARE PLAN HELPERS
function makeFallbackPlan(data, weather, settings) {
  const latest = data.latest || {};
  const soil = num(latest.soil_moisture_percent);
  const temp = num(latest.temperature_c);
  const days = [
    ['Day 1', soil !== null && soil < 30 ? 'Water in morning; recheck moisture after 30 min.' : 'Check soil and continue normal watering.', 'Watering', soil !== null && soil < 30 ? 'High' : 'Low'],
    ['Day 2', 'Inspect leaves for pests, spots, curling, or yellowing.', 'Inspection', 'Medium'],
    ['Day 3', 'Review NPK trend. Confirm before adding fertilizer.', 'Nutrients', 'Medium'],
    ['Day 4', weather?.daily?.rain_sum?.slice(0, 7).some(x => Number(x) > 0) ? 'Adjust irrigation based on recent rain history.' : 'Light watering only if soil is dry.', 'Weather', 'Medium'],
    ['Day 5', temp !== null && temp > 38 ? 'Add shade during peak afternoon heat.' : 'Maintain normal sunlight exposure.', 'Climate', temp !== null && temp > 38 ? 'High' : 'Low'],
    ['Day 6', 'Check drainage and root-zone moisture before watering.', 'Soil', 'Medium'],
    ['Day 7', 'Generate a fresh plan after new sensor readings.', 'Review', 'Medium'],
  ];
  return {
    summary: `Rule-based care plan for ${settings.plantName || 'your plant'} using current ESP32 and weather data.`,
    weatherRisk: weather?.current ? `Current weather ${weather.current.temperature_2m ?? '--'}°C; recent 7-day rain history included.` : 'Weather unavailable. Set latitude/longitude in Settings.',
    wateringPlan: soil !== null && soil < 30 ? { action: 'Water recommended', durationMinutes: Math.min(settings.maxWatering || 5, 10), confidence: 78, reason: 'Soil moisture is below threshold.' } : { action: 'No immediate watering', durationMinutes: 0, confidence: 70, reason: 'Soil moisture is not critically low.' },
    fertilizerPlan: { recommendation: 'Use NPK values as guidance only. Confirm unusual readings before fertilizer.', confidence: 62 },
    sevenDaySchedule: days.map(([day, task, category, priority]) => ({ day, task, category, priority })),
    relayRecommendation: soil !== null && soil < 30 ? { action: 'on', durationMinutes: Math.min(settings.maxWatering || 5, 10), safety: 'Approve only if relay and pump are tested.' } : { action: 'off', durationMinutes: 0, safety: 'No watering command needed.' },
    extraNotes: ['This fallback appears because the AI provider did not return valid JSON or key is missing.', plantProfiles[settings.plantType]?.ideal || 'Plant ideal conditions unavailable.'],
  };
}

function parseCarePlan(text, data, weather, settings) {
  try {
    const cleaned = String(text).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '');
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary || parsed.overview || 'Care plan generated.',
      weatherRisk: parsed.weatherRisk || parsed.weather_risk || parsed.weather || '',
      wateringPlan: parsed.wateringPlan || parsed.watering_plan || null,
      fertilizerPlan: parsed.fertilizerPlan || parsed.fertilizer_plan || parsed.fertilizerRecommendation || null,
      sevenDaySchedule: parsed.sevenDaySchedule || parsed.seven_day_schedule || parsed.schedule || [],
      relayRecommendation: parsed.relayRecommendation || parsed.relay_recommendation || null,
      extraNotes: parsed.extraNotes || parsed.extra_notes || parsed.notes || [],
      raw: parsed,
    };
  } catch {
    const fb = makeFallbackPlan(data, weather, settings);
    fb.extraNotes = [`AI returned non-JSON text. Showing fallback chart and preserving raw text below.`, text];
    return fb;
  }
}

function saveCarePlan(plan) {
  const json = JSON.stringify(plan);
  const prev = decodeURIComponent(getCookie('plantai_care_plan') || '');
  if (prev !== json) setCookie('plantai_care_plan', json);
  localStorage.setItem('plantai_care_plan', json);
  localStorage.setItem('plantai_care_plan_updated_at', new Date().toISOString());
}

function loadCarePlan() {
  try {
    return JSON.parse(localStorage.getItem('plantai_care_plan') || decodeURIComponent(getCookie('plantai_care_plan') || '') || 'null');
  } catch {
    return null;
  }
}

function aiContext(data, weather, settings) {
  return {
    plant: {
      name: settings.plantName,
      type: plantProfiles[settings.plantType]?.label,
      ideal_conditions: plantProfiles[settings.plantType]?.ideal,
      location: `${settings.city}, ${settings.country}`,
      field_area_sq_m: settings.fieldAreaSqM,
      soil_type: settings.soilType
    },
    latest_sensor_data: effectiveLatest(data, weather, settings),
    raw_latest_sensor_data: data.latest,
    sensor_history: (data.readings || []).slice(0, 24),
    weather_current_and_7day_history: weather,
    virtual_soil_enabled: settings.useVirtualSoil,
    motor_flow_rate: '1 liter per second',
    care_preferences: { depth: settings.depth, style: settings.careStyle, budget: settings.budget }
  };
}

async function directAi(settings, messages, options = {}) {
  if (!settings.apiKey) throw new Error('Add an AI API key in Settings first.');
  const url = `${settings.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const body = {
    model: settings.model,
    messages,
    temperature: options.temperature ?? .35
  };
  if (options.json) body.response_format = { type: 'json_object' };
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || json.message || `AI request failed ${res.status}`);
  return json.choices?.[0]?.message?.content || 'No response.';
}

// RESTORE WEATHER FETCHER
async function fetchWeather(settings) {
  const { latitude, longitude } = settings;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,precipitation_probability_max&past_days=7&forecast_days=1&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

// ---------------- SUB-COMPONENTS ----------------

function Dashboard({ data, weather, refresh, refreshing, error, settings, setSettings, setTab }) {
  const latest = effectiveLatest(data, weather, settings);
  const [relayMsg, setRelayMsg] = useState('');
  const [relayBusy, setRelayBusy] = useState(false);
  const [relayOverride, setRelayOverride] = useState(null);
  const displayedMotorOn = relayOverride ?? Boolean(latest.relay_motor_on);

  const score = computeHealthScore(latest, weather, settings);
  
  // Custom states matching styling
  const soilMoisture = latest.soil_moisture_percent ?? 100;
  const temperature = latest.temperature_c ?? 32.3;
  const humidity = latest.humidity_percent ?? 83;
  const weatherTemp = weather?.current?.temperature_2m ?? 30.3;

  async function relay(action) {
    setRelayBusy(true);
    setRelayMsg('');
    try {
      const duration = action === 'on' ? Number(settings.maxWatering || 1) : 0;
      const result = await queueRelayCommand(action, duration, `Dashboard direct ${action.toUpperCase()} command`);
      setRelayOverride(action === 'on');
      setRelayMsg(result.message || `Motor ${action.toUpperCase()} command queued. ESP32 will pick it up on next poll.`);
      setTimeout(() => refresh(true), 1200);
    } catch (e) {
      setRelayMsg(`Relay error: ${e.message}`);
    } finally {
      setRelayBusy(false);
    }
  }

  const updateProfile = (field, val) => {
    const next = { ...settings, [field]: val };
    setSettings(next);
    saveSettings(next);
  };

  return (
    <>
      {error && <div className="p-4 mb-4 text-sm bg-red-950/40 text-red-400 rounded-2xl border border-red-900/30">{error}</div>}
      {relayMsg && <div className="p-4 mb-4 text-sm bg-[#1c1e14] text-[#d4ff00] rounded-2xl border border-[#d4ff00]/10">{relayMsg}</div>}
      
      {/* HERO CARD */}
      <section className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-8 relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4ff00]/10 blur-3xl rounded-full"></div>
        <div className="relative z-10">
          <h1 className="font-serif text-5xl mt-6 leading-tight">{settings.plantName}</h1>
          <p className="text-gray-400 mt-2 text-sm">
            {plantProfiles[settings.plantType]?.label || 'General Care'} · Days since planting: {calculateDaysSincePlanting(settings.plantingDate)}
          </p>
          <div className="flex items-center justify-between mt-10">
            <span className="font-mono text-[#d4ff00] text-sm font-bold tracking-widest uppercase">ESP32-V2.4</span>
            <button
              onClick={() => refresh()}
              disabled={refreshing}
              className="bg-[#d4ff00] text-black px-5 py-2 rounded-full flex items-center gap-2 font-bold text-sm shadow-lg shadow-[#d4ff00]/20 cursor-pointer"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* FIELD PROFILE */}
      <section className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 space-y-4 border border-white/5">
        <h2 className="font-serif text-2xl px-2">Field Profile</h2>
        <div className="space-y-3">
          <div className="relative">
            <label className="absolute -top-2 left-4 px-1 bg-[#1c1e14] text-[10px] text-gray-400">Plant Name</label>
            <input
              type="text"
              value={settings.plantName}
              onChange={(e) => updateProfile('plantName', e.target.value)}
              className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-[#d4ff00] focus:border-[#d4ff00] focus:outline-none"
            />
          </div>

          <div className="relative">
            <label className="absolute -top-2 left-4 px-1 bg-[#1c1e14] text-[10px] text-gray-400">Crop Type</label>
            <select
              value={settings.plantType}
              onChange={(e) => updateProfile('plantType', e.target.value)}
              className="w-full bg-[#1c1e14] border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-[#d4ff00] focus:border-[#d4ff00] focus:outline-none appearance-none"
            >
              {Object.entries(plantProfiles).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#13140f]">{v.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <label className="absolute -top-2 left-4 px-1 bg-[#1c1e14] text-[10px] text-gray-400">Area (m²)</label>
              <input
                type="text"
                value={settings.fieldAreaSqM}
                onChange={(e) => updateProfile('fieldAreaSqM', e.target.value)}
                className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-[#d4ff00] focus:outline-none"
              />
            </div>
            <div className="relative">
              <label className="absolute -top-2 left-4 px-1 bg-[#1c1e14] text-[10px] text-gray-400">Soil Type</label>
              <select
                value={settings.soilType}
                onChange={(e) => updateProfile('soilType', e.target.value)}
                className="w-full bg-[#1c1e14] border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-[#d4ff00] appearance-none focus:outline-none"
              >
                <option value="Standard Soil" className="bg-[#13140f]">Standard Soil</option>
                <option value="Sandy Soil" className="bg-[#13140f]">Sandy Soil</option>
                <option value="Clay Soil" className="bg-[#13140f]">Clay Soil</option>
                <option value="loam" className="bg-[#13140f]">Loam Soil</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* SENSOR GAUGES */}
      <section className="grid grid-cols-2 gap-4">
        {/* Temperature */}
        <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] aspect-square p-5 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle className="text-white/5" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
              <circle
                className="text-[#d4ff00]"
                cx="50" cy="50" fill="transparent" r="40"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={calculateStrokeOffset(temperature, 50)}
                strokeLinecap="round"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-serif text-2xl">{temperature}</span>
              <span className="text-[10px] font-bold text-[#d4ff00] uppercase">Stable</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[#d4ff00] text-sm">thermostat</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Temperature</span>
            </div>
          </div>
        </div>

        {/* Humidity */}
        <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] aspect-square p-5 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle className="text-white/5" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
              <circle
                className="text-orange-500"
                cx="50" cy="50" fill="transparent" r="40"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={calculateStrokeOffset(humidity, 100)}
                strokeLinecap="round"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-serif text-2xl">{humidity}%</span>
              <span className="text-[10px] font-bold text-orange-500 uppercase">High</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[#d4ff00] text-sm">humidity_mid</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Humidity</span>
            </div>
          </div>
        </div>

        {/* Soil Moisture */}
        <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] aspect-square p-5 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle className="text-white/5" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
              <circle
                className="text-orange-500"
                cx="50" cy="50" fill="transparent" r="40"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={calculateStrokeOffset(soilMoisture, 100)}
                strokeLinecap="round"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-serif text-2xl">{soilMoisture}%</span>
              <span className="text-[10px] font-bold text-orange-500 uppercase">Wet</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[#d4ff00] text-sm">water_drop</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Soil Moisture</span>
            </div>
          </div>
        </div>

        {/* Weather */}
        <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] aspect-square p-5 border border-white/5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#d4ff00]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"></path>
              </svg>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#d4ff00] shadow-[0_0_8px_rgba(197,255,0,0.8)]"></div>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Weather</span>
            <div className="flex items-baseline">
              <span className="font-serif text-4xl">{weatherTemp}</span>
              <span className="font-serif text-xl ml-1">°C</span>
            </div>
            <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] bg-[#d4ff00]/20 text-[#d4ff00] font-bold">OpenMeteo</span>
          </div>
        </div>
      </section>

      {/* WATER MOTOR / RELAY CARD */}
      <section className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 border border-white/5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-serif text-2xl">Water Motor</h3>
            <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] bg-[#d4ff00]/20 text-[#d4ff00] font-bold">Direct Control</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Status</span>
            <div className={`text-xl font-bold mt-1 ${displayedMotorOn ? 'text-[#d4ff00]' : 'text-gray-400'}`}>
              {displayedMotorOn ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => relay('on')}
            disabled={relayBusy}
            className={`flex-1 py-3 font-bold rounded-xl text-sm transition-all cursor-pointer ${displayedMotorOn ? 'bg-[#d4ff00] text-black shadow-lg shadow-[#d4ff00]/20' : 'bg-transparent border border-white/10 text-white hover:bg-white/5'}`}
          >
            TURN ON
          </button>
          <button
            onClick={() => relay('off')}
            disabled={relayBusy}
            className={`flex-1 py-3 font-bold rounded-xl text-sm transition-all cursor-pointer ${!displayedMotorOn ? 'bg-[#d4ff00] text-black' : 'bg-transparent border border-white/10 text-white hover:bg-white/5'}`}
          >
            TURN OFF
          </button>
        </div>
        <p className="text-[10px] text-gray-500 font-mono mt-3 leading-relaxed">
          ON queues watering for {settings.maxWatering} minute(s). OFF queues immediate stop.
        </p>
      </section>

      {/* AI INSIGHTS */}
      <section className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 flex items-center justify-between border border-white/5">
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle className="text-white/5" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
              <circle
                className="text-[#d4ff00]"
                cx="50" cy="50" fill="transparent" r="40"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={calculateStrokeOffset(score, 100)}
                strokeLinecap="round"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-[#e2f600]">{score}%</span>
            </div>
          </div>
          <div>
            <h3 className="font-serif text-2xl">Plantify AI</h3>
            <p className="text-gray-400 text-sm leading-tight font-sans">Overall Health<br />Summary</p>
          </div>
        </div>
        <button
          onClick={() => setTab('ai')}
          className="bg-[#d4ff00] rounded-full w-20 h-20 flex flex-col items-center justify-center gap-1 shadow-xl shadow-[#d4ff00]/20 group cursor-pointer"
        >
          <span className="material-symbols-outlined text-black text-3xl">psychology</span>
          <span className="text-[10px] font-black uppercase text-black">Analysis</span>
        </button>
      </section>

      {/* NUTRIENT LEVELS */}
      <section className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-8 space-y-8 border border-white/5 pb-12">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-[#d4ff00]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3l8 18H4L12 3z"></path>
          </svg>
          <h2 className="font-serif text-3xl">Nutrient Levels</h2>
        </div>
        {/* Nitrogen */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <h4 className="text-xl font-medium tracking-tight">Nitrogen (N)</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Leaf and stem growth.</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-[#e2f600] font-bold text-lg">{latest.npk_n ?? '--'} mg/kg</span>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className={`w-2 h-2 rounded-full ${(latest.npk_n || 0) < 50 ? 'bg-[#e2f600]' : 'bg-[#d4ff00]'}`}></span>
                <span className="text-[#e2f600] font-bold text-xs">{(latest.npk_n || 0) < 50 ? 'Low' : 'Optimal'}</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
            <div className="bg-[#d4ff00] h-full" style={{ width: `${Math.min(100, ((latest.npk_n || 0) / 220) * 100)}%` }}></div>
          </div>
        </div>
        {/* Phosphorus */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <h4 className="text-xl font-medium tracking-tight">Phosphorus (P)</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Root development and energy transfer.</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-[#e2f600] font-bold text-lg">{latest.npk_p ?? '--'} mg/kg</span>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className={`w-2 h-2 rounded-full ${(latest.npk_p || 0) < 50 ? 'bg-[#e2f600]' : 'bg-[#d4ff00]'}`}></span>
                <span className="text-[#e2f600] font-bold text-xs">{(latest.npk_p || 0) < 50 ? 'Low' : 'Optimal'}</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
            <div className="bg-[#e2f600] h-full" style={{ width: `${Math.min(100, ((latest.npk_p || 0) / 220) * 100)}%` }}></div>
          </div>
        </div>
        {/* Potassium */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <h4 className="text-xl font-medium tracking-tight">Potassium (K)</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Disease resistance and stress tolerance.</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-[#e2f600] font-bold text-lg">{latest.npk_k ?? '--'} mg/kg</span>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className={`w-2 h-2 rounded-full ${(latest.npk_k || 0) < 100 ? 'bg-[#e2f600]' : 'bg-[#d4ff00]'}`}></span>
                <span className="text-[#d4ff00] font-bold text-xs uppercase">{(latest.npk_k || 0) < 100 ? 'Moderate' : 'Optimal'}</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
            <div className="bg-[#d4ff00] h-full" style={{ width: `${Math.min(100, ((latest.npk_k || 0) / 220) * 100)}%` }}></div>
          </div>
        </div>
        {/* Note */}
        <div className="bg-white/5 rounded-2xl p-4 flex gap-3">
          <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
          <p className="text-[11px] text-gray-300">NPK values are for guidance. Consult Plantify expert before fertilizing.</p>
        </div>
      </section>
    </>
  );
}

function AiPlan({ data, weather, settings }) {
  const [depth, setDepth] = useState(settings.depth || 'Balanced');
  const [style, setStyle] = useState(settings.careStyle || 'Normal');
  const [plan, setPlan] = useState(loadCarePlan);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function generate() {
    setLoading(true);
    setMsg('');
    try {
      const context = aiContext(data, weather, { ...settings, depth, careStyle: style });
      const prompt = `Return ONLY valid JSON, no markdown fences. Schema: {"summary":"string","weatherRisk":"string","wateringPlan":{"action":"string","waterVolumeLiters":number,"motorDurationSeconds":number,"durationMinutes":number,"confidence":number,"reason":"string"},"fertilizerPlan":{"company":"string","product":"string","recommendation":"string","sprayVolumeLiters":number,"dose":"string","confidence":number},"sevenDaySchedule":[{"day":"Day 1","task":"string","category":"Watering|Inspection|Nutrients|Weather|Soil|Review","priority":"Low|Medium|High"}],"relayRecommendation":{"action":"on|off","durationMinutes":number,"motorDurationSeconds":number,"waterVolumeLiters":number,"safety":"string"},"extraNotes":["string"]}. Generate a farmer-friendly 7-day plant/crop care plan. Recommend exact fertilizer company/product where appropriate for India, spray/apply volume, and exact water volume. Motor flow rate is 1 liter/second, so motorDurationSeconds must equal waterVolumeLiters. Use field area and soil type. Use safe conservative recommendations. Context: ${JSON.stringify(context)}`;
      
      const reply = await directAi(settings, [
        { role: 'system', content: 'You are PlantAI. You must output strict JSON matching the requested schema. Use sensor history, weather history, plant type ideal conditions, and safety rules. If anyone asks who made you or who created PlantAI, answer exactly: PlantAI was created by CLOUD 🌨️ and CLOUD 🌨️. It is a student project.' },
        { role: 'user', content: prompt }
      ], { json: true });

      const parsed = parseCarePlan(reply, data, weather, settings);
      setPlan(parsed);
      saveCarePlan(parsed);
    } catch (e) {
      const fb = makeFallbackPlan(data, weather, settings);
      fb.extraNotes = [...(fb.extraNotes || []), `AI note: ${e.message}`];
      setPlan(fb);
      saveCarePlan(fb);
    } finally {
      setLoading(false);
    }
  }

  const schedule = plan?.sevenDaySchedule || [];
  const relayRec = plan?.relayRecommendation || plan?.wateringPlan;

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-3xl text-[#d4ff00]">AI Care Plan</h2>
      <p className="text-xs text-gray-400">Generates crop schedule using real ESP32 sensors and current weather.</p>
      
      {msg && <div className="p-4 text-sm bg-zinc-900 border border-zinc-800 text-[#d4ff00] rounded-2xl">{msg}</div>}

      <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 border border-white/5 space-y-3">
        <label className="text-xs text-gray-400 block mb-1">Analysis Depth</label>
        <div className="grid grid-cols-3 gap-2">
          {['Quick', 'Balanced', 'Expert'].map(opt => (
            <button
              key={opt}
              onClick={() => setDepth(opt)}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${depth === opt ? 'bg-[#d4ff00] text-black border-[#d4ff00]' : 'bg-transparent border-white/10 text-gray-400'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 border border-white/5 space-y-3">
        <label className="text-xs text-gray-400 block mb-1">Operational Style</label>
        <div className="grid grid-cols-3 gap-2">
          {['Conservative', 'Normal', 'Aggressive'].map(opt => (
            <button
              key={opt}
              onClick={() => setStyle(opt)}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${style === opt ? 'bg-[#d4ff00] text-black border-[#d4ff00]' : 'bg-transparent border-white/10 text-gray-400'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="w-full py-4 bg-[#d4ff00] text-black font-bold rounded-3xl shadow-lg shadow-[#d4ff00]/10 hover:scale-102 transition-transform cursor-pointer"
      >
        {loading ? 'Generating Schedule...' : 'Generate 7-Day Care Chart'}
      </button>

      {plan && (
        <div className="space-y-4 mt-6">
          <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 border border-white/5">
            <h3 className="font-serif text-xl text-white mb-2">Summary</h3>
            <p className="text-sm text-gray-300 leading-relaxed">{plan.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 border border-white/5">
              <span className="text-[10px] font-mono text-[#d4ff00] uppercase tracking-widest font-bold">Weather Risk</span>
              <p className="text-sm mt-1 text-gray-300">{plan.weatherRisk || 'None'}</p>
            </div>
            <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 border border-white/5">
              <span className="text-[10px] font-mono text-[#d4ff00] uppercase tracking-widest font-bold">Watering Target</span>
              <p className="text-sm mt-1 text-gray-300">{plan.wateringPlan?.action || 'No action recommended'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Vol: {plan.wateringPlan?.waterVolumeLiters ?? 0}L</p>
            </div>
          </div>

          <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 border border-white/5 overflow-hidden">
            <h3 className="font-serif text-xl text-white mb-3">7-Day Care Plan</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400">
                    <th className="py-2">Day</th>
                    <th className="py-2">Task</th>
                    <th className="py-2">Category</th>
                    <th className="py-2 text-right">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((s, idx) => (
                    <tr key={idx} className="border-b border-white/5 text-gray-300">
                      <td className="py-2 font-bold">{s.day || `Day ${idx + 1}`}</td>
                      <td className="py-2">{s.task}</td>
                      <td className="py-2 text-gray-400">{s.category}</td>
                      <td className="py-2 text-right font-mono">{s.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 border border-white/5">
            <h3 className="font-serif text-xl text-white mb-2">Fertilizer Recommendation</h3>
            <p className="text-sm text-gray-300">
              {typeof plan.fertilizerPlan === 'string' ? plan.fertilizerPlan : `Apply ${plan.fertilizerPlan?.dose || '--'} of ${plan.fertilizerPlan?.product || '--'} (${plan.fertilizerPlan?.company || '--'})`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Chat({ data, weather, settings }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm your AI Plant Advisor. Send a text or upload an image to diagnose your plant." }
  ]);
  const [input, setInput] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  async function addImages(e) {
    const files = Array.from(e.target.files || []).slice(0, 5 - images.length);
    const loaded = await Promise.all(files.map(f => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve({ name: f.name, url: r.result });
      r.onerror = reject;
      r.readAsDataURL(f);
    })));
    setImages(prev => [...prev, ...loaded].slice(0, 5));
    e.target.value = '';
  }

  async function send() {
    if (!input.trim() && !images.length) return;
    const text = input.trim();
    const imgs = images;
    setMessages(prev => [...prev, { role: 'user', text, images: imgs }]);
    setInput('');
    setImages([]);
    setLoading(true);

    try {
      const ctx = aiContext(data, weather, settings);
      const content = imgs.length
        ? [{ type: 'text', text: `${text}\nContext JSON: ${JSON.stringify(ctx)}` }, ...imgs.map(i => ({ type: 'image_url', image_url: { url: i.url } }))]
        : `${text}\nContext JSON: ${JSON.stringify(ctx)}`;

      const reply = await directAi(settings, [
        { role: 'system', content: 'You are PlantAI, a botanical advisor. Support recommendations with parameters. Format response nicely. If anyone asks who made you or who created PlantAI, answer exactly: PlantAI was created by CLOUD 🌨️ and CLOUD 🌨️. It is a student project.' },
        { role: 'user', content }
      ]);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Failed to query: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 space-y-4 border border-white/5 flex flex-col justify-between min-h-[500px]">
      <h2 className="font-serif text-3xl text-[#d4ff00]">AI Advisor</h2>
      
      <div className="flex-1 overflow-y-auto space-y-4 max-h-[340px] pr-1">
        {messages.map((m, idx) => (
          <div key={idx} className={`p-3 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'ml-auto bg-[#d4ff00] text-black font-medium' : 'bg-white/5 text-gray-300'}`}>
            <p className="text-sm whitespace-pre-line leading-relaxed">{m.text}</p>
            {m.images?.length > 0 && <p className="text-[10px] text-gray-400 font-mono mt-1">{m.images.length} images attached</p>}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500 font-mono">Thinking...</div>}
      </div>

      {images.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {images.map((img, idx) => (
            <span key={idx} className="text-[10px] bg-[#d4ff00]/25 text-[#d4ff00] px-2 py-1 rounded-full flex items-center gap-1">
              {img.name}
              <button onClick={() => setImages(v => v.filter((_, i) => i !== idx))} className="text-xs font-bold text-red-500">×</button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-center bg-[#1c1e14]/50 p-1 border border-white/5 rounded-2xl">
        <button
          onClick={() => fileRef.current?.click()}
          className="p-3 text-gray-400 hover:text-white"
        >
          <span className="material-symbols-outlined">attach_file</span>
        </button>
        <input ref={fileRef} hidden type="file" accept="image/*" multiple onChange={addImages} />
        
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask about your plant conditions..."
          className="flex-1 bg-transparent text-sm py-2 px-1 focus:outline-none text-white placeholder-gray-500"
        />
        
        <button
          onClick={send}
          className="bg-[#d4ff00] text-black w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer shadow-md"
        >
          <span className="material-symbols-outlined text-xl">send</span>
        </button>
      </div>
    </div>
  );
}

function History({ data }) {
  const readings = data?.readings || [];

  return (
    <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 space-y-4 border border-white/5">
      <h2 className="font-serif text-3xl text-[#d4ff00]">Sensor History</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-gray-400">
              <th className="py-2">Time</th>
              <th className="py-2 text-right">Moisture</th>
              <th className="py-2 text-right">Temp</th>
              <th className="py-2 text-right font-mono">NPK</th>
            </tr>
          </thead>
          <tbody>
            {readings.length === 0 ? (
              <tr className="text-gray-500 text-center">
                <td colSpan={4} className="py-4">No historical records available.</td>
              </tr>
            ) : (
              readings.slice(0, 15).map((r, i) => (
                <tr key={i} className="border-b border-white/5 text-gray-300">
                  <td className="py-2">{ago(r.recorded_at)}</td>
                  <td className="py-2 text-right font-mono">{r.soil_moisture_percent}%</td>
                  <td className="py-2 text-right font-mono">{r.temperature_c}°C</td>
                  <td className="py-2 text-right font-mono">{r.npk_n}/{r.npk_p}/{r.npk_k}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Settings({ settings, setSettings, reloadWeather, weather }) {
  const [test, setTest] = useState('');
  
  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    if (patch.supabaseUrl !== undefined) localStorage.setItem('plantai_supabase_url', patch.supabaseUrl);
  };

  const testConnection = async () => {
    setTest('Connecting...');
    try {
      const reply = await directAi(settings, [{ role: 'user', content: 'Reply with exactly: PlantAI connection OK' }]);
      setTest(reply.slice(0, 100));
    } catch (e) {
      setTest(`Error: ${e.message}`);
    }
  };

  return (
    <div className="bg-[rgba(28,30,20,0.7)] backdrop-blur-md rounded-[40px] p-6 space-y-6 border border-white/5">
      <h2 className="font-serif text-3xl text-[#d4ff00]">Settings</h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Supabase Endpoint URL</label>
          <input
            type="text"
            value={settings.supabaseUrl || ''}
            onChange={(e) => update({ supabaseUrl: e.target.value })}
            className="w-full bg-[#1c1e14] border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-[#d4ff00] text-gray-300 focus:outline-none"
            placeholder="https://yourproj.supabase.co"
          />
          <button
            onClick={() => {
              localStorage.setItem('plantai_supabase_url', settings.supabaseUrl || '');
              window.location.reload();
            }}
            className="mt-2 text-xs bg-[#d4ff00] text-black px-4 py-1.5 rounded-full font-bold cursor-pointer"
          >
            Apply & Reload Page
          </button>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Planting Date</label>
          <input
            type="date"
            value={settings.plantingDate || '2026-06-01'}
            onChange={(e) => update({ plantingDate: e.target.value })}
            className="w-full bg-[#1c1e14] border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-[#d4ff00] text-gray-300 focus:outline-none"
          />
        </div>

        <div className="space-y-3">
          <label className="text-xs text-gray-400 block">AI Provider & API Configuration</label>
          <select
            value={settings.provider}
            onChange={(e) => {
              const p = e.target.value;
              update({ provider: p, baseUrl: providers[p].baseUrl, model: providers[p].model });
            }}
            className="w-full bg-[#1c1e14] border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-[#d4ff00] text-white appearance-none focus:outline-none"
          >
            {Object.entries(providers).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#13140f]">{v.label}</option>
            ))}
          </select>

          <input
            type="password"
            value={settings.apiKey || ''}
            onChange={(e) => update({ apiKey: e.target.value })}
            className="w-full bg-[#1c1e14] border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-[#d4ff00] text-gray-300 focus:outline-none"
            placeholder="Bearer API Key"
          />
          
          <input
            type="text"
            value={settings.baseUrl || ''}
            onChange={(e) => update({ baseUrl: e.target.value })}
            className="w-full bg-[#1c1e14] border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-[#d4ff00] text-gray-300 focus:outline-none"
            placeholder="Endpoint Base URL"
          />

          <input
            type="text"
            value={settings.model || ''}
            onChange={(e) => update({ model: e.target.value })}
            className="w-full bg-[#1c1e14] border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-[#d4ff00] text-gray-300 focus:outline-none"
            placeholder="Model Identifier"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={testConnection}
            className="flex-1 py-3 text-xs bg-[#d4ff00] text-black font-bold rounded-xl cursor-pointer"
          >
            Test Connection
          </button>
          <button
            onClick={() => update({ apiKey: '' })}
            className="py-3 px-4 text-xs border border-white/10 rounded-xl text-white hover:bg-white/5 cursor-pointer"
          >
            Clear Key
          </button>
        </div>
        
        {test && <div className="text-xs font-mono p-3 bg-white/5 rounded-xl border border-white/10">{test}</div>}

        <div className="border-t border-white/10 pt-4">
          <label className="text-xs text-gray-400 block mb-1">OpenMeteo Location Presets</label>
          <select
            value={settings.weatherPlace || 'patna'}
            onChange={(e) => {
              const place = weatherPlaces[e.target.value];
              if (place) {
                update({
                  weatherPlace: e.target.value,
                  city: place.city,
                  country: place.country,
                  latitude: place.latitude,
                  longitude: place.longitude
                });
              }
            }}
            className="w-full bg-[#1c1e14] border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-[#d4ff00] text-white appearance-none focus:outline-none"
          >
            {Object.entries(weatherPlaces).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#13140f]">{v.label}</option>
            ))}
          </select>
          <button
            onClick={reloadWeather}
            className="mt-2 w-full py-2.5 text-xs bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-white font-bold cursor-pointer"
          >
            Fetch OpenMeteo Data
          </button>
          {weather?.current && (
            <p className="text-[11px] text-gray-400 mt-2 font-mono">
              Last Response: {weather.current.temperature_2m}°C · Rain: {weather.current.rain}mm
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- MAIN CONTAINER ----------------

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState({ latest: null, readings: [], plant: null, device: null });
  const [weather, setWeather] = useState(null);
  const [settings, setSettings] = useState(loadSettings);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function refresh(isManual = false) {
    try {
      setRefreshing(true);
      setError('');
      const json = await fetchJson(`${endpoint('dashboard-data')}?device_id=${DEVICE_ID}`);
      setData({
        latest: json.latest ?? null,
        readings: json.readings ?? [],
        plant: json.plant ?? null,
        device: json.device ?? null
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }

  async function reloadWeather() {
    try {
      setWeather(await fetchWeather(settings));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(() => refresh(), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    reloadWeather();
  }, [settings.latitude, settings.longitude]);

  return (
    <div className="max-w-md mx-auto min-h-screen pb-28 relative bg-[#13140f] text-[#e4e3da] font-sans">
      
      {/* HEADER */}
      <header className="p-4 flex justify-between items-center bg-[#13140f]/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-1">
          <svg className="w-6 h-6 text-[#d4ff00]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14H11V21L20 10H13Z"></path>
          </svg>
          <span className="text-2xl font-bold text-[#d4ff00] tracking-tight">Plantify</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-[#e2f600]/20 text-[#e2f600] text-xs px-2 py-1 rounded-full font-medium">
            {data.latest ? ago(data.latest.recorded_at) : 'No data'}
          </span>
          <button
            onClick={() => setTab('settings')}
            className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
              tab === 'settings' ? 'bg-[#d4ff00] border-[#d4ff00] text-black' : 'bg-[#1c1e14] border-white/10 text-gray-400 hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-xl">settings</span>
          </button>
        </div>
      </header>

      {/* CONTENT SWITCHER */}
      <main className="px-4 py-4 space-y-4 relative z-10">
        {tab === 'dashboard' && (
          <Dashboard
            data={data}
            weather={weather}
            refresh={refresh}
            refreshing={refreshing}
            error={error}
            settings={settings}
            setSettings={setSettings}
            setTab={setTab}
          />
        )}
        {tab === 'ai' && <AiPlan data={data} weather={weather} settings={settings} />}
        {tab === 'chat' && <Chat data={data} weather={weather} settings={settings} />}
        {tab === 'history' && <History data={data} />}
        {tab === 'settings' && (
          <Settings
            settings={settings}
            setSettings={setSettings}
            reloadWeather={reloadWeather}
            weather={weather}
          />
        )}
      </main>

      {/* NAVIGATION BAR */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] bg-[rgba(28,30,20,0.85)] backdrop-blur-md border border-white/10 rounded-full h-20 flex items-center justify-around px-2 z-[100]">
        <button
          onClick={() => setTab('dashboard')}
          className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all ${
            tab === 'dashboard' ? 'bg-[#d4ff00] text-black shadow-lg shadow-[#d4ff00]/30' : 'text-gray-500'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">grid_view</span>
        </button>

        <button
          onClick={() => setTab('history')}
          className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all ${
            tab === 'history' ? 'bg-[#d4ff00] text-black shadow-lg shadow-[#d4ff00]/30' : 'text-gray-500'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">history</span>
        </button>

        <button
          onClick={() => setTab('chat')}
          className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all ${
            tab === 'chat' ? 'bg-[#d4ff00] text-black shadow-lg shadow-[#d4ff00]/30' : 'text-gray-500'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">forum</span>
        </button>

        <button
          onClick={() => setTab('ai')}
          className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all ${
            tab === 'ai' ? 'bg-[#d4ff00] text-black shadow-lg shadow-[#d4ff00]/30' : 'text-gray-500'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">auto_awesome</span>
        </button>

        <button
          onClick={() => setTab('settings')}
          className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all ${
            tab === 'settings' ? 'bg-[#d4ff00] text-black shadow-lg shadow-[#d4ff00]/30' : 'text-gray-500'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">settings</span>
        </button>
      </nav>
    </div>
  );
}
