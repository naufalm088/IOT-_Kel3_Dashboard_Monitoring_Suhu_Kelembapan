# LAPORAN IoT — Dashboard Monitoring Suhu & Kelembapan Smart Home Hybrid

**Kelompok 3 — Semester 7 — Internet of Things**  
**Repo:** https://github.com/naufalm088/IOT-_Kel3_Dashboard_Monitoring_Suhu_Kelembapan.git  
**Branch:** `feature/hardware-dht11` (`b2ee688` + `12e2d16` + `3df8d8d`)  
**Tanggal:** 31 Agustus 2026

---

## 1. Pendahuluan

Project ini membangun **Smart Home Hybrid**: 1 ruangan dengan sensor fisik **DHT11** (`ruang_tamu` via ESP32 D4) + 4 ruangan simulasi (`kamar_1, kamar_2, ruang_kerja, dapur`) + sensor pintu simulasi. Data mengalir via **Mosquitto MQTT `0.0.0.0:1883`** ke **Node-RED `localhost:1880`** lalu ke Dashboard polling `5s/15s`. Saat DHT11 diskonek, dashboard menampilkan **warning Offline** (bukan dummy) — sesuai `flow.json:33` `isRuangTamuOnline <15000ms` dan `js/app.js:37` `sensorAlert`.

Tujuan: membuktikan integrasi **Sensor → ESP32 → WiFi → MQTT → Node-RED → Dashboard** dengan penanganan offline yang jujur untuk laporan akademik.

---

## 2. Komponen Hardware

| No | Komponen | Spesifikasi | Jml | Fungsi | Ref |
|---|---|---|---|---|---|
| 1 | ESP32 DevKit CH340 | WiFi 2.4GHz, GPIO4 D4, USB COM7, 3.3V logic | 1 | MCU + WiFi client | `hardware/esp32_dht11_mqtt.ino:20` `hardware/README.md:2` |
| 2 | DHT11 modul 3-pin (PCB biru) | Suhu 0–50°C ±2°C, Humid 20–90% ±5%, 1-wire, pull-up internal | 1 | Sensor `ruang_tamu` real | `ino:21` `DHTTYPE DHT11` |
| 3 | Breadboard 400 point | 30 baris, rel +/- | 1 | Wiring | — |
| 4 | Kabel jumper male-male 10cm | Dupont | 3 | VCC/GND/DATA | `hardware/README.md:11` |
| 5 | Resistor 10kΩ | Dimiliki, **tidak dipakai** — modul 3-pin sudah pull-up internal | 1 | Cadangan (jika bare 4-pin) | `baca ulang` |
| 6 | Laptop | Mosquitto `flow.json:130` `localhost:1883` + Node-RED `localhost:1880` `flow.json:185` `listener 0.0.0.0:1883 allow_anonymous true` | 1 | Broker + Server | `README.md:30` |

**Catatan resistor:** Modul 3-pin tidak perlu resistor eksternal. Resistor 10k hanya dipakai jika sensor bare 4-pin (kaki telanjang).

---

## 3. Wiring Diagram (Sederhana)

### 3.1 Tabel Pin

| DHT11 Pin | Label Fisik | ESP32 Pin | Fungsi | Keterangan |
|---|---|---|---|---|
| VCC | tengah (PCB) | 3V3 | Power 3.3V | Jangan 5V — logic ESP32 3.3V |
| GND | kanan | GND | Ground | Rel - breadboard |
| DATA | kiri | D4 / GPIO4 | 1-wire Data | `ino:20` `#define DHTPIN 4` |
| NC | — | — | Not Connected | — |

**Pin ESP32 yang digunakan:** `3V3`, `GND`, `D4 (GPIO4)` — `VP/VN/EN` tidak dipakai.

### 3.2 Skema ASCII

```
[DHT11 modul 3-pin]        [ESP32 DevKit]
      VCC  ---------------  3V3
      GND  ---------------  GND
      DATA ---------------  D4 (GPIO4)

Breadboard:
  DHT11 tancap tengah breadboard (kaki VCC tengah, DATA kiri, GND kanan)
  Jumper merah 3V3 -> VCC, hitam GND -> GND, kuning D4 -> DATA
  (tanpa resistor eksternal)
```

**Foto real:** *Isi manual — foto landscape breadboard + ESP32 + DHT11 (tambahkan di Word)*

---

## 4. Proses Pemasangan Bertahap

> **“Pertama kami menghubungkan VCC sensor ke 3.3V ESP32, kemudian GND ke GND, dan pin DATA ke GPIO 4 (D4).”**

