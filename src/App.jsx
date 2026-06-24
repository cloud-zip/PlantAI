import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Avatar, Badge, Box, Button, Card, CardContent, Chip, CircularProgress, Container,
  CssBaseline, Divider, FormControl, IconButton, InputAdornment, LinearProgress, List, ListItem,
  ListItemText, MenuItem, Paper, Select, Slider, Stack, Switch, TextField, ThemeProvider,
  Typography, createTheme, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import EnergySavingsLeafIcon from '@mui/icons-material/EnergySavingsLeaf';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import ThermostatIcon from '@mui/icons-material/DeviceThermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import ScienceIcon from '@mui/icons-material/Science';
import PowerIcon from '@mui/icons-material/PowerSettingsNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BoltIcon from '@mui/icons-material/Bolt';
import ShieldIcon from '@mui/icons-material/Shield';
import MemoryIcon from '@mui/icons-material/Memory';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import PlaceIcon from '@mui/icons-material/Place';

const GOLD = {
  surface: '#12140e', lowest: '#0d0f09', low: '#1a1c16', container: '#1e201a', high: '#292b24', highest: '#34362e',
  text: '#e3e3d9', variant: '#c3caac', outline: '#8d9479', outlineVariant: '#434933', lime: '#bef500', limeDim: '#a6d700', secondary: '#e0f031', tertiary: '#e0eb6f', error: '#ffb4ab', errorContainer: '#93000a'
};
function getRuntimeSupabaseUrl() { try { return JSON.parse(localStorage.getItem('plantai_settings') || '{}').supabaseUrl || localStorage.getItem('plantai_supabase_url') || import.meta.env.VITE_SUPABASE_URL || ''; } catch { return localStorage.getItem('plantai_supabase_url') || import.meta.env.VITE_SUPABASE_URL || ''; } }
const SUPABASE_URL = getRuntimeSupabaseUrl();
const DEVICE_ID = 'esp32-field-001';
const endpoint = (name) => { const url = getRuntimeSupabaseUrl(); return url ? `${url.replace(/\/$/, '')}/functions/v1/${name}` : ''; };

