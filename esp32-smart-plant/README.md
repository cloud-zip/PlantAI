# ESP32 Smart Plant Controller

This folder contains the ESP32-first firmware and wiring notes for the Smart Plant Care Dashboard prototype.

## Hardware currently supported

- ESP32
- DHT11 temperature/humidity sensor
- Resistive soil moisture sensor now, capacitive soil moisture sensor later
- 16x2 I2C LCD display
- Relay module for water motor/pump
- Dummy NPK/RS485 values until RS485-to-TTL converter arrives

## Arduino libraries

Install these in Arduino IDE Library Manager:

- DHT sensor library by Adafruit
- Adafruit Unified Sensor
- LiquidCrystal I2C
- ArduinoJson

## Main firmware

Open this file in Arduino IDE:

```txt
esp32-smart-plant/esp32_smart_plant_controller.ino
```

Update these values before upload:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SENSOR_INGEST_URL = "";
const char* RELAY_POLL_URL = "";
const char* DEVICE_TOKEN = "change-this-device-token";
```

If backend/Supabase is not ready, keep URLs empty. The firmware will still work locally with LCD + Serial Monitor.

## Serial commands

Open Serial Monitor at 115200 baud.

Commands:

```txt
STATUS
MOTOR ON 10
MOTOR OFF
```

`MOTOR ON 10` turns relay on for 10 seconds, then automatically turns it off.