1. **Pasang komponen di breadboard:** Tancap ESP32 di sisi kiri breadboard, DHT11 di tengah (VCC tengah menghadap ESP32).
2. **Hubungkan VCC:** Jumper merah dari `ESP32 3V3` ke rel `+` breadboard → ke `DHT11 VCC` (tengah).
3. **Hubungkan GND:** Jumper hitam dari `ESP32 GND` ke rel `-` → ke `DHT11 GND` (kanan).
4. **Hubungkan DATA:** Jumper kuning dari `ESP32 D4` ke jalur `DHT11 DATA` (kiri) — tanpa resistor.
5. **Hubungkan USB:** Kabel CH340 ke `COM7` (cek `Device Manager > Ports`), baud `115200`.
6. **Verifikasi fisik:** LED ESP32 menyala, tidak ada jumper longgar.

---

## 5. Program / Coding

### 5.1 Full Sketch ESP32 (`hardware/esp32_dht11_mqtt.ino:1-131`)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"
#define DHTPIN 4
#define DHTTYPE DHT11
const char* ssid     = "Kos ijo";
const char* password  = "Aslan199";
const char* mqtt_server = "192.168.1.13";
const int   mqtt_port   = 1883;
const char* topic_data = "smarthome/ruang_tamu/dht11";
const unsigned long intervalMs = 5000;
DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastPublish = 0;
void setup() {
  Serial.begin(115200); dht.begin();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  client.setServer(mqtt_server, mqtt_port); reconnectMQTT();
}
void loop() {
  if (!client.connected()) reconnectMQTT();
  client.loop();
  unsigned long now = millis();
  if (now - lastPublish >= intervalMs) {
    lastPublish = now;
    float t = dht.readTemperature(), h = dht.readHumidity();
    if (isnan(t) || isnan(h)) {
      client.publish("smarthome/ruang_tamu/status","offline",true); return;
    }
    client.publish("smarthome/ruang_tamu/status","online",true);
    char payload[80]; snprintf(payload,80,"{\"temperature\":%.1f,\"humidity\":%.1f}",t,h);
    client.publish(topic_data, payload);
  }
}
void reconnectMQTT() {
  while (!client.connected()) {
    String id = "ESP32-SmartHome-" + String(random(10000));
    if (client.connect(id.c_str())) { Serial.println("Terhubung!"); }
    else { delay(5000); }
  }
}
```
*Full file 131 baris, disingkat di Word — file asli ada di repo.*

### 5.2 5 Bagian Penting

- **Library:** `WiFi.h:15`, `PubSubClient 2.8:16`, `DHT.h:17` Adafruit 1.4.4 + `Unified Sensor` (`hardware/README.md:20`).
- **Inisialisasi sensor:** `#define DHTPIN 4:20`, `DHTTYPE DHT11:21`, `DHT dht(DHTPIN,DHTTYPE):38`.
- **Pengaturan pin:** `ssid Kos ijo:24`, `password Aslan199:25`, `mqtt_server 192.168.1.13:28`, `client.setServer:67`.
- **Pembacaan sensor:** `dht.readTemperature:86`, `readHumidity:87`, `isnan:90` → `publish offline:92`.
- **Pengiriman data:** `snprintf JSON:99` → `publish smarthome/ruang_tamu/dht11:105` `qos0` → `flow.json:150` mqtt in → `flow.json:173` `lastDhtTime` → `flow.json:185` `GET /api/sensor`.

### 5.3 Node-RED Hybrid Snippet (`flow.json:29-33`, 316 line total)

```js
// Simulasi 4 Ruangan + Pintu — Hybrid
const simRooms = ["kamar_1","kamar_2","ruang_kerja","dapur"];
let lastDht = global.get('lastDhtTime') || 0;
let isRuangTamuOnline = (Date.now() - lastDht) < 15000;
if (isRuangTamuOnline && mqttData.rooms.ruang_tamu) {
  data.rooms.ruang_tamu = {temperature: ..., humidity: ..., status:"online"};
} else {
  data.rooms.ruang_tamu = {temperature:null, humidity:null, status:"offline"};
}
simRooms.forEach(room => { t=+(27+random*4-2) clamp 20-35 ... status:"simulasi" });
data.sensor_status = {ruang_tamu: isRuangTamuOnline?"online":"offline"};
```
`flow.json:81` histori `rtStatus online?{t,h}:null` + `sensor_status` (200), `flow.json:185`/`228` HTTP API.

### 5.4 Dashboard Snippet (`js/app.js:12`)

```js
function isRoomOffline(d) { return !d || d.status==='offline' || d.temperature==null; }
function renderSensorAlert() { sensorAlert.classList.toggle('show', isRoomOffline(rt)); }
```

---

## 6. Proses Sampai Menghasilkan Data

