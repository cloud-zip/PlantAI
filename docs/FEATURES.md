# PlantAI Features

## Hardware Features

- ESP32 sensor controller
- DHT11 temperature/humidity
- Capacitive soil moisture sensor
- RS485 NPK sensor
- 16x2 I2C LCD
- 5V relay motor control
- Supabase upload
- Relay polling

## Website Features

- Mobile-first Golden Leaf UI
- Material UI components
- Glassmorphism cards
- Floating bottom navigation
- Dashboard sensor cards
- NPK nutrient chart
- Weather from OpenMeteo
- 7-day weather/rain history
- Sensor history view
- AI care plan chart/table
- AI chat with markdown rendering
- Up to 5 images in AI chat
- Relay ON/OFF from dashboard
- Relay commands from AI plan
- Settings for plant, weather, AI, relay safety

## AI Features

AI receives:

- Plant name
- Plant type
- Ideal plant conditions
- Current sensor readings
- Sensor history
- Current weather
- 7-day weather/rain history
- Care style
- Analysis depth
- Budget preference

Supported providers:

- OpenRouter
- OpenAI
- GroqCloud
- Nvidia NIM
- Custom OpenAI-compatible API

## Saved Data

Browser saves:

- AI provider settings
- Plant profile
- Weather location
- Latest AI care plan

Supabase saves:

- Plants
- Devices
- Sensor readings
- Relay commands

Images are not permanently stored by the frontend.
