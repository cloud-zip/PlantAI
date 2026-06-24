# PlantAI Quick Start

This is the shortest path to recreate PlantAI.

## 1. Clone repo

```bash
git clone https://github.com/cloud-zip/PlantAI.git
cd PlantAI
```

## 2. Create Supabase project

Create a Supabase project and note:

```txt
Project URL
Project ref
```

## 3. Run database SQL

Use the SQL from:

```txt
supabase/migrations/001_esp32_smart_plant.sql
```

or follow:

```txt
esp32-smart-plant/SUPABASE_SETUP.md
```

## 4. Deploy Supabase functions

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set DEVICE_TOKEN="YOUR_DEVICE_TOKEN"
supabase functions deploy device-sensor-ingest --no-verify-jwt
supabase functions deploy device-relay-poll --no-verify-jwt
supabase functions deploy device-relay-confirm --no-verify-jwt
supabase functions deploy dashboard-data --no-verify-jwt
supabase functions deploy relay-approve --no-verify-jwt
```

## 5. Flash ESP32

Open:

```txt
esp32-smart-plant/esp32_smart_plant_controller.ino
```

Set:

```cpp
WIFI_SSID
WIFI_PASSWORD
SENSOR_INGEST_URL
RELAY_POLL_URL
DEVICE_TOKEN
```

Upload to ESP32.

## 6. Verify ESP32 upload

Serial Monitor:

```txt
115200 baud
```

Run:

```txt
UPLOAD
```

Expected:

```txt
POST ... -> 200
```

## 7. Run website locally

```bash
npm ci
npm run dev
```

## 8. Deploy GitHub Pages

Enable:

```txt
GitHub repo → Settings → Pages → GitHub Actions
```

Push to `main`. The workflow deploys automatically.

## 9. Configure website

Open website → Settings:

1. Choose plant type.
2. Choose weather place.
3. Enter AI provider API key.
4. Test connection.
5. Generate AI Care Plan.

## 10. Safety

Test relay with no pump first:

```txt
MOTOR ON 10
MOTOR OFF
```

Only connect pump after relay behavior is verified.
