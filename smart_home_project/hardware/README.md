# Hardware: ESP32 + DHT11 Smart Home Sensor

## Komponen
- ESP32 DevKit (CH340)
- DHT11 modul 3-pin (sudah ada pull-up resistor built-in)
- Breadboard + kabel jumper

## Wiring (Modul DHT11 3-pin, TANPA resistor eksternal)

```
ESP32 3V3  --->  DHT11 VCC (pin tengah)
ESP32 GND  --->  DHT11 GND (pin kanan)
ESP32 D4   --->  DHT11 DATA (pin kiri)
```

**Catatan:** Jangan tambah resistor 10k eksternal! Modul 3-pin sudah punya pull-up internal.

## Setup Arduino IDE

### 1. Install Board ESP32
- `File > Preferences > Additional Boards Manager URLs`:
  ```
  https://dl.espressif.com/dl/package_esp32_index.json
  ```
- `Tools > Board Manager > cari "esp32" > Install by Espressif`

### 2. Install Library
- `Sketch > Include Library > Manage Libraries`
- Install:
  - **DHT sensor library** by Adafruit (v1.4.4)
  - **Adafruit Unified Sensor** (otomatis terinstall)
  - **PubSubClient** by Nick O'Leary (v2.8)

### 3. Upload Sketch
- `Tools > Board > ESP32 Dev Module`
- `Tools > Port > COM7` (CH340)
- `Tools > Upload Speed > 115200`
- Buka `esp32_dht11_mqtt.ino`
- Klik Upload

### 4. Verifikasi
- Buka `Tools > Serial Monitor` (115200 baud)
- Hasil yang diharapkan:
  ```
  === Smart Home DHT11 MQTT ===
  Menghubungkan WiFi: Kos ijo....
  WiFi terhubung! IP: 192.168.1.xxx
  Menghubungkan MQTT 192.168.1.13:1883 ... Terhubung!
  [MQTT] Publish -> smarthome/ruang_tamu/dht11 : {"temperature":27.3,"humidity":64.2}
  [MQTT] Publish -> smarthome/ruang_tamu/dht11 : {"temperature":27.1,"humidity":63.8}
  ```

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `Gagal membaca sensor!` | Cek wiring DATA -> D4, pastikan modul 3-pin |
| WiFi timeout | Pastikan SSID `Kos ijo` aktif, password benar |
| MQTT gagal connect | Pastikan Mosquitto jalan di laptop, IP `192.168.1.13` benar |
| COM port tidak muncul | Install driver CH340 |
