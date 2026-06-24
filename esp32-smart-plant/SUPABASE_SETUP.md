# ESP32 → Supabase Setup

This is the MVP path:

```txt
ESP32
  → Supabase Edge Function: device-sensor-ingest
  → Supabase Postgres table: sensor_readings
  → React dashboard reads latest sensor_readings
```

## 1. Create tables

Open Supabase Dashboard → SQL Editor → paste and run:

```txt
supabase/migrations/001_esp32_smart_plant.sql
```

This creates:

- plants
- devices
- sensor_readings
- relay_commands

It also seeds:

```txt
device_id = esp32-field-001
plant_id  = 00000000-0000-0000-0000-000000000001
```

## 2. Create Edge Function

Install Supabase CLI if needed, then from project root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set DEVICE_TOKEN="change-this-device-token"
supabase functions deploy device-sensor-ingest --no-verify-jwt
supabase functions deploy device-relay-poll --no-verify-jwt
supabase functions deploy device-relay-confirm --no-verify-jwt
```

`--no-verify-jwt` means the ESP32 does not need to send Supabase anon JWT. The function still checks:

```txt
x-device-token: change-this-device-token
```

If you do not use `--no-verify-jwt`, then put your Supabase anon key in the ESP32 firmware as `SUPABASE_ANON_KEY`.

Never put the `service_role` key on ESP32.

## 3. Update ESP32 firmware

In `esp32_smart_plant_controller.ino`, set:

```cpp
const char* WIFI_SSID = "your-wifi-name";
const char* WIFI_PASSWORD = "your-wifi-password";

const char* SENSOR_INGEST_URL = "https://YOUR_PROJECT_REF.supabase.co/functions/v1/device-sensor-ingest";
const char* RELAY_POLL_URL = "https://YOUR_PROJECT_REF.supabase.co/functions/v1/device-relay-poll?device_id=esp32-field-001";

const char* SUPABASE_ANON_KEY = ""; // keep empty if functions deployed --no-verify-jwt

const char* DEVICE_ID = "esp32-field-001";
const char* DEVICE_TOKEN = "change-this-device-token";
```

The `DEVICE_TOKEN` must match the Supabase secret.

## 4. Test with curl before ESP32

Replace project ref and token:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/device-sensor-ingest" \
  -H "Content-Type: application/json" \
  -H "x-device-id: esp32-field-001" \
  -H "x-device-token: change-this-device-token" \
  -d '{
    "device_id":"esp32-field-001",
    "temperature_c":32.1,
    "humidity_percent":58,
    "soil_moisture_raw":2200,
    "soil_moisture_percent":34,
    "soil_sensor_type":"resistive_prototype",
    "npk_n":42,
    "npk_p":18,
    "npk_k":31,
    "npk_source":"dummy_until_rs485_converter_arrives",
    "relay_motor_on":false
  }'
```

Expected response:

```json
{"ok":true,"reading_id":1,"recorded_at":"..."}
```

## 5. Check data

Supabase Dashboard → Table Editor → `sensor_readings`.

Or SQL:

```sql
select *
from public.sensor_readings
order by recorded_at desc
limit 10;
```

## 6. ESP32 Serial Monitor

Use 115200 baud.

You should see:

```txt
Uploading: {...}
POST https://.../device-sensor-ingest -> 200
{"ok":true,"reading_id":...}
```

If you get `401 Unauthorized device`, check `DEVICE_TOKEN` on ESP32 and Supabase secret.

If you get `403 Device not registered`, check the `devices` table has `esp32-field-001` and `enabled = true`.
