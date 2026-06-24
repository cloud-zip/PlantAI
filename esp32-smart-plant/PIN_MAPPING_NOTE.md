# ESP32 Board Pin Mapping Note

Important: ESP32 firmware uses **ESP32 IO/GPIO numbers** internally, but some development boards print different header labels such as P1, P2, P3, D1, D2, IO4, etc.

There is no universal P1/P2 mapping. Do not connect a wire to P1 just because a guide says GPIO 1.

## Firmware pin numbers currently used

| Function | Firmware IO/GPIO number | Find this on your board as |
|---|---:|---|
| DHT11 data | IO4 / GPIO4 | The header pin mapped to IO4/GPIO4/D4/P? |
| Soil sensor analog output | IO34 / GPIO34 | The header pin mapped to IO34/GPIO34/ADC/P? |
| Soil sensor switched VCC | IO25 / GPIO25 | The header pin mapped to IO25/GPIO25/D25/P? |
| LCD SDA | IO21 / GPIO21 | The header pin mapped to IO21/GPIO21/SDA/P? |
| LCD SCL | IO22 / GPIO22 | The header pin mapped to IO22/GPIO22/SCL/P? |
| Relay IN | IO26 / GPIO26 | The header pin mapped to IO26/GPIO26/D26/P? |
| Future RS485 RX | IO16 / GPIO16 | The header pin mapped to IO16/GPIO16/RX2/P? |
| Future RS485 TX | IO17 / GPIO17 | The header pin mapped to IO17/GPIO17/TX2/P? |
| Future RS485 DE/RE | IO5 / GPIO5 | The header pin mapped to IO5/GPIO5/D5/P? |

## What to do if your board only says P1/P2/P3

Find the board pinout/manual and fill this table:

| Board printed label | Actual ESP32 IO/GPIO | Use for |
|---|---:|---|
| P? | GPIO4 | DHT11 DATA |
| P? | GPIO34 | Soil AO |
| P? | GPIO25 | Soil VCC control |
| P? | GPIO21 | LCD SDA |
| P? | GPIO22 | LCD SCL |
| P? | GPIO26 | Relay IN |
| P? | GPIO16 | Future RS485 RX |
| P? | GPIO17 | Future RS485 TX |
| P? | GPIO5 | Future RS485 DE/RE |

If you share a clear board photo or exact model, this table can be completed precisely.