const providers = {
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'qwen/qwen-3.5-flash' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  groq: { label: 'GroqCloud', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant' },
  nvidia: { label: 'Nvidia NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', model: 'moonshotai/kimi-k2-instruct' },
  custom: { label: 'Custom OpenAI-Compatible', baseUrl: '', model: '' },
};
const plantProfiles = {
  rice: { label: 'Rice / Paddy (Oryza sativa)', ideal: 'Warm climate 20-35°C, high water availability, humidity 60-80%, moist/flooded soil depending stage, nitrogen demand moderate-high.' },
  wheat: { label: 'Wheat (Triticum aestivum)', ideal: 'Cool season crop, 15-25°C ideal, moderate moisture, avoid waterlogging, balanced NPK during tillering and grain filling.' },
  barley: { label: 'Barley (Hordeum vulgare)', ideal: 'Cool dry climate, 12-25°C, moderate-low water needs, well-drained soil, tolerant to salinity/drought.' },
  millet: { label: 'Millet / Bajra/Ragi', ideal: 'Warm and drought tolerant, 25-35°C, low-moderate water, well-drained soil, avoid overwatering.' },
  tomato: { label: 'Tomato', ideal: '20-30°C, soil moisture 45-70%, avoid leaf wetness, potassium important during fruiting.' },
  rose: { label: 'Rose', ideal: '18-30°C, 50-70% humidity, moist but not soggy soil, potassium and phosphorus support flowering.' },
  marigold: { label: 'Marigold', ideal: '18-30°C, moderate water, sunny location, well-drained soil, avoid excess nitrogen.' },
  jasmine: { label: 'Jasmine', ideal: '20-32°C, moderate humidity, moist well-drained soil, phosphorus supports flowering.' },
  hibiscus: { label: 'Hibiscus', ideal: '20-35°C, moisture 45-70%, high light, potassium supports blooms.' },
  sunflower: { label: 'Sunflower', ideal: '20-30°C, moderate water, full sun, deep well-drained soil, avoid waterlogging.' },
  orchid: { label: 'Orchid', ideal: '18-30°C, humidity 50-80%, airy medium, avoid standing water, weak balanced fertilizer.' },
  custom: { label: 'Custom Plant', ideal: 'Use plant name and sensor history to infer ideal conditions cautiously.' },
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
  supabaseUrl: SUPABASE_URL, plantType: 'tomato', plantName: 'Demo Tomato', city: 'Patna', country: 'India', latitude: 25.5941, longitude: 85.1376, weatherPlace: 'patna', fieldAreaSqM: 10, soilType: 'loam', useVirtualSoil: false, secretUnlocked: false, showKey: false,
};

const theme = createTheme({
  palette: { mode: 'dark', primary: { main: GOLD.lime, contrastText: '#151f00' }, secondary: { main: GOLD.secondary }, error: { main: GOLD.error }, background: { default: GOLD.surface, paper: GOLD.container }, text: { primary: GOLD.text, secondary: GOLD.variant } },
  shape: { borderRadius: 18 },
  typography: { fontFamily: '"Google Sans", system-ui, sans-serif', h1: { fontFamily: 'Playfair Display', fontWeight: 800 }, h2: { fontFamily: 'Playfair Display', fontWeight: 700 }, h3: { fontFamily: 'Playfair Display', fontWeight: 700 }, h4: { fontFamily: 'Playfair Display', fontWeight: 700 }, h5: { fontFamily: 'Playfair Display', fontWeight: 700 }, h6: { fontWeight: 800 }, button: { textTransform: 'none', fontWeight: 900 } },
  components: { MuiButton: { styleOverrides: { root: { minHeight: 44, borderRadius: 999 }, containedPrimary: { boxShadow: '0 0 24px rgba(190,245,0,.28)' } } }, MuiChip: { styleOverrides: { root: { maxWidth: '100%' } } }, MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,.035)', borderRadius: 16 } } } }, MuiSelect: { styleOverrides: { root: { background: 'rgba(255,255,255,.035)', borderRadius: 16 } } } }
});

function loadSettings() { try { return { ...defaultSettings, ...(JSON.parse(localStorage.getItem('plantai_settings') || '{}')) }; } catch { return defaultSettings; } }
function saveSettings(s) { localStorage.setItem('plantai_settings', JSON.stringify(s)); }
function setCookie(name, value, days = 30) { document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${days * 86400}; path=/; SameSite=Lax`; }
function getCookie(name) { return document.cookie.split('; ').find(x => x.startsWith(`${name}=`))?.split('=')[1]; }
function fmtTime(v) { if (!v) return 'No update yet'; return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)); }
function ago(v) { if (!v) return 'unknown'; const m = Math.round(Math.max(0, Date.now() - new Date(v).getTime()) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; const h = Math.round(m / 60); return `${h}h ago`; }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function statusMoisture(v) { const n = num(v); if (n === null) return ['No data', 'default']; if (n < 30) return ['Dry', 'error']; if (n > 75) return ['Wet', 'warning']; return ['Optimal', 'primary']; }
function statusRange(v, low, high) { const n = num(v); if (n === null) return ['No data', 'default']; if (n < low) return ['Low', 'warning']; if (n > high) return ['High', 'warning']; return ['Stable', 'primary']; }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
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
  if (temp !== null) { if (temp < 15 || temp > 40) score -= 18; else if (temp < 18 || temp > 35) score -= 8; }
  else score -= 8;
  if (hum !== null) { if (hum < 30 || hum > 90) score -= 12; else if (hum < 40 || hum > 82) score -= 5; }
  else score -= 6;
  if (soil !== null) { if (soil < 25 || soil > 82) score -= 22; else if (soil < 35 || soil > 72) score -= 8; }
  else score -= 10;
  [n, ph, k].forEach(x => { if (x === null || x <= 0) score -= 4; else if (x < 25 || x > 220) score -= 7; });
  const rainToday = num(weather?.current?.rain) || 0;
  if (rainToday > 20 && soil !== null && soil > 70) score -= 8;
  if (settings.useVirtualSoil) score -= 3;
  return Math.round(clamp(score, 35, 99));
}

function estimateVirtualSoilForTime(reading, allReadings, weather, settings) {
  const t = new Date(reading?.recorded_at || Date.now()).getTime();
  const daily = weather?.daily || {};
  let rainScore = 0;
  if (Array.isArray(daily.time)) {
    daily.time.forEach((day, i) => {
      const dt = new Date(day + 'T12:00:00').getTime();
      const ageDays = (t - dt) / 86400000;
      if (ageDays >= 0 && ageDays <= 7) rainScore += Number(daily.rain_sum?.[i] || daily.precipitation_sum?.[i] || 0) * Math.max(0.25, 1 - ageDays / 8);
    });
  }
  const relayBoost = (allReadings || []).filter(r => {
    const rt = new Date(r.recorded_at || 0).getTime();
    return r.relay_motor_on && rt <= t && t - rt <= 24 * 3600000;
  }).length * 4;
  const soilBase = settings.soilType === 'clay' ? 50 : settings.soilType === 'sandy' ? 28 : settings.soilType === 'silt' ? 42 : 38;
  const areaPenalty = Math.min(12, Math.max(0, Number(settings.fieldAreaSqM || 10) - 10) * 0.15);
  return Math.round(clamp(soilBase + rainScore * 3.2 + relayBoost - areaPenalty, 8, 92));
}
function effectiveReading(reading, allReadings, weather, settings) {
  const row = { ...(reading || {}) };
  const broken = row.soil_moisture_raw >= 4090 || row.soil_moisture_percent === 0 || row.soil_moisture_percent == null;
  if (settings.useVirtualSoil && broken) {
    row.soil_moisture_percent = estimateVirtualSoilForTime(row, allReadings, weather, settings);
    row.soil_sensor_type = 'virtual_rain_watering_estimate';
  }
  return row;
}
function effectiveLatest(data, weather, settings) {
  const latest = { ...(data.latest || {}) };
  const broken = latest.soil_moisture_raw >= 4090 || latest.soil_moisture_percent === 0 || latest.soil_moisture_percent == null;
  if (settings.useVirtualSoil && broken) {
    latest.soil_moisture_percent = estimateVirtualSoil(data, weather, settings);
    latest.soil_sensor_type = 'virtual_rain_watering_estimate';
  }
  return latest;
}

async function fetchJson(url, options = {}) { const res = await fetch(url, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) } }); const json = await res.json().catch(() => ({})); if (!res.ok) throw new Error(json.error || `Request failed ${res.status}`); return json; }

function GlassCard({ children, sx = {}, className = '' }) { return <Card className={`glass-card ${className}`} elevation={0} sx={{ borderRadius: { xs: 4, sm: 5 }, overflow: 'visible', ...sx }}>{children}</Card>; }
function SoftPanel({ children, sx = {} }) { return <Paper className="glass-soft" elevation={0} sx={{ p: 2, borderRadius: 4, overflow: 'hidden', ...sx }}>{children}</Paper>; }
function renderInline(text) {
  const parts = String(text || '').split(/(\*\*.*?\*\*|`.*?`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <Box component="strong" key={i} sx={{ color: GOLD.lime, fontWeight: 900 }}>{part.slice(2, -2)}</Box>;
    if (part.startsWith('`') && part.endsWith('`')) return <Box component="code" key={i} className="mono" sx={{ px: .6, py: .15, borderRadius: 1, bgcolor: 'rgba(190,245,0,.10)', color: GOLD.secondary }}>{part.slice(1, -1)}</Box>;
    return part;
  });
}
function MarkdownText({ text }) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const nodes = [];
  let list = [];
  let table = [];
  const flushList = () => { if (list.length) { nodes.push(<Box component="ul" key={`ul-${nodes.length}`} sx={{ pl: 2.8, my: .5 }}>{list.map((x, i) => <Box component="li" key={i} sx={{ mb: .55, color: GOLD.text }}><Typography component="span">{renderInline(x)}</Typography></Box>)}</Box>); list = []; } };
  const flushTable = () => { if (table.length) { const rows = table.filter(r => !/^\s*\|?\s*:?-{2,}/.test(r)).map(r => r.split('|').map(c => c.trim()).filter(Boolean)); const [head, ...body] = rows; nodes.push(<Box key={`tbl-${nodes.length}`} sx={{ overflowX: 'auto', my: 1.5, border: `1px solid ${GOLD.outlineVariant}`, borderRadius: 3 }}><Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>{head && <Box component="thead"><Box component="tr">{head.map((c, i) => <Box component="th" key={i} className="mono" sx={{ textAlign: 'left', p: 1.2, color: GOLD.lime, borderBottom: `1px solid ${GOLD.outlineVariant}`, fontSize: 12 }}>{c}</Box>)}</Box></Box>}<Box component="tbody">{body.map((r, i) => <Box component="tr" key={i}>{r.map((c, j) => <Box component="td" key={j} sx={{ p: 1.2, borderBottom: `1px solid rgba(255,255,255,.05)`, color: GOLD.text }}>{renderInline(c)}</Box>)}</Box>)}</Box></Box></Box>); table = []; } };
  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) { flushList(); flushTable(); return; }
    if (line.includes('|') && line.split('|').filter(Boolean).length >= 2) { flushList(); table.push(line); return; }
    flushTable();
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flushList(); const level = h[1].length; nodes.push(<Typography key={idx} className="display" variant={level <= 2 ? 'h5' : 'h6'} sx={{ mt: 1.8, color: level <= 2 ? GOLD.lime : GOLD.text }}>{renderInline(h[2])}</Typography>); return; }
    const bullet = line.match(/^([-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) { list.push(bullet[2]); return; }
    flushList();
    nodes.push(<Typography key={idx} sx={{ color: GOLD.text, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{renderInline(line)}</Typography>);
  });
  flushList(); flushTable();
  return <Stack spacing={.75}>{nodes}</Stack>;
}
function AppBar({ latest }) { return <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20, height: { xs: 64, sm: 72 }, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(18,20,14,.74)', backdropFilter: 'blur(28px)', borderBottom: '1px solid rgba(255,255,255,.08)' }}><Stack direction="row" gap={1.2} alignItems="center"><EnergySavingsLeafIcon sx={{ color: GOLD.lime }} /><Typography className="display" variant="h5" color="primary">PlantAI</Typography></Stack><Stack direction="row" gap={1} alignItems="center"><Chip size="small" label={latest ? ago(latest.recorded_at) : 'waiting'} color={latest ? 'primary' : 'default'} /><Avatar sx={{ width: 38, height: 38, bgcolor: GOLD.high, border: `1px solid ${GOLD.limeDim}` }}><LocalFloristIcon /></Avatar></Stack></Box>; }
function BottomNav({ tab, setTab }) { const items = [['dashboard', DashboardIcon], ['ai', PsychologyIcon], ['chat', ChatIcon], ['history', HistoryIcon], ['settings', SettingsIcon]]; return <Paper className="glass-card" sx={{ position: 'fixed', left: 16, right: 16, bottom: 18, height: 78, borderRadius: 999, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-around', px: 1.5, overflow: 'visible' }}>{items.map(([id, Icon]) => <IconButton key={id} onClick={() => setTab(id)} aria-label={id} sx={{ width: tab === id ? 56 : 48, height: tab === id ? 56 : 48, color: tab === id ? '#151f00' : 'rgba(227,227,217,.62)', bgcolor: tab === id ? GOLD.lime : 'transparent', boxShadow: tab === id ? '0 0 22px rgba(190,245,0,.38)' : 'none', '&:hover': { bgcolor: tab === id ? GOLD.lime : 'rgba(255,255,255,.06)' } }}><Icon /></IconButton>)}</Paper>; }
function PageTitle({ title, subtitle }) { return <Box textAlign="center" sx={{ mb: 1 }}><Typography className="display" variant="h3">{title}</Typography><Typography color="text.secondary" sx={{ maxWidth: 430, mx: 'auto' }}>{subtitle}</Typography></Box>; }
function Segmented({ options, value, setValue }) { return <Box sx={{ display: 'flex', p: .75, bgcolor: 'rgba(13,15,9,.55)', borderRadius: 3, gap: .75 }}>{options.map(o => <Button key={o} fullWidth onClick={() => setValue(o)} variant={value === o ? 'contained' : 'text'} sx={{ borderRadius: 2 }}>{o}</Button>)}</Box>; }

function SensorTile({ title, value, unit, icon: Icon, status, color = GOLD.lime }) { return <GlassCard sx={{ minHeight: { xs: 154, sm: 178 }, p: 0 }}><CardContent sx={{ height: '100%', p: 2.2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}><Stack direction="row" justifyContent="space-between"><Box sx={{ p: 1.2, borderRadius: 3, color, bgcolor: `${color}20`, border: `1px solid ${color}35` }}><Icon /></Box><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 10px ${color}` }} /></Stack><Box><Typography className="mono" sx={{ color: GOLD.variant, fontSize: 12, textTransform: 'uppercase' }}>{title}</Typography><Stack direction="row" alignItems="baseline" gap={.5}><Typography className="display" variant="h4">{value ?? '--'}</Typography><Typography className="mono" color="text.secondary">{unit}</Typography></Stack><Chip size="small" label={status[0]} color={status[1]} sx={{ mt: .5, height: 26 }} /></Box></CardContent></GlassCard>; }
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
function Dashboard({ data, weather, refresh, refreshing, error, settings, setSettings }) {
  const latest = effectiveLatest(data, weather, settings);
  const [relayMsg, setRelayMsg] = useState('');
  const [relayBusy, setRelayBusy] = useState(false);
  const [relayOverride, setRelayOverride] = useState(null);
  const displayedMotorOn = relayOverride ?? Boolean(latest.relay_motor_on);
  const moisture = statusMoisture(latest.soil_moisture_percent);
  const temp = statusRange(latest.temperature_c, 18, 38);
  const humidity = statusRange(latest.humidity_percent, 35, 80);
  const score = computeHealthScore(latest, weather, settings);
  const health = score < 60 ? 'Needs Attention' : score < 80 ? 'Watch Closely' : 'Stable';
  async function relay(action) {
    setRelayBusy(true); setRelayMsg('');
    try {
      const duration = action === 'on' ? Number(settings.maxWatering || 1) : 0;
      const result = await queueRelayCommand(action, duration, `Dashboard direct ${action.toUpperCase()} command`);
      setRelayOverride(action === 'on');
      setRelayMsg(result.message || `Motor ${action.toUpperCase()} command queued. ESP32 will pick it up on next poll.`);
      setTimeout(() => refresh(true), 1200);
      setTimeout(() => refresh(true), 6000);
    } catch (e) { setRelayMsg(`Relay error: ${e.message}`); }
    finally { setRelayBusy(false); }
  }
  return <Stack spacing={3}>
    <GlassCard className="leaf-hero" sx={{ overflow: 'hidden' }}><Box sx={{ minHeight: 310, p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'end', position: 'relative' }}><Box sx={{ position: 'absolute', top: 28, right: 22, width: 124, height: 124, borderRadius: '50%', background: 'radial-gradient(circle, rgba(190,245,0,.28), transparent 62%)', filter: 'blur(6px)' }} /><Chip label={health} color="primary" className="lime-glow" sx={{ alignSelf: 'flex-start', mb: 1.4 }} /><Typography className="display" variant="h3">{settings.plantName || data.plant?.name || 'Golden Plant'}</Typography><Typography color="text.secondary" sx={{ maxWidth: 420 }}>{plantProfiles[settings.plantType]?.label || 'Plant'} · {settings.city}, {settings.country}. Last synced {ago(latest.recorded_at)}.</Typography><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}><Typography className="mono" color="primary">ESP32-V2.4</Typography><Button startIcon={refreshing ? <CircularProgress size={18} /> : <RefreshIcon />} onClick={() => refresh(true)} variant="contained">Refresh</Button></Stack></Box></GlassCard>
    <GlassCard><CardContent sx={{ p: 2.2 }}><Typography className="display" variant="h6" mb={1}>Field Profile</Typography><Stack spacing={1.4}><TextField size="small" label="Plant Name" value={settings.plantName} onChange={e => { const next={...settings, plantName:e.target.value}; setSettings(next); saveSettings(next); }} /><FormControl fullWidth size="small"><Select value={settings.plantType} onChange={e => { const next={...settings, plantType:e.target.value}; setSettings(next); saveSettings(next); }}>{Object.entries(plantProfiles).map(([k,v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}</Select></FormControl><Stack direction="row" gap={1}><TextField size="small" label="Area (m²)" value={settings.fieldAreaSqM} onChange={e => { const next={...settings, fieldAreaSqM:e.target.value}; setSettings(next); saveSettings(next); }} /><FormControl fullWidth size="small"><Select value={settings.soilType} onChange={e => { const next={...settings, soilType:e.target.value}; setSettings(next); saveSettings(next); }}><MenuItem value="loam">Loam Soil</MenuItem><MenuItem value="clay">Clay Soil</MenuItem><MenuItem value="sandy">Sandy Soil</MenuItem><MenuItem value="silt">Silt Soil</MenuItem><MenuItem value="mixed">Mixed Soil</MenuItem></Select></FormControl></Stack></Stack></CardContent></GlassCard>
    {settings.useVirtualSoil && <Alert severity="warning">Secret virtual soil moisture mode is ON. Soil moisture is estimated from rain/watering history because the physical sensor is unreliable.</Alert>}
    {error && <Alert severity="error">{error}</Alert>}
    {relayMsg && <Alert severity={relayMsg.includes('error') || relayMsg.includes('Set Supabase') ? 'error' : 'success'}>{relayMsg}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}><SensorTile title="Temperature" value={latest.temperature_c} unit="°C" icon={ThermostatIcon} status={temp} /><SensorTile title="Humidity" value={latest.humidity_percent} unit="%" icon={WaterDropIcon} status={humidity} color={GOLD.secondary} /><SensorTile title="Soil Moisture" value={latest.soil_moisture_percent} unit="%" icon={LocalFloristIcon} status={moisture} color={GOLD.tertiary} /><SensorTile title="Weather" value={weather?.current?.temperature_2m ?? '--'} unit="°C" icon={WbSunnyIcon} status={[weather ? 'OpenMeteo' : 'Set location', weather ? 'primary' : 'default']} /></Box>
    <GlassCard><CardContent sx={{ p: 3 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" gap={2} alignItems="center"><Box sx={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', border: `4px solid ${GOLD.highest}`, color: GOLD.lime, boxShadow: '0 0 20px rgba(190,245,0,.18)' }}><Typography className="mono" fontWeight={900}>{score}%</Typography></Box><Box><Typography className="display" variant="h5">AI Insights</Typography><Typography className="mono" color="text.secondary" fontSize={12}>Health Index Score</Typography></Box></Stack><Button variant="contained" startIcon={<PsychologyIcon />}>Reports</Button></Stack></CardContent></GlassCard>
    <NpkCard latest={latest} />
    <MotorCard motorOn={displayedMotorOn} onRelay={relay} busy={relayBusy} settings={settings} />
  </Stack>;
}
function MotorCard({ motorOn = false, onRelay, busy, settings }) { return <GlassCard sx={{ borderLeft: `4px solid ${motorOn ? GOLD.secondary : GOLD.lime} !important` }}><CardContent sx={{ p: 3 }}><Stack spacing={2}><Stack direction="row" justifyContent="space-between"><Stack direction="row" gap={2}><Box sx={{ p: 1.5, borderRadius: 3, bgcolor: motorOn ? 'rgba(224,240,49,.12)' : 'rgba(255,255,255,.04)' }}><PowerIcon color={motorOn ? 'warning' : 'disabled'} /></Box><Box><Typography className="display" variant="h5">Water Motor</Typography><Chip size="small" color="primary" icon={<ShieldIcon />} label="Direct Control" /></Box></Stack><Box textAlign="right"><Typography className="mono" color="text.secondary" fontSize={11}>STATUS</Typography><Typography className="display" variant="h5" color={motorOn ? 'warning.main' : 'text.secondary'}>{motorOn ? 'ON' : 'OFF'}</Typography></Box></Stack><Stack direction="row" gap={1}><Button fullWidth variant={motorOn ? 'contained' : 'outlined'} color="primary" disabled={busy} onClick={() => onRelay('on')} startIcon={busy ? <CircularProgress size={16} /> : <WaterDropIcon />}>TURN ON</Button><Button fullWidth variant={!motorOn ? 'contained' : 'outlined'} color={!motorOn ? 'primary' : 'inherit'} disabled={busy} onClick={() => onRelay('off')} startIcon={<PowerIcon />}>TURN OFF</Button></Stack><Typography className="mono" color="text.secondary" fontSize={11}>ON queues watering for {settings.maxWatering} minute(s). OFF queues immediate stop. No cooldown is applied by the website.</Typography></Stack></CardContent></GlassCard>; }
function NpkCard({ latest = {} }) {
  const rows = [
    ['Nitrogen (N)', latest.npk_n, '#bef500', 'Leaf and stem growth; too much may reduce flowering.'],
    ['Phosphorus (P)', latest.npk_p, '#e0f031', 'Root development, flowering, and early plant energy transfer.'],
    ['Potassium (K)', latest.npk_k, '#e0eb6f', 'Disease resistance, fruit quality, stress tolerance and water regulation.'],
  ];
  return <GlassCard><CardContent sx={{ p: 3 }}><Stack direction="row" gap={1} alignItems="center" mb={2}><ScienceIcon color="primary" /><Typography className="display" variant="h5">Nutrient Levels</Typography></Stack><Stack spacing={2.2}>{rows.map(([label, value, color, desc]) => { const n = Number(value || 0); const status = n <= 0 ? 'Waiting' : n < 50 ? 'Low' : n < 150 ? 'Moderate' : 'High'; return <Box key={label}><Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography className="mono" color="text.secondary" fontSize={12}>{label}</Typography><Typography variant="caption" color="text.secondary">{desc}</Typography></Box><Typography className="mono" sx={{ color, fontWeight: 900 }} fontSize={14}>{value ?? '--'} mg/kg · {status}</Typography></Stack><LinearProgress variant="determinate" value={Math.min(100, (n / 220) * 100)} sx={{ mt: 1, height: 11, borderRadius: 99, bgcolor: GOLD.highest, '& .MuiLinearProgress-bar': { bgcolor: color, boxShadow: `0 0 14px ${color}88` } }} /></Box>; })}</Stack><Alert severity="info" sx={{ mt: 2 }}>NPK values are low-cost sensor guidance. Confirm before applying fertilizer.</Alert></CardContent></GlassCard>;
}
async function fetchWeather(settings) { const { latitude, longitude } = settings; const end = new Date(); const start = new Date(Date.now() - 7 * 86400000); const ds = d => d.toISOString().slice(0, 10); const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,precipitation_probability_max&past_days=7&forecast_days=1&timezone=auto`; const res = await fetch(url); if (!res.ok) throw new Error('Weather fetch failed'); return res.json(); }
function aiContext(data, weather, settings) { return { plant: { name: settings.plantName, type: plantProfiles[settings.plantType]?.label, ideal_conditions: plantProfiles[settings.plantType]?.ideal, location: `${settings.city}, ${settings.country}`, field_area_sq_m: settings.fieldAreaSqM, soil_type: settings.soilType }, latest_sensor_data: effectiveLatest(data, weather, settings), raw_latest_sensor_data: data.latest, sensor_history: (data.readings || []).slice(0, 24), weather_current_and_7day_history: weather, virtual_soil_enabled: settings.useVirtualSoil, motor_flow_rate: '1 liter per second', care_preferences: { depth: settings.depth, style: settings.careStyle, budget: settings.budget } }; }
async function directAi(settings, messages, options = {}) { if (!settings.apiKey) throw new Error('Add an AI API key in Settings first.'); const url = `${settings.baseUrl.replace(/\/$/, '')}/chat/completions`; const body = { model: settings.model, messages, temperature: options.temperature ?? .35 }; if (options.json) body.response_format = { type: 'json_object' }; const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` }, body: JSON.stringify(body) }); const json = await res.json().catch(() => ({})); if (!res.ok) throw new Error(json.error?.message || json.message || `AI request failed ${res.status}`); return json.choices?.[0]?.message?.content || 'No response.'; }
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
function saveCarePlan(plan) { const json = JSON.stringify(plan); const prev = decodeURIComponent(getCookie('plantai_care_plan') || ''); if (prev !== json) setCookie('plantai_care_plan', json); localStorage.setItem('plantai_care_plan', json); localStorage.setItem('plantai_care_plan_updated_at', new Date().toISOString()); }
function loadCarePlan() { try { return JSON.parse(localStorage.getItem('plantai_care_plan') || decodeURIComponent(getCookie('plantai_care_plan') || '') || 'null'); } catch { return null; } }
function CarePlanChart({ plan, onRelay }) {
  if (!plan) return null;
  const schedule = Array.isArray(plan.sevenDaySchedule) ? plan.sevenDaySchedule : [];
  const relay = plan.relayRecommendation || plan.wateringPlan;
  return <Stack spacing={2}>
    <GlassCard><CardContent sx={{ p: 3 }}><Typography className="display" variant="h5" mb={1}>Summary</Typography><MarkdownText text={plan.summary} /></CardContent></GlassCard>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <GlassCard><CardContent sx={{ p: 2.5 }}><Typography className="mono" color="primary" fontSize={12}>WEATHER RISK</Typography><MarkdownText text={plan.weatherRisk || 'No major weather risk reported.'} /></CardContent></GlassCard>
      <GlassCard><CardContent sx={{ p: 2.5 }}><Typography className="mono" color="primary" fontSize={12}>WATERING</Typography><Typography variant="h6">{plan.wateringPlan?.action || 'Not specified'}</Typography><Typography color="text.secondary">Water: {plan.wateringPlan?.waterVolumeLiters ?? '--'} L · Motor: {plan.wateringPlan?.motorDurationSeconds ?? ((plan.wateringPlan?.waterVolumeLiters || 0))} sec · Confidence: {plan.wateringPlan?.confidence ?? '--'}%</Typography><Typography color="text.secondary">{plan.wateringPlan?.reason}</Typography></CardContent></GlassCard>
    </Box>
    <GlassCard><CardContent sx={{ p: 3 }}><Typography className="display" variant="h5" mb={2}>7-Day Care Schedule</Typography><Box sx={{ overflowX: 'auto' }}><Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}><Box component="thead"><Box component="tr">{['Day','Task','Category','Priority'].map(h => <Box component="th" key={h} className="mono" sx={{ textAlign: 'left', color: GOLD.lime, p: 1.2, borderBottom: `1px solid ${GOLD.outlineVariant}` }}>{h}</Box>)}</Box></Box><Box component="tbody">{schedule.map((row, i) => <Box component="tr" key={i}>{[row.day || `Day ${i+1}`, row.task || row.action || '', row.category || 'Care', row.priority || 'Medium'].map((c, j) => <Box component="td" key={j} sx={{ p: 1.2, color: GOLD.text, borderBottom: '1px solid rgba(255,255,255,.06)' }}>{c}</Box>)}</Box>)}</Box></Box></Box></CardContent></GlassCard>
    <GlassCard><CardContent sx={{ p: 3 }}><Typography className="display" variant="h5" mb={1}>Fertilizer / NPK</Typography><MarkdownText text={typeof plan.fertilizerPlan === 'string' ? plan.fertilizerPlan : (`Company: ${plan.fertilizerPlan?.company || 'Not specified'}\nProduct: ${plan.fertilizerPlan?.product || 'Not specified'}\nDose: ${plan.fertilizerPlan?.dose || 'Not specified'}\nSpray/apply volume: ${plan.fertilizerPlan?.sprayVolumeLiters ?? '--'} L\nRecommendation: ${plan.fertilizerPlan?.recommendation || 'No fertilizer recommendation.'}`)} /></CardContent></GlassCard>
    {(relay?.action === 'on' || relay?.action === 'off') && <GlassCard sx={{ borderLeft: `4px solid ${GOLD.lime} !important` }}><CardContent sx={{ p: 3 }}><Typography className="display" variant="h5">Relay Recommendation</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>{relay?.safety || relay?.reason || 'AI requested a relay action. Review before sending.'}</Typography><Stack direction="row" gap={1}>{relay.action === 'on' && <Button variant="contained" onClick={() => onRelay?.('on', relay?.durationMinutes || relay?.duration_minutes || Math.ceil((relay?.motorDurationSeconds || relay?.waterVolumeLiters || 60) / 60))}>Approve ON</Button>}<Button variant={relay.action === 'off' ? 'contained' : 'outlined'} onClick={() => onRelay?.('off', 0)}>Turn OFF</Button></Stack></CardContent></GlassCard>}
    {plan.extraNotes?.length ? <Alert severity="info"><MarkdownText text={Array.isArray(plan.extraNotes) ? plan.extraNotes.join('\n') : plan.extraNotes} /></Alert> : null}
  </Stack>;
}
function AiPlan({ data, weather, settings }) {
  const [depth, setDepth] = useState(settings.depth); const [style, setStyle] = useState(settings.careStyle); const [plan, setPlan] = useState(loadCarePlan); const [loading, setLoading] = useState(false); const [msg, setMsg] = useState('');
  async function relay(action, duration) { try { await queueRelayCommand(action, duration || settings.maxWatering, `AI care plan relay ${action}`); setMsg(`Relay ${action.toUpperCase()} command queued.`); } catch (e) { setMsg(`Relay error: ${e.message}`); } }
  async function generate() { setLoading(true); setMsg(''); try { const context = aiContext(data, weather, { ...settings, depth, careStyle: style }); const prompt = `Return ONLY valid JSON, no markdown fences. Schema: {"summary":"string","weatherRisk":"string","wateringPlan":{"action":"string","waterVolumeLiters":number,"motorDurationSeconds":number,"durationMinutes":number,"confidence":number,"reason":"string"},"fertilizerPlan":{"company":"string","product":"string","recommendation":"string","sprayVolumeLiters":number,"dose":"string","confidence":number},"sevenDaySchedule":[{"day":"Day 1","task":"string","category":"Watering|Inspection|Nutrients|Weather|Soil|Review","priority":"Low|Medium|High"}],"relayRecommendation":{"action":"on|off","durationMinutes":number,"motorDurationSeconds":number,"waterVolumeLiters":number,"safety":"string"},"extraNotes":["string"]}. Generate a farmer-friendly 7-day plant/crop care plan. Recommend exact fertilizer company/product where appropriate for India, spray/apply volume, and exact water volume. Motor flow rate is 1 liter/second, so motorDurationSeconds must equal waterVolumeLiters. Use field area and soil type. Use safe conservative recommendations. Context: ${JSON.stringify(context)}`; const reply = await directAi(settings, [{ role: 'system', content: 'You are PlantAI. You must output strict JSON matching the requested schema. Use sensor history, weather history, plant type ideal conditions, and safety rules. If anyone asks who made you or who created PlantAI, answer exactly: PlantAI was created by CLOUD 🌨️ and CLOUD 🌨️. It is a student project. Do not say University of California, IIT Kharagpur, or any other institution.' }, { role: 'user', content: prompt }], { json: true }); const parsed = parseCarePlan(reply, data, weather, settings); setPlan(parsed); saveCarePlan(parsed); } catch (e) { const fb = makeFallbackPlan(data, weather, settings); fb.extraNotes = [...(fb.extraNotes || []), `AI note: ${e.message}`]; setPlan(fb); saveCarePlan(fb); } finally { setLoading(false); } }
  return <Stack spacing={3}><PageTitle title="AI Care Plan" subtitle="Formatted seven-day chart using sensor history, weather history, plant type, and ideal conditions." />{msg && <Alert severity={msg.includes('error') ? 'error' : 'success'}>{msg}</Alert>}<GlassCard><CardContent sx={{ p: 3 }}><Typography className="display" variant="h5" mb={2}>Analysis Depth</Typography><Segmented options={['Quick', 'Balanced', 'Expert']} value={depth} setValue={setDepth} /></CardContent></GlassCard><GlassCard><CardContent sx={{ p: 3 }}><Typography className="display" variant="h5" mb={2}>Operational Style</Typography><Stack direction="row" gap={1} flexWrap="wrap">{['Conservative', 'Normal', 'Aggressive'].map(x => <Chip key={x} label={x} onClick={() => setStyle(x)} color={style === x ? 'primary' : 'default'} variant={style === x ? 'filled' : 'outlined'} />)}</Stack></CardContent></GlassCard><Button size="large" fullWidth variant="contained" startIcon={loading ? <CircularProgress size={18} /> : <BoltIcon />} onClick={generate}>Generate Chart Care Plan</Button><CarePlanChart plan={plan} onRelay={relay} /></Stack>;
}
function Chat({ data, weather, settings }) { const [messages, setMessages] = useState([{ role: 'assistant', text: "Hello! I'm your AI Plant Advisor. I use sensor history, weather history, and plant type from settings." }]); const [input, setInput] = useState(''); const [images, setImages] = useState([]); const [loading, setLoading] = useState(false); const fileRef = useRef(null); async function addImages(e) { const files = Array.from(e.target.files || []).slice(0, 5 - images.length); const loaded = await Promise.all(files.map(f => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve({ name: f.name, url: r.result }); r.onerror = reject; r.readAsDataURL(f); }))); setImages(prev => [...prev, ...loaded].slice(0, 5)); e.target.value = ''; } async function send() { if (!input.trim() && !images.length) return; const text = input.trim(); const imgs = images; setMessages(prev => [...prev, { role: 'user', text, images: imgs }]); setInput(''); setImages([]); setLoading(true); try { const ctx = aiContext(data, weather, settings); const content = imgs.length ? [{ type: 'text', text: `${text}\nContext JSON: ${JSON.stringify(ctx)}` }, ...imgs.map(i => ({ type: 'image_url', image_url: { url: i.url } }))] : `${text}\nContext JSON: ${JSON.stringify(ctx)}`; const reply = await directAi(settings, [{ role: 'system', content: 'You are PlantAI, a practical plant advisor. Format answers with short headings and bullets. If anyone asks who made you or who created PlantAI, answer exactly: PlantAI was created by CLOUD 🌨️ and CLOUD 🌨️. It is a student project. Do not say University of California, IIT Kharagpur, or any other institution.' }, { role: 'user', content }]); setMessages(prev => [...prev, { role: 'assistant', text: reply }]); } catch (e) { setMessages(prev => [...prev, { role: 'assistant', text: `## AI unavailable\n${e.message}\n\nLatest: temp ${data.latest?.temperature_c ?? '--'}°C, humidity ${data.latest?.humidity_percent ?? '--'}%, soil ${data.latest?.soil_moisture_percent ?? '--'}%.` }]); } finally { setLoading(false); } } return <Stack spacing={2} sx={{ minHeight: 'calc(100dvh - 170px)' }}><PageTitle title="AI Plant Advisor" subtitle="Chat with sensor-aware, weather-aware plant intelligence." /><Stack spacing={2} sx={{ flex: 1 }}>{messages.map((m, i) => <Stack key={i} direction="row" justifyContent={m.role === 'user' ? 'flex-end' : 'flex-start'}><Box className={m.role === 'assistant' ? 'glass-card' : ''} sx={{ maxWidth: '88%', p: 2, borderRadius: 4, bgcolor: m.role === 'user' ? GOLD.lime : 'rgba(30,32,26,.55)', color: m.role === 'user' ? '#151f00' : GOLD.text, boxShadow: m.role === 'user' ? '0 4px 22px rgba(190,245,0,.16)' : undefined }}><MarkdownText text={m.text} />{m.images?.length > 0 && <Typography className="mono" fontSize={11}>{m.images.length} image(s)</Typography>}</Box></Stack>)}{loading && <CircularProgress size={24} />}</Stack>{images.length > 0 && <Stack direction="row" gap={1} flexWrap="wrap">{images.map((img, idx) => <Chip key={idx} label={img.name} onDelete={() => setImages(v => v.filter((_, i) => i !== idx))} />)}</Stack>}<Paper className="glass-card" sx={{ position: 'sticky', bottom: 104, p: 1, borderRadius: 4 }}><Stack direction="row" alignItems="center" gap={1}><IconButton onClick={() => fileRef.current?.click()}><Badge badgeContent={images.length} color="primary"><AttachFileIcon /></Badge></IconButton><input ref={fileRef} hidden type="file" accept="image/*" multiple onChange={addImages} /><TextField value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} fullWidth placeholder="Ask about your plants..." /><IconButton color="primary" onClick={send}><SendIcon /></IconButton></Stack></Paper></Stack>; }
function makeLinePoints(rows, key, min, max) {
  if (!rows.length) return '';
  return rows.map((r, i) => {
    const x = rows.length === 1 ? 50 : (i / (rows.length - 1)) * 100;
    const value = num(r[key]);
    const safe = value === null ? min : clamp(value, min, max);
    const y = 100 - ((safe - min) / (max - min)) * 100;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}
function History({ data, weather, settings }) {
  const [period, setPeriod] = useState('24H');
  const rawReadings = (data.readings || []).slice().sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  const readings = rawReadings.map(r => effectiveReading(r, rawReadings, weather, settings));
  const cutoffMs = period === '24H' ? 24 * 3600000 : period === '7D' ? 7 * 86400000 : 30 * 86400000;
  const filtered = readings.filter(r => Date.now() - new Date(r.recorded_at).getTime() <= cutoffMs);
  const chartRows = filtered.length ? filtered : readings.slice(-24);
  const daily = weather?.daily;
  const moisturePts = makeLinePoints(chartRows, 'soil_moisture_percent', 0, 100);
  const tempPts = makeLinePoints(chartRows, 'temperature_c', 0, 50);
  const humPts = makeLinePoints(chartRows, 'humidity_percent', 0, 100);
  return <Stack spacing={3}>
    <PageTitle title="Sensor History" subtitle={`${data.plant?.name || 'Plant'} · Real sensor trend graph`} />
    <Stack direction="row" gap={1}>{['24H', '7D', '30D'].map(x => <Button key={x} variant={period === x ? 'contained' : 'outlined'} onClick={() => setPeriod(x)}>{x}</Button>)}</Stack>
    <GlassCard><CardContent sx={{ p: 3 }}><Stack direction="row" justifyContent="space-between" alignItems="start" mb={2}><Box><Typography className="display" variant="h5">Real Moisture, Temperature & Humidity</Typography><Typography className="mono" color="text.secondary" fontSize={12}>{chartRows.length} readings · {period}</Typography></Box></Stack><Box sx={{ height: 300, position: 'relative', borderLeft: `1px solid ${GOLD.outlineVariant}`, borderBottom: `1px solid ${GOLD.outlineVariant}`, background: 'linear-gradient(180deg, rgba(190,245,0,.05), transparent)' }}><svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Sensor history line graph"><g stroke="rgba(255,255,255,.08)" strokeWidth=".25">{[20,40,60,80].map(y => <line key={y} x1="0" x2="100" y1={y} y2={y} />)}</g>{moisturePts && <polyline points={moisturePts} fill="none" stroke={GOLD.lime} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />}{tempPts && <polyline points={tempPts} fill="none" stroke="#ffffff" strokeOpacity=".9" strokeWidth="2" vectorEffect="non-scaling-stroke" />}{humPts && <polyline points={humPts} fill="none" stroke={GOLD.secondary} strokeOpacity=".85" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />}</svg></Box><Stack direction="row" gap={1.5} flexWrap="wrap" mt={2}><Chip label="Soil moisture" sx={{ bgcolor: `${GOLD.lime}22`, color: GOLD.lime }} /><Chip label="Temperature" sx={{ bgcolor: 'rgba(255,255,255,.12)' }} /><Chip label="Humidity" sx={{ bgcolor: `${GOLD.secondary}22`, color: GOLD.secondary }} /></Stack>{!chartRows.length && <Alert severity="info" sx={{ mt: 2 }}>No sensor readings available for this period yet.</Alert>}</CardContent></GlassCard>
    {daily && <GlassCard><CardContent sx={{ p: 3 }}><Typography className="display" variant="h5" mb={2}>7-Day Rain & Weather History</Typography><List>{daily.time?.slice(0, 7).map((d, i) => <ListItem key={d} divider><ListItemText primary={`${d}: Rain ${daily.rain_sum?.[i] ?? 0} mm · Precip ${daily.precipitation_sum?.[i] ?? 0} mm`} secondary={`Temp ${daily.temperature_2m_min?.[i] ?? '--'}–${daily.temperature_2m_max?.[i] ?? '--'}°C`} /></ListItem>)}</List></CardContent></GlassCard>}
    <GlassCard><CardContent sx={{ p: 3 }}><Typography className="display" variant="h5" mb={2}>Recent Readings</Typography><List>{chartRows.slice(-12).reverse().map(r => <ListItem key={r.id} divider><ListItemText primary={`${r.temperature_c ?? '--'}°C · ${r.humidity_percent ?? '--'}% · Soil ${r.soil_moisture_percent ?? '--'}%`} secondary={`${fmtTime(r.recorded_at)} · NPK ${r.npk_n ?? '--'}/${r.npk_p ?? '--'}/${r.npk_k ?? '--'}`} /></ListItem>)}</List></CardContent></GlassCard>
  </Stack>;
}
function Settings({ settings, setSettings, data, weather, reloadWeather }) { const [test, setTest] = useState(''); const [relayOpen, setRelayOpen] = useState(false); const [secretClicks, setSecretClicks] = useState(0); const secretOpen = secretClicks >= 5 || settings.secretUnlocked; function update(patch) { const next = { ...settings, ...patch }; setSettings(next); saveSettings(next); if (patch.supabaseUrl !== undefined) localStorage.setItem('plantai_supabase_url', patch.supabaseUrl); } function applyWeatherPreset(key) { const place = weatherPlaces[key]; if (!place) return; update({ weatherPlace: key, city: place.city || settings.city, country: place.country || settings.country, latitude: place.latitude || settings.latitude, longitude: place.longitude || settings.longitude }); } function applyProvider(p) { update({ provider: p, baseUrl: providers[p].baseUrl, model: providers[p].model }); } async function testConnection() { setTest('Testing...'); try { const reply = await directAi(settings, [{ role: 'user', content: 'Reply with exactly: PlantAI connection OK' }]); setTest(reply.slice(0, 160)); } catch (e) { setTest(e.message); } } async function queueRelay() { try { await fetchJson(endpoint('relay-approve'), { method: 'POST', body: JSON.stringify({ device_id: DEVICE_ID, action: 'on', duration_seconds: settings.maxWatering * 60, reason: 'Manual relay command from dashboard settings' }) }); setTest('Relay command queued successfully.'); setRelayOpen(false); } catch (e) { setTest(`Relay error: ${e.message}`); } } return <Stack spacing={3}><PageTitle title="Settings" subtitle="Refine botanical intelligence, weather, plant profile and hardware protocols." /><GlassCard><CardContent sx={{ p: 3 }}><Typography className="display" variant="h5" mb={2}>Supabase Endpoint</Typography><TextField fullWidth label="Supabase Project URL" placeholder="https://YOUR_PROJECT_REF.supabase.co" value={settings.supabaseUrl || ''} onChange={e => update({ supabaseUrl: e.target.value })} /><Alert severity="info" sx={{ mt: 2 }}>For privacy, the live endpoint is not hardcoded in GitHub. Enter it here once on the device, then reload the page.</Alert><Button sx={{ mt: 1 }} variant="outlined" onClick={() => { localStorage.setItem('plantai_supabase_url', settings.supabaseUrl || ''); location.reload(); }}>Save endpoint & reload</Button></CardContent></GlassCard><GlassCard><CardContent sx={{ p: 3 }}><Stack direction="row" gap={1} alignItems="center" mb={2}><LocalFloristIcon color="primary" /><Typography className="display" variant="h5">Plant Profile</Typography></Stack><Stack spacing={2}><TextField label="Plant Name" value={settings.plantName} onChange={e => update({ plantName: e.target.value })} /><FormControl fullWidth><Select value={settings.plantType} onChange={e => update({ plantType: e.target.value })}>{Object.entries(plantProfiles).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}</Select></FormControl><Alert severity="info">{plantProfiles[settings.plantType]?.ideal}</Alert></Stack></CardContent></GlassCard><GlassCard><CardContent sx={{ p: 3 }}><Stack direction="row" gap={1} alignItems="center" mb={2}><PlaceIcon color="primary" /><Typography className="display" variant="h5">Weather Location</Typography></Stack><Stack spacing={2}><FormControl fullWidth><Select value={settings.weatherPlace || 'patna'} onChange={e => applyWeatherPreset(e.target.value)}>{Object.entries(weatherPlaces).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}</Select></FormControl><TextField label="City" value={settings.city} onChange={e => update({ city: e.target.value, weatherPlace: 'custom' })} /><TextField label="Country" value={settings.country} onChange={e => update({ country: e.target.value })} /><Stack direction="row" gap={1}><TextField label="Latitude" value={settings.latitude} onChange={e => update({ latitude: e.target.value, weatherPlace: 'custom' })} /><TextField label="Longitude" value={settings.longitude} onChange={e => update({ longitude: e.target.value, weatherPlace: 'custom' })} /></Stack><Button variant="contained" startIcon={<CloudSyncIcon />} onClick={reloadWeather}>Fetch Weather</Button><Typography color="text.secondary">Current: {weather?.current?.temperature_2m ?? '--'}°C · Rain {weather?.current?.rain ?? '--'} mm</Typography></Stack></CardContent></GlassCard><Box textAlign="center"><Button size="small" variant="text" sx={{ opacity: .18 }} onClick={() => { const c = secretClicks + 1; setSecretClicks(c); if (c >= 5) update({ secretUnlocked: true }); }}>leaf diagnostic</Button></Box>{secretOpen && <GlassCard sx={{ borderColor: 'rgba(190,245,0,.35) !important' }}><CardContent sx={{ p: 3 }}><Typography className="display" variant="h5" mb={1}>Secret Sensor Override</Typography><Alert severity="warning" sx={{ mb: 2 }}>Use only when physical soil moisture sensor is broken. It estimates soil moisture from rain and watering history.</Alert><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography>Hide physical soil moisture and use virtual estimate</Typography><Switch checked={Boolean(settings.useVirtualSoil)} onChange={e => update({ useVirtualSoil: e.target.checked })} /></Stack><Typography color="text.secondary" mt={1}>Estimated now: {estimateVirtualSoil(data, weather, settings)}%</Typography></CardContent></GlassCard>}<GlassCard><CardContent sx={{ p: 3 }}><Stack direction="row" gap={1} alignItems="center" mb={2}><MemoryIcon color="primary" /><Typography className="display" variant="h5">AI Provider</Typography></Stack><Stack spacing={2}><FormControl fullWidth><Select value={settings.provider} onChange={e => applyProvider(e.target.value)}>{Object.entries(providers).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}</Select></FormControl><TextField label="API Key" type={settings.showKey ? 'text' : 'password'} value={settings.apiKey} onChange={e => update({ apiKey: e.target.value })} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => update({ showKey: !settings.showKey })}>{settings.showKey ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment> }} /><TextField label="Base URL" value={settings.baseUrl} onChange={e => update({ baseUrl: e.target.value })} /><TextField label="Model" value={settings.model} onChange={e => update({ model: e.target.value })} /><Alert severity="warning">Direct Browser Mode stores your own key on this device. Do not enter shared production keys.</Alert><Stack direction="row" gap={1}><Button variant="contained" onClick={testConnection}>Test Connection</Button><Button variant="outlined" onClick={() => update({ apiKey: '' })}>Clear Key</Button></Stack>{test && <Alert severity={test.includes('OK') || test.includes('queued') ? 'success' : 'info'}>{test}</Alert>}</Stack></CardContent></GlassCard><GlassCard><CardContent sx={{ p: 3 }}><Typography className="display" variant="h5" mb={2}>Usage Mode</Typography><Segmented options={['direct', 'proxy']} value={settings.mode} setValue={(v) => update({ mode: v })} /></CardContent></GlassCard></Stack>; }

