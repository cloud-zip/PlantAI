/*
  Smart Plant Care Controller — ESP32 FINAL HARDWARE BUILD
  Optimized with Multitasking LCD Cycler & Dark Joke Easter Egg.

  Supported hardware:
    - ESP32
    - DHT11 temperature/humidity sensor
    - Capacitive soil moisture sensor (connected directly to 3.3V)
    - 16x2 I2C LCD display
    - 5V relay module for motor/pump
    - Soil NPK sensor through RS485-to-TTL converter
    - Supabase upload through Edge Functions

  Pins:
    - P15 shorted with P17 triggers dark-jokes mode on LCD Line 2.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ============================================================
// USER CONFIG
// ============================================================

static const char* WIFI_SSID             = "Admin";
static const char* WIFI_PASSWORD         = "admin@1234";

static const char* SENSOR_INGEST_URL     = "https://mtlrmmsouyjzshkjpecr.supabase.co/functions/v1/device-sensor-ingest";
static const char* RELAY_POLL_URL        = "https://mtlrmmsouyjzshkjpecr.supabase.co/functions/v1/device-relay-poll?device_id=esp32-field-001";
static const char* RELAY_CONFIRM_URL     = "https://mtlrmmsouyjzshkjpecr.supabase.co/functions/v1/device-relay-confirm";
static const char* SUPABASE_ANON_KEY     = "";

static const char* DEVICE_ID             = "esp32-field-001";
static const char* DEVICE_TOKEN          = "abe2be26284fd13708ec2e29175c6217f9b44cfaea92664ecca96c0d0e616c62";

// ============================================================
// LCD CONFIG
// ============================================================

#define LCD_ENABLED   true
#define LCD_ADDRESS   0x27

// ============================================================
// RELAY CONFIG
// ============================================================

static const bool RELAY_ACTIVE_LOW = true;

// ============================================================
// CAPACITIVE SOIL MOISTURE CALIBRATION
// ============================================================

static int SOIL_RAW_DRY = 3255;
static int SOIL_RAW_WET = 1040;

#define SOIL_SENSOR_TYPE "capacitive"

// ============================================================
// TIMING (milliseconds unless noted)
// ============================================================

static const unsigned long SENSOR_READ_INTERVAL_MS  = 15000UL;
static const unsigned long UPLOAD_INTERVAL_MS        = 60000UL;
static const unsigned long RELAY_POLL_INTERVAL_MS    = 30000UL;
static const unsigned long LCD_PAGE_INTERVAL_MS      = 5000UL;   // page rotation
static const unsigned long LCD_ANIM_INTERVAL_MS      = 300UL;    // animation speed
static const unsigned long JOKE_SCROLL_INTERVAL_MS   = 350UL;    // joke scroll speed

static const unsigned long MAX_MOTOR_ON_MS           = 10UL * 60UL * 1000UL;
static const unsigned long MOTOR_COOLDOWN_MS         = 5UL  * 60UL * 1000UL;

// ============================================================
// NPK / RS485 MODBUS SETTINGS
// ============================================================

#define USE_DUMMY_NPK         false
#define NPK_MODBUS_ID         1
#define NPK_BAUD_RATE         9600
#define NPK_REGISTER_START    0x001E
#define NPK_REGISTER_COUNT    3

// ============================================================
// PIN ASSIGNMENTS
// ============================================================

#define DHT_PIN           4
#define DHT_TYPE          DHT11

#define SOIL_ANALOG_PIN   34

#define RELAY_PIN         27

#define I2C_SDA_PIN       21
#define I2C_SCL_PIN       22

#define RS485_RX_PIN      16
#define RS485_TX_PIN      17
#define RS485_DE_RE_PIN   14

#define JOKE_TRIGGER_PIN  15
#define JOKE_GROUND_PIN   18

// ============================================================
// SENSOR DATA
// ============================================================

struct SensorData {
  float temperatureC  = NAN;
  float humidity      = NAN;
  int   soilRaw       = 0;
  int   soilPercent   = 0;
  int   npkN          = 0;
  int   npkP          = 0;
  int   npkK          = 0;
  bool  dhtOk         = false;
};

// ============================================================
// GLOBALS
// ============================================================

static DHT                dht(DHT_PIN, DHT_TYPE);
static LiquidCrystal_I2C lcd(LCD_ADDRESS, 16, 2);

static SensorData current;

static unsigned long lastSensorRead      = 0;
static unsigned long lastUpload          = 0;
static unsigned long lastRelayPoll       = 0;
static unsigned long lastLcdRotate       = 0;
static unsigned long lastLcdAnim         = 0;
static unsigned long lastJokeScroll      = 0;
static unsigned long motorStartedAt      = 0;
static unsigned long lastMotorStoppedAt  = 0;
static unsigned long motorPlannedOffAt   = 0;

static bool motorOn   = false;
static bool npkOk     = false;
static bool lcdOk     = false;

static int lcdPage       = 0;
static int animFrame     = 0;
static int jokeScrollPos = 0;

static String lastStatus         = "Booting";
static String lastRelayCommandId = "";

// ============================================================
// CUSTOM LCD CHARACTERS  (slots 0–7)
// ============================================================

static byte cloudGlyph[8] = {
  0b00100,
  0b01110,
  0b11111,
  0b11111,
  0b00000,
  0b01010,
  0b00100,
  0b00000
};

static byte heartBig[8] = {
  0b00000,
  0b01010,
  0b11111,
  0b11111,
  0b11111,
  0b01110,
  0b00100,
  0b00000
};

static byte heartSmall[8] = {
  0b00000,
  0b00000,
  0b01010,
  0b01110,
  0b00100,
  0b00000,
  0b00000,
  0b00000
};

static byte bootTopLeft[8]  = { 0b00011, 0b00111, 0b01111, 0b11111, 0b11111, 0b11111, 0b01111, 0b00111 };
static byte bootBotLeft[8]  = { 0b00111, 0b01111, 0b11111, 0b11111, 0b11111, 0b01111, 0b00111, 0b00011 };
static byte bootTopRight[8] = { 0b11000, 0b11100, 0b11110, 0b11111, 0b11111, 0b11111, 0b11110, 0b11100 };
static byte bootBotRight[8] = { 0b11100, 0b11110, 0b11111, 0b11111, 0b11111, 0b11110, 0b11100, 0b11000 };

// ============================================================
// DARK JOKES  (easter egg — triggered by P15/P17 short)
// ============================================================

static const char* darkJokes[] = {
  "My computer's outlook is like mine: dark and unresponsive.   ",
  "I put my root user in soil. Now I have a dead tree.   ",
  "Plants survive on light and water. I survive on caffeine and regret.   ",
  "Why do leaves fall? Because they gave up on life.   ",
  "My family tree has serious root rot.   "
};

static const int JOKE_COUNT    = 5;
static int       currentJokeIdx = 0;

// ============================================================
// UTILITY HELPERS
// ============================================================

static bool isConfigured(const char* value) {
  // strstr avoids heap String allocation; returns nullptr when substring absent
  return value != nullptr
      && value[0] != '\0'
      && strstr(value, "YOUR_") == nullptr;
}

static int clampInt(int value, int minValue, int maxValue) {
  if (value < minValue) return minValue;
  if (value > maxValue) return maxValue;
  return value;
}

static void setRelayHardware(bool on) {
  digitalWrite(RELAY_PIN, on ? HIGH : LOW);
}

// ============================================================
// LCD — TRANSITIONS & RENDERING
// ============================================================

static void customWipeTransition() {
  for (int col = 0; col < 16; col++) {
    lcd.setCursor(col, 0);
    lcd.print(" ");
    lcd.setCursor(15 - col, 1);
    lcd.print(" ");
    delay(25);
  }
}

static void initLcd() {
#if LCD_ENABLED
  Wire.beginTransmission(LCD_ADDRESS);
  lcdOk = (Wire.endTransmission() == 0);
  if (!lcdOk) return;

  lcd.init();
  lcd.backlight();

  // Register custom characters
  lcd.createChar(0, cloudGlyph);
  lcd.createChar(1, heartBig);
  lcd.createChar(2, heartSmall);
  lcd.createChar(3, bootTopLeft);
  lcd.createChar(4, bootBotLeft);
  lcd.createChar(5, bootTopRight);
  lcd.createChar(6, bootBotRight);

  // Boot splash
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Plantify");
  lcd.setCursor(0, 1);
  lcd.print("Calibrating...");

  // Double-height corner animation during boot
  for (int i = 0; i < 8; i++) {
    lcd.setCursor(14, 0); lcd.write(i % 2 == 0 ? 3 : 5);
    lcd.setCursor(15, 0); lcd.write(i % 2 == 0 ? 5 : 3);
    lcd.setCursor(14, 1); lcd.write(i % 2 == 0 ? 4 : 6);
    lcd.setCursor(15, 1); lcd.write(i % 2 == 0 ? 6 : 4);
    delay(500);
  }

  lcd.clear();
#endif
}

static bool checkJokeTrigger() {
  return (digitalRead(JOKE_TRIGGER_PIN) == LOW);
}

static void updateLcdTask() {
  if (!lcdOk) return;

  // --- Line 1: sensor data (alternates between NPK and env readings) ---
  lcd.setCursor(0, 0);
  if (lcdPage == 0) {
    char buf[17];
    snprintf(buf, sizeof(buf), "N:%d P:%d K:%d   ", current.npkN, current.npkP, current.npkK);
    lcd.print(buf);
  } else {
    char buf[17];
    if (current.dhtOk) {
      snprintf(buf, sizeof(buf), "S:%d%% T:%dC H:%d%%  ",
               current.soilPercent,
               static_cast<int>(current.temperatureC),
               static_cast<int>(current.humidity));
    } else {
      snprintf(buf, sizeof(buf), "S:%d%% T:--C H:--%%  ", current.soilPercent);
    }
    lcd.print(buf);
  }

  // Heartbeat animation — rightmost character of Line 1
  lcd.setCursor(15, 0);
  lcd.write(animFrame == 0 ? 1 : 2);

  // --- Line 2: jokes (when trigger is active) or credits ---
  if (checkJokeTrigger()) {
    const unsigned long now = millis();
    if (now - lastJokeScroll >= JOKE_SCROLL_INTERVAL_MS) {
      lastJokeScroll = now;
      const char* jokeText = darkJokes[currentJokeIdx];
      const int   textLen  = strlen(jokeText);

      // Build the 16-char window into a buffer and send in one lcd.print call
      // instead of 16 individual lcd.print calls (each incurs I2C overhead)
      char window[17];
      for (int i = 0; i < 16; i++) {
        window[i] = jokeText[(jokeScrollPos + i) % textLen];
      }
      window[16] = '\0';
      lcd.setCursor(0, 1);
      lcd.print(window);

      jokeScrollPos++;
      if (jokeScrollPos >= textLen) {
        jokeScrollPos  = 0;
        currentJokeIdx = (currentJokeIdx + 1) % JOKE_COUNT;
      }
    }
  } else {
    lcd.setCursor(0, 1);
    if (lcdPage == 0) {
      lcd.print("Plantify");
    } else {
      lcd.print("by CLOUD ");
      lcd.write(0);  // cloud glyph
      lcd.print("      ");
    }
  }
}

// ============================================================
// MOTOR CONTROL
// ============================================================

static bool canStartMotor() {
  if (motorOn)                   return true;
  if (lastMotorStoppedAt == 0)   return true;
  return (millis() - lastMotorStoppedAt) >= MOTOR_COOLDOWN_MS;
}

static bool startMotor(unsigned long durationSeconds, const String& reason) {
  unsigned long durationMs = durationSeconds * 1000UL;
  if (durationMs == 0)              durationMs = 10000UL;
  if (durationMs > MAX_MOTOR_ON_MS) durationMs = MAX_MOTOR_ON_MS;

  if (!canStartMotor()) {
    lastStatus = "Cooldown active";
    return false;
  }

  const unsigned long now = millis();
  setRelayHardware(true);
  motorOn           = true;
  motorStartedAt    = now;
  motorPlannedOffAt = now + durationMs;
  lastStatus        = "Motor ON " + String(durationMs / 1000UL) + "s";
  return true;
}

static void stopMotor(const String& reason) {
  if (!motorOn) return;
  setRelayHardware(false);
  motorOn              = false;
  lastMotorStoppedAt   = millis();
  motorPlannedOffAt    = 0;
  lastStatus           = "Motor OFF";
}

static void handleMotorSafety() {
  if (!motorOn) return;
  const unsigned long now = millis();
  if (motorPlannedOffAt > 0 && now >= motorPlannedOffAt) {
    stopMotor("planned duration finished");
    return;
  }
  if (now - motorStartedAt >= MAX_MOTOR_ON_MS) {
    stopMotor("max safety duration reached");
  }
}

// ============================================================
// SENSOR READING
// ============================================================

static int readSoilRaw() {
  long         total   = 0;
  const int    samples = 12;
  for (int i = 0; i < samples; i++) {
    total += analogRead(SOIL_ANALOG_PIN);
    delayMicroseconds(500);  // 500µs is well above the ESP32 ADC settling time (~100µs);
                             // saves ~239ms vs the original delay(20) per sample
  }
  return static_cast<int>(total / samples);
}

static int soilRawToPercent(int raw) {
  return clampInt(map(raw, SOIL_RAW_DRY, SOIL_RAW_WET, 0, 100), 0, 100);
}

// ============================================================
// RS485 MODBUS — NPK SENSOR
// ============================================================

static uint16_t modbusCrc16(const uint8_t* buf, uint8_t len) {
  uint16_t crc = 0xFFFF;
  for (uint8_t pos = 0; pos < len; pos++) {
    crc ^= static_cast<uint16_t>(buf[pos]);
    for (uint8_t i = 0; i < 8; i++) {
      if (crc & 0x0001) {
        crc >>= 1;
        crc ^= 0xA001;
      } else {
        crc >>= 1;
      }
    }
  }
  return crc;
}

static void rs485TransmitMode() {
  digitalWrite(RS485_DE_RE_PIN, HIGH);
  delayMicroseconds(200);
}

static void rs485ReceiveMode() {
  delayMicroseconds(200);
  digitalWrite(RS485_DE_RE_PIN, LOW);
}

static bool modbusReadHoldingRegisters(uint8_t   slaveId,
                                       uint16_t  startReg,
                                       uint16_t  count,
                                       uint16_t* outRegs) {
  // Flush stale bytes
  while (Serial2.available()) Serial2.read();

  // Build request frame
  uint8_t request[8];
  request[0] = slaveId;
  request[1] = 0x03;
  request[2] = highByte(startReg);
  request[3] = lowByte(startReg);
  request[4] = highByte(count);
  request[5] = lowByte(count);
  const uint16_t crc = modbusCrc16(request, 6);
  request[6] = lowByte(crc);
  request[7] = highByte(crc);

  rs485TransmitMode();
  Serial2.write(request, 8);
  Serial2.flush();
  rs485ReceiveMode();

  // Read response
  const uint8_t expectedLen = 5 + (count * 2);
  uint8_t       response[64];
  uint8_t       idx   = 0;
  unsigned long start = millis();

  while (millis() - start < 1200 && idx < expectedLen) {
    if (Serial2.available()) {
      response[idx++] = Serial2.read();
    }
  }

  if (idx < expectedLen) return false;

  // Validate CRC
  const uint16_t receivedCrc   = (static_cast<uint16_t>(response[idx - 1]) << 8)
                                 | response[idx - 2];
  const uint16_t calculatedCrc = modbusCrc16(response, idx - 2);
  if (receivedCrc != calculatedCrc) return false;

  // Validate header
  if (response[0] != slaveId || response[1] != 0x03 || response[2] != count * 2) {
    return false;
  }

  // Extract register values
  for (uint16_t i = 0; i < count; i++) {
    const uint8_t base = 3 + (i * 2);
    outRegs[i] = (static_cast<uint16_t>(response[base]) << 8) | response[base + 1];
  }
  return true;
}

static void readNpk(int& n, int& p, int& k) {
#if USE_DUMMY_NPK
  const unsigned long t = millis() / 10000UL;
  n     = 42 + (t % 5);
  p     = 18 + (t % 4);
  k     = 31 + (t % 6);
  npkOk = true;
#else
  uint16_t regs[NPK_REGISTER_COUNT];
  const bool ok = modbusReadHoldingRegisters(NPK_MODBUS_ID, NPK_REGISTER_START,
                                             NPK_REGISTER_COUNT, regs);
  if (ok) {
    n     = regs[0];
    p     = regs[1];
    k     = regs[2];
    npkOk = true;
  } else {
    npkOk = false;
  }
#endif
}

static void readSensors() {
  const float h = dht.readHumidity();
  const float t = dht.readTemperature();

  current.dhtOk = !(isnan(h) || isnan(t));
  if (current.dhtOk) {
    current.humidity     = h;
    current.temperatureC = t;
  }

  current.soilRaw     = readSoilRaw();
  current.soilPercent = soilRawToPercent(current.soilRaw);
  readNpk(current.npkN, current.npkP, current.npkK);

  lastStatus = "Sensors updated";
}

// ============================================================
// WIFI
// ============================================================

static void connectWifi() {
  if (!isConfigured(WIFI_SSID) || !isConfigured(WIFI_PASSWORD)) return;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000UL) {
    delay(500);
  }
}

// ============================================================
// HTTP / SENSOR UPLOAD
// ============================================================

static String buildSensorJson() {
  StaticJsonDocument<640> doc;
  doc["device_id"] = DEVICE_ID;

  if (current.dhtOk) {
    doc["temperature_c"]    = current.temperatureC;
    doc["humidity_percent"] = current.humidity;
  } else {
    doc["temperature_c"]    = serialized("null");
    doc["humidity_percent"] = serialized("null");
  }

  doc["soil_moisture_raw"]     = current.soilRaw;
  doc["soil_moisture_percent"] = current.soilPercent;
  doc["soil_sensor_type"]      = SOIL_SENSOR_TYPE;
  doc["npk_n"]                 = current.npkN;
  doc["npk_p"]                 = current.npkP;
  doc["npk_k"]                 = current.npkK;
  doc["npk_source"]            = USE_DUMMY_NPK
                                   ? "dummy"
                                   : (npkOk ? "rs485_modbus" : "rs485_modbus_read_failed");
  doc["relay_motor_on"]        = motorOn;

  String out;
  serializeJson(doc, out);
  return out;
}

static bool httpPostJson(const String& url, const String& jsonBody) {
  if (!WiFi.isConnected()) return false;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, url);
  http.addHeader("Content-Type",  "application/json");
  http.addHeader("x-device-id",   DEVICE_ID);
  http.addHeader("x-device-token", DEVICE_TOKEN);

  if (isConfigured(SUPABASE_ANON_KEY)) {
    char authBuf[128];
    snprintf(authBuf, sizeof(authBuf), "Bearer %s", SUPABASE_ANON_KEY);
    http.addHeader("apikey",        SUPABASE_ANON_KEY);
    http.addHeader("Authorization", authBuf);
  }

  const int code = http.POST(jsonBody);
  http.end();
  return code >= 200 && code < 300;
}

static void uploadSensorData() {
  if (!isConfigured(SENSOR_INGEST_URL) || !WiFi.isConnected()) return;
  const String json = buildSensorJson();
  lastStatus = httpPostJson(SENSOR_INGEST_URL, json) ? "Upload OK" : "Upload failed";
}

static void pollRelayCommand() {
  if (!isConfigured(RELAY_POLL_URL) || !WiFi.isConnected()) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, RELAY_POLL_URL);
  http.addHeader("x-device-id",    DEVICE_ID);
  http.addHeader("x-device-token", DEVICE_TOKEN);

  if (isConfigured(SUPABASE_ANON_KEY)) {
    char authBuf[128];
    snprintf(authBuf, sizeof(authBuf), "Bearer %s", SUPABASE_ANON_KEY);
    http.addHeader("apikey",        SUPABASE_ANON_KEY);
    http.addHeader("Authorization", authBuf);
  }

  const int    code     = http.GET();
  const String response = http.getString();
  http.end();

  if (code < 200 || code >= 300 || response.length() == 0) return;

  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, response) || doc["command"].isNull()) return;

  const String commandId = doc["command"]["id"]                | "";
  const String action    = doc["command"]["action"]            | "";
  const int    duration  = doc["command"]["duration_seconds"]  | 10;

  // Skip already-processed commands
  if (commandId.length() > 0 && commandId == lastRelayCommandId) return;

  if (action == "on") {
    if (startMotor(duration, "backend command") && commandId.length() > 0) {
      lastRelayCommandId = commandId;
    }
  } else if (action == "off") {
    stopMotor("backend command");
    if (commandId.length() > 0) lastRelayCommandId = commandId;
  }
}

// ============================================================
// SETUP & LOOP
// ============================================================

void setup() {
  Serial.begin(115200);

  // Joke trigger: P17 acts as a static GND source for shorting to P15
  pinMode(JOKE_TRIGGER_PIN, INPUT_PULLUP);
  pinMode(JOKE_GROUND_PIN, OUTPUT);
  digitalWrite(JOKE_GROUND_PIN, LOW);

  // Relay — ensure it starts OFF before configuring as output
  digitalWrite(RELAY_PIN, LOW);
  pinMode(RELAY_PIN, OUTPUT);
  setRelayHardware(false);

  // RS485
  pinMode(RS485_DE_RE_PIN, OUTPUT);
  digitalWrite(RS485_DE_RE_PIN, LOW);
  Serial2.begin(NPK_BAUD_RATE, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);

  // I2C + LCD
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  initLcd();

  // DHT + ADC
  dht.begin();
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_ANALOG_PIN, ADC_11db);

  connectWifi();
  readSensors();
  updateLcdTask();
}

void loop() {
  const unsigned long now = millis();

  handleMotorSafety();

  // Rotate LCD page every LCD_PAGE_INTERVAL_MS
  if (now - lastLcdRotate >= LCD_PAGE_INTERVAL_MS) {
    lastLcdRotate = now;
    lcdPage       = (lcdPage + 1) % 2;
    customWipeTransition();
  }

  // Advance heartbeat animation frame
  if (now - lastLcdAnim >= LCD_ANIM_INTERVAL_MS) {
    lastLcdAnim = now;
    animFrame   = (animFrame + 1) % 2;
  }

  updateLcdTask();

  if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    lastSensorRead = now;
    readSensors();
  }

  if (now - lastUpload >= UPLOAD_INTERVAL_MS) {
    lastUpload = now;
    uploadSensorData();
  }

  if (now - lastRelayPoll >= RELAY_POLL_INTERVAL_MS) {
    lastRelayPoll = now;
    pollRelayCommand();
  }

  delay(20);
}
