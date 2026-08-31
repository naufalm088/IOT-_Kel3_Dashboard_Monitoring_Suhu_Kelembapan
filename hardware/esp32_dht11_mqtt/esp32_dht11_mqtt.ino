// ============================================================
// ESP32 + DHT11 + MQTT — Smart Home Sensor (Ruang Tamu)
// Publish suhu & kelembaban tiap 5 detik ke Node-RED
//
// Library: DHT sensor library by Adafruit (1.4.4)
//          Adafruit Unified Sensor (1.1.x)
//          PubSubClient by Nick O'Leary (2.8)
//
// Wiring (modul DHT11 3-pin, tanpa resistor eksternal):
//   DHT11 VCC -> ESP32 3V3
//   DHT11 GND -> ESP32 GND
//   DHT11 DATA -> ESP32 D4 (GPIO4)
// ============================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"

// ----- PIN DHT11 -----
#define DHTPIN 4       // D4 = GPIO4
#define DHTTYPE DHT11

// ----- WIFI -----
const char* ssid     = "Kos ijo";
const char* password  = "Aslan199";

// ----- MQTT BROKER (IP laptop) -----
const char* mqtt_server = "192.168.1.13";
const int   mqtt_port   = 1883;

// ----- TOPIC -----
const char* topic_data = "smarthome/ruang_tamu/dht11";

// ----- INTERVAL -----
const unsigned long intervalMs = 5000; // publish tiap 5 detik

// ----- OBJEK -----
DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastPublish = 0;

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== Smart Home DHT11 MQTT ===");

  // Mulai DHT
  dht.begin();

  // Koneksi WiFi
  Serial.printf("Menghubungkan WiFi: %s", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.printf("WiFi terhubung! IP: %s\n", WiFi.localIP().toString().c_str());

  // Koneksi MQTT
  client.setServer(mqtt_server, mqtt_port);
  reconnectMQTT();
}

// ============================================================
// LOOP
// ============================================================
void loop() {
  // Pastikan MQTT tetap terhubung
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // Publish data tiap interval
  unsigned long now = millis();
  if (now - lastPublish >= intervalMs) {
    lastPublish = now;

    float temperature = dht.readTemperature(); // Celsius
    float humidity    = dht.readHumidity();

    // Validasi bacaan — publish offline jika gagal agar dashboard warning
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("[DHT11] Gagal membaca sensor! Cek wiring. -> publish offline");
      client.publish("smarthome/ruang_tamu/status", "offline", true);
      return;
    }
    // DHT11 terbaca -> pastikan status online
    client.publish("smarthome/ruang_tamu/status", "online", true);

    // Buat JSON payload
    char payload[80];
    snprintf(payload, sizeof(payload),
             "{\"temperature\":%.1f,\"humidity\":%.1f}",
             temperature, humidity);

    // Publish ke MQTT
    if (client.publish(topic_data, payload)) {
      Serial.printf("[MQTT] Publish -> %s : %s\n", topic_data, payload);
    } else {
      Serial.println("[MQTT] Gagal publish!");
    }
  }
}

// ============================================================
// MQTT RECONNECT
// ============================================================
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.printf("Menghubungkan MQTT %s:%d ... ", mqtt_server, mqtt_port);

    String clientId = "ESP32-SmartHome-";
    clientId += String(random(10000));

    if (client.connect(clientId.c_str())) {
      Serial.println("Terhubung!");
      Serial.printf("Topic: %s\n", topic_data);
    } else {
      Serial.printf("Gagal (rc=%d), coba lagi dalam 5 detik\n", client.state());
      delay(5000);
    }
  }
}