export default function App() { const [tab, setTab] = useState('dashboard'); const [data, setData] = useState({ latest: null, readings: [], plant: null, device: null }); const [weather, setWeather] = useState(null); const [settings, setSettings] = useState(loadSettings); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState(''); async function refresh() { try { setRefreshing(true); setError(''); const json = await fetchJson(`${endpoint('dashboard-data')}?device_id=${DEVICE_ID}`); setData({ latest: json.latest ?? null, readings: json.readings ?? [], plant: json.plant ?? null, device: json.device ?? null }); } catch (e) { setError(e.message); } finally { setRefreshing(false); } } async function reloadWeather() { try { setWeather(await fetchWeather(settings)); } catch (e) { setError(e.message); } } useEffect(() => { refresh(); const timer = setInterval(refresh, 30000); return () => clearInterval(timer); }, []); useEffect(() => { reloadWeather(); }, [settings.latitude, settings.longitude]); return <ThemeProvider theme={theme}><CssBaseline /><AppBar latest={data.latest} /><Box component="main" sx={{ pt: 10, pb: 13, minHeight: '100dvh' }}><Container maxWidth="lg" sx={{ px: 2 }}>{tab === 'dashboard' && <Dashboard data={data} weather={weather} refresh={refresh} refreshing={refreshing} error={error} settings={settings} setSettings={setSettings} />}{tab === 'ai' && <AiPlan data={data} weather={weather} settings={settings} />}{tab === 'chat' && <Chat data={data} weather={weather} settings={settings} />}{tab === 'history' && <History data={data} weather={weather} settings={settings} />}{tab === 'settings' && <Settings settings={settings} setSettings={setSettings} data={data} weather={weather} reloadWeather={reloadWeather} />}</Container></Box><BottomNav tab={tab} setTab={setTab} /></ThemeProvider>; }
