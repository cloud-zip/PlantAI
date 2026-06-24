# Final Wiring — ESP32 Smart Plant Controller

Strict safe pin allocation is used.

## Final ESP32 pin table

| Module | Module pin | ESP32 internal pin | Notes |
|---|---|---:|---|
| DHT11 | VCC | 3.3V or 5V | Module usually supports both |
| DHT11 | GND | GND | Common ground |
| DHT11 | DATA | GPIO4 | Safe Category A |
| Capacitive soil moisture | VCC | GPIO25 or 3.3V | GPIO25 allows switched power; 3.3V also OK |
| Capacitive soil moisture | GND | GND | Common ground |
| Capacitive soil moisture | AO | GPIO34 | ADC1 input-only, WiFi-safe ADC |
| 16x2 I2C LCD | VCC | 5V | Most 16x2 I2C LCD backpacks use 5V |
| 16x2 I2C LCD | GND | GND | Common ground |
| 16x2 I2C LCD | SDA | GPIO21 | Default I2C SDA |
| 16x2 I2C LCD | SCL | GPIO22 | Default I2C SCL |
| 5V Relay | VCC | 5V | Relay module supply |
| 5V Relay | GND | GND | Common ground |
| 5V Relay | IN | GPIO26 | Safe Category A actuator pin |
| RS485-TTL | RO | GPIO32 | ESP32 UART RX receives from converter RO |
| RS485-TTL | DI | GPIO33 | ESP32 UART TX sends to converter DI |
| RS485-TTL | DE | GPIO27 | Direction control output |
| RS485-TTL | RE | GPIO27 | Tie RE and DE together |
| RS485-TTL | VCC | 3.3V or 5V | Depends on converter board. Check board label. |
| RS485-TTL | GND | GND | Common ground |
| NPK sensor | A | RS485-TTL A | RS485 differential line |
| NPK sensor | B | RS485-TTL B | RS485 differential line |
| NPK sensor | V+ | External sensor power + | Many NPK sensors require 12V. Check label. |
| NPK sensor | GND | External sensor power - and ESP32 GND | Common ground required |

## Important pin logic

RS485 converter pins:

```txt
RO = Receiver Output  → ESP32 RX GPIO32
DI = Driver Input     ← ESP32 TX GPIO33
DE = Driver Enable    ← ESP32 GPIO27
RE = Receiver Enable  ← ESP32 GPIO27
```

Tie DE and RE together:

```txt
DE + RE → GPIO27
```

The firmware drives GPIO27 HIGH for transmit and LOW for receive.

## Pump/motor relay wiring

For a DC pump:

```txt
External DC + → Relay COM
Relay NO      → Pump +
Pump -        → External DC -
```

Use NO, not NC, so the pump is off by default.

Do not power the pump from ESP32.

## Warning about NPK sensor power

Many soil NPK RS485 sensors need 9–24V or 12V. Do not assume 5V.

Check your sensor label/datasheet. If it says 12V:

```txt
12V adapter + → NPK V+
12V adapter - → NPK GND
12V adapter - → ESP32 GND/common ground
```

## If your board labels are P1/P2/P3

Use the board pinout to find which P pin maps to these internal ESP32 pins:

```txt
GPIO4, GPIO21, GPIO22, GPIO25, GPIO26, GPIO27, GPIO32, GPIO33, GPIO34
```

Do not assume P4 equals GPIO4.
