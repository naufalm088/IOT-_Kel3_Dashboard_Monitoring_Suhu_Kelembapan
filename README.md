# Smart Home IoT Project

Dashboard Monitoring Suhu & Kelembapan — Node-RED + ESP32 + DHT11

## Arsitektur

```
[ESP32 + DHT11] --WiFi--> [Mosquitto MQTT :1883] --MQTT--> [Node-RED :1880]
                                                                    |
                                                          +---------+---------+
                                                          |                   |
                                                    Global Sensor      Global History
                                                          |                   |
                                                    HTTP /api/sensor   HTTP /api/history
                                                          |                   |
                                                    [Dashboard index.html polling 5s/15s]
```

### Mode Hybrid
- **Ruang Tamu**: Data real dari DHT11 via MQTT
- **4 Ruangan Lain**: Simulasi random (kamar_1, kamar_2, ruang_kerja, dapur)
- **Pintu Masuk**: Simulasi motion 20%
- **AC Control**: Simulasi client-side (toggle di dashboard)
- **Histori**: 200 entri, disimpan di `smarthome_history.json`

## Quick Start

### 1. Install Mosquitto MQTT Broker
```bash
# Windows: download dari https://mosquitto.org/download/
# Install dengan centang "Install as service"
# Edit C:\Program Files\mosquitto\mosquitto.conf:
#   listener 1883
#   allow_anonymous true
```

### 2. Upload Sketch ke ESP32
- Buka `hardware/esp32_dht11_mqtt/esp32_dht11_mqtt.ino` di Arduino IDE
- Install library: DHT by Adafruit + PubSubClient
- Upload ke ESP32 (COM7, 115200 baud)
- Pastikan Serial Monitor menunjukkan data ter-publish

### 3. Import Flow ke Node-RED
```bash
# Buka Node-RED: http://localhost:1880
# Menu > Import > Upload flow.json (dari folder smart_home_project/)
# Deploy flow
```

### 4. Buka Dashboard
```
# Buka index.html di browser (atau serve via Node-RED static)
# Pastikan ESP32 sudah terhubung WiFi & MQTT
# Ruang Tamu = data real DHT11, 4 ruangan lain simulasi
```

## File Structure

```
smart_home_project/
├── index.html                    # Dashboard utama
├── css/style.css                 # Dark theme styling
├── js/
│   ├── config.js                 # API URL & konfigurasi
│   ├── app.js                    # Main logic + polling
│   ├── charts.js                 # Chart.js per ruangan
│   ├── watt.js                   # Simulasi konsumsi daya
│   └── door-analytics.js         # Analitik sensor pintu
├── hardware/
│   ├── esp32_dht11_mqtt/
│   │   └── esp32_dht11_mqtt.ino  # Arduino sketch ESP32
│   └── README.md                 # Wiring & setup hardware
└── flow.json                     # Node-RED flow (import ke Node-RED)

flow.json.bak                     # Backup flow original (sebelum hybrid)
```

## API Endpoints (Node-RED)

| Endpoint | Method | Response |
|----------|--------|----------|
| `/api/sensor` | GET | `{rooms: {ruang_tamu: {temp, humid, ac}, ...}, pintu_masuk: {motion}, timestamp}` |
| `/api/history` | GET | `[{timestamp, motion_detected, rooms: {...}}, ...]` (max 200) |

## Branch

- `smart-home-project` — Dashboard baseline (simulasi only)
- `feature/hardware-dht11` — Real DHT11 + MQTT hybrid (current)