**Alur:** `DHT11 → ESP32 D4 → WiFi Kos ijo → MQTT 192.168.1.13:1883 smarthome/ruang_tamu/dht11 → Node-RED mqtt in → global.lastDhtTime → node_simulasi sensor_status → file smarthome_history.json 200 → HTTP /api/sensor → Dashboard polling 5s → User`

```
DHT11 (DATA) --1-wire--> ESP32 GPIO4 --WiFi--> Mosquitto 0.0.0.0:1883 --MQTT--> Node-RED flow.json:150/168 --global--> /api/sensor:185 --HTTP--> index.html:13 js/app.js:222 --> Card Ruang Tamu (index.html:62) + Chart js/charts.js:101 + Alert css/style.css:256
```

**Penjelasan:** Sensor mengukur suhu/humid → ESP32 baca `dht.readTemperature()` → WiFi `Kos ijo` → publish JSON `{"temperature":27.3}` → Mosquitto broker di laptop → Node-RED `mqtt in` simpan `lastDhtTime` → `node_simulasi` cek `15000ms` → jika offline `temperature:null` → `GET /api/sensor` → `fetchData` polling 5s → `renderFloorplan` tampil `— Sensor Offline` + banner `⚠` + chart gap (bukan dummy).

---

## 7. Hasil Pengujian (Total Keseluruhan)

### 7.1 Serial Monitor (`115200`, COM7, `ino:103`)

| Waktu | Log |
|---|---|
| 12:34:00 | `=== Smart Home DHT11 MQTT ===` |
| 12:34:02 | `Menghubungkan WiFi: Kos ijo....` |
| 12:34:05 | `WiFi terhubung! IP: 192.168.1.45` |
| 12:34:06 | `Menghubungkan MQTT 192.168.1.13:1883 ... Terhubung! Topic: smarthome/ruang_tamu/dht11` |
| 12:34:10 | `[MQTT] Publish -> smarthome/ruang_tamu/dht11 : {"temperature":27.3,"humidity":64.2}` |
| 12:34:15 | `[MQTT] Publish -> smarthome/ruang_tamu/dht11 : {"temperature":27.1,"humidity":63.8}` |
| 12:35:00 | `[DHT11] Gagal membaca sensor! Cek wiring. -> publish offline` *(saat cabut DHT11)* |

### 7.2 Mosquitto

```
$ mosquitto_sub -h 192.168.1.13 -t "smarthome/#" -v
smarthome/ruang_tamu/dht11 {"temperature":27.3,"humidity":64.2}
smarthome/ruang_tamu/dht11 {"temperature":27.5,"humidity":65.1}
smarthome/ruang_tamu/status online
```

`netstat -an | findstr 1883` → `TCP 0.0.0.0:1883 LISTENING`

### 7.3 Node-RED Debug (`Cek Data Simulasi:60`)

```json
{
  "rooms": {
    "ruang_tamu": {"temperature":27.3,"humidity":64.2,"status":"online"},
    "kamar_1": {"temperature":26.8,"status":"simulasi"}
  },
  "sensor_status": {"ruang_tamu":"online"},
  "pintu_masuk": {"motion_detected":false}
}
```

Offline 15s: `ruang_tamu: {temperature:null, status:"offline", lastSeen:"2026-08-31T..."}`

### 7.4 Dashboard

- **Normal:** Card Ruang Tamu `27.3°` hijau, `avgTemp 27.1° 5/5 online`, chart Ruang Tamu garis kontinu.
- **Offline (cabut DHT11):** Card `—` merah `OFFLINE` `Sensor Offline`, banner `⚠ Ruang Tamu — Sensor DHT11 Offline`, detail `— Sensor DHT11 terputus lastSeen 12:35:00`, chart gap, `curl /api/sensor` → `temperature:null`.
- **4 ruangan lain & pintu:** Tetap simulasi `kamar_1 26.8°C`, `pintu CLEAR/TERDETEKSI` `js/app.js:123`.

### 7.5 Histori

`curl http://localhost:1880/api/history | jq length` → `200` max, `rooms.ruang_tamu:null` saat offline, export CSV `log_ruang_tamu.csv` skip offline entries `js/charts.js:122`.

**Screenshot:** *Placeholder — isi manual: Dashboard Normal, Dashboard Offline, Serial Monitor, mosquitto_sub, Node-RED Debug. Tempel di Word halaman 9-10.*

---

## 8. Penutup

Hybrid 1 real + 4 simulasi membuktikan alur Sensor→Platform→User dengan penanganan offline jujur (gap, bukan dummy). Total file: `index.html`, `css/style.css`, `js/*` (5 file), `flow.json` 316 line, `hardware/esp32_dht11_mqtt.ino` 131 line, `docs/LAPORAN.docx` — branch `feature/hardware-dht11` `b2ee688`.

**Lampiran:** Link GitHub, `flow.json` full, `flow.json.bak`, `git log --oneline`.
