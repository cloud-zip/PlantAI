import { useEffect, useState, useRef } from 'react';
import { Box, Container, CssBaseline, ThemeProvider, createTheme, IconButton, Avatar, Chip, Alert, CircularProgress, Stack, TextField, Button, Typography, Paper, CardContent } from '@mui/material';
import { Dashboard as DashboardIcon, Psychology as PsychologyIcon, Chat as ChatIcon, History as HistoryIcon, Settings as SettingsIcon, Refresh as RefreshIcon, AttachFile as AttachFileIcon, Send as SendIcon, Thermostat as ThermostatIcon, WaterDrop as WaterDropIcon, Place as PlaceIcon } from '@mui/icons-material';

// --- Theme Config ---
const GOLD = { lime: '#d4ff00', dark: '#13140f', card: '#1c1e14', yellow: '#e2f600', text: '#e4e3da' };
const theme = createTheme({ palette: { mode: 'dark', background: { default: GOLD.dark, paper: GOLD.dark } } });

// --- Mock/Logic Stubs ---
const ago = (date) => "1h ago";
const fmtTime = (date) => new Date(date).toLocaleTimeString();
const statusRange = (val, min, max) => (val < min || val > max ? ['Attention', 'error'] : ['Stable', 'success']);
const statusMoisture = (val) => val < 20 ? ['Dry', 'error'] : ['Stable', 'success'];

function GlassCard({ children, sx = {} }) { return <Paper sx={{ background: 'rgba(28, 30, 20, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2rem', p: 3, ...sx }}>{children}</Paper>; }

// --- Sub-pages ---
function Dashboard({ data, refresh, refreshing }) {
  const latest = data.latest || { temperature_c: 32.3, humidity_percent: 83, soil_moisture_percent: 100 };
  return (
    <Stack spacing={3}>
      <GlassCard sx={{ p: 4, position: 'relative' }}>
        <h1 style={{ fontFamily: 'Playfair Display', fontSize: '2.5rem' }}>My favorite plant</h1>
        <p style={{ color: '#9ca3af' }}>General Care · Last synced 1h ago.</p>
        <Button variant="contained" sx={{ mt: 3, borderRadius: '999px', bgcolor: GOLD.lime, color: 'black' }} onClick={refresh}>Refresh</Button>
      </GlassCard>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <GlassCard><Typography>Temp: {latest.temperature_c}°C</Typography></GlassCard>
        <GlassCard><Typography>Humidity: {latest.humidity_percent}%</Typography></GlassCard>
      </Box>
    </Stack>
  );
}

// --- Main App ---
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState({ latest: null });
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', pb: 12 }}>
        <header style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ color: GOLD.lime, fontWeight: 'bold' }}>Plantify</Typography>
        </header>
        
        <Container maxWidth="xs">
          {tab === 'dashboard' && <Dashboard data={data} refresh={refresh} refreshing={refreshing} />}
          {tab === 'ai' && <Typography p={4}>AI Care Plan Analysis</Typography>}
          {tab === 'chat' && <Typography p={4}>Chat with Advisor</Typography>}
          {tab === 'history' && <Typography p={4}>Sensor History Graphs</Typography>}
          {tab === 'settings' && <Typography p={4}>Settings Page</Typography>}
        </Container>

        <nav style={{ position: 'fixed', bottom: 20, left: '5%', width: '90%', background: 'rgba(28, 30, 20, 0.9)', borderRadius: '50px', display: 'flex', justifyContent: 'space-around', padding: '1rem' }}>
          {[['dashboard', DashboardIcon], ['ai', PsychologyIcon], ['chat', ChatIcon], ['history', HistoryIcon], ['settings', SettingsIcon]].map(([id, Icon]) => (
            <IconButton key={id} onClick={() => setTab(id)} sx={{ color: tab === id ? GOLD.lime : 'gray' }}>
              <Icon />
            </IconButton>
          ))}
        </nav>
      </Box>
    </ThemeProvider>
  );
}
