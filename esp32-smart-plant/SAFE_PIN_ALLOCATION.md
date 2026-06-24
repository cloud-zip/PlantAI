# Safe ESP32 Pin Allocation — Smart Plant Controller

This allocation follows strict ESP32 boot-safety rules.

## Final pin allocation

| Function | ESP32 GPIO / IO | Category | Status | Reason |
|---|---:|---|---|---|
| DHT11 DATA | GPIO4 | A | Safe | General digital sensor input. Not used as actuator. |
| Soil moisture analog OUT | GPIO34 | B | Safe | Input-only ADC1 pin, ideal for analog sensor input. |
| Soil sensor switched VCC | GPIO25 | A | Safe | Digital output for sensor power gating. Not used as ADC while WiFi active. |
| LCD SDA | GPIO21 | A | Safe | Default I2C SDA. |
| LCD SCL | GPIO22 | A | Safe | Default I2C SCL. |
| Relay IN | GPIO26 | A | Safe | Category A output, suitable for relay control. |
| Future RS485 RX | GPIO32 | A | Safe | UART RX remapped to safe pin; avoids GPIO16 PSRAM conflict. |
| Future RS485 TX | GPIO33 | A | Safe | UART TX remapped to safe pin; avoids GPIO17 PSRAM conflict. |
| Future RS485 DE/RE | GPIO27 | A | Safe | Digital direction-control output; avoids boot-strapping GPIO5. |

## Architectural defect fixed

Previous future RS485 allocation used:

```txt
RS485 DE/RE → GPIO5
```

This is unsafe because GPIO5 is a boot-strapping pin and must be HIGH during boot. It should not drive RS485 direction-control, relays, optocouplers, or transistor circuits.

Fixed allocation:

```txt
RS485 RX    → GPIO32
RS485 TX    → GPIO33
RS485 DE/RE → GPIO27
```

## Pins explicitly avoided

### Boot-strapping pins avoided for outputs/relays

```txt
GPIO0, GPIO2, GPIO5, GPIO12, GPIO15
```

### Flash pins prohibited

```txt
GPIO6, GPIO7, GPIO8, GPIO9, GPIO10, GPIO11
```

### Conditional PSRAM conflict pins avoided

```txt
GPIO16, GPIO17
```

These are usable on ESP32-WROOM-32, but avoided here to keep the wiring safer for unknown ESP32 variants such as WROVER/PSRAM boards.

## ADC rule followed

Soil moisture analog input uses:

```txt
GPIO34 = ADC1 input-only
```

This avoids ADC2 pins, which conflict with WiFi.
