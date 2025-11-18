#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>
#include <time.h>

// ==================== SMART BIN CONFIGURATION ====================
// WiFi credentials
const char* ssid = "vivoY15s";
const char* password = "12345678";

// Firestore settings
const char* project_id = "clearo-73407";
const char* firestore_api_key = "AIzaSyD4km-aHvRYdofBFLCLYWXlarY-Jsj_CBk";

// ⚠️ ⚠️ ⚠️ CHANGE THIS FOR EACH BIN ⚠️ ⚠️ ⚠️
const char* bin_id = "SMART_BIN_003_S";
const char* location_name = "236 Lakdam Studio";
const bool has_gps = true;                        

// Firestore collections
const char* bins_collection = "smart_bins";
const char* history_collection = "fill_history";
const char* alerts_collection = "alerts";

// Pin definitions
const int GPS_RX_PIN = 16;
const int GPS_TX_PIN = 17;
const int TRIG_PIN = 18;
const int ECHO_PIN = 19;
const int LED_PIN = 2;
const int BUZZER_PIN = 23;

// ==================== ACCURATE BIN MEASUREMENTS ====================
const float BIN_HEIGHT_CM = 30.0;              // Your new bin height
const float SENSOR_HEIGHT_FROM_TOP_CM = 1.5;
const float SENSOR_TO_BIN_BOTTOM = BIN_HEIGHT_CM + SENSOR_HEIGHT_FROM_TOP_CM;

// ACCURATE THRESHOLDS
const float CRITICAL_FULL_THRESHOLD = 95.0;
const float FULL_THRESHOLD = 85.0;
const float HIGH_THRESHOLD = 70.0;
const float MEDIUM_THRESHOLD = 50.0;
const float LOW_THRESHOLD = 25.0;
const float EMPTY_THRESHOLD = 10.0;

// Sensor accuracy settings
const int READINGS_COUNT = 5;
const float MAX_VALID_DISTANCE = 50.0;
const float MIN_VALID_DISTANCE = 1.0;
const unsigned long SENSOR_TIMEOUT = 25000;

// Timing settings
const unsigned long SEND_INTERVAL = 10000;     // 10 seconds
const unsigned long SENSOR_READ_INTERVAL = 2000;

// ==================== GLOBAL VARIABLES ====================
TinyGPSPlus gps;
HardwareSerial SerialGPS(2);

// Location data
float latitude = 0.0;
float longitude = 0.0;
float altitude_m = 0.0;
int satellites = 0;
bool gpsFixed = false;

// Bin measurement data
float distance_cm = 0.0;
float fill_percentage = 0.0;
float waste_height_cm = 0.0;
String bin_status = "INITIALIZING";
String fill_level = "UNKNOWN";

// State tracking
bool bin_full_alert = false;
bool bin_critical_alert = false;
bool wasEmpty = true;
bool wasFull = false;
bool wasCritical = false;

// Timing variables
unsigned long lastSend = 0;
unsigned long lastSensorRead = 0;
unsigned long dataCounter = 0;
unsigned long deviceUptime = 0;
unsigned long lastEmptyTime = 0;
unsigned long lastFullTime = 0;
unsigned long lastCriticalTime = 0;

// Status flags
bool gpsConnected = false;
bool sensorWorking = false;
bool wifiConnected = false;

// Battery monitoring
const int BATTERY_PIN = 34;
const float VOLTAGE_DIVIDER_RATIO = 2.0;
const float REFERENCE_VOLTAGE = 3.3;
float battery_voltage = 0.0;
int battery_percentage = 0;

// NTP Time
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 19800;
const int daylightOffset_sec = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Display bin information
  Serial.println("========================================");
  Serial.println("🚀 SMART BIN SYSTEM - SINGLE BIN MODE");
  Serial.println("========================================");
  Serial.println("📋 BIN CONFIGURATION:");
  Serial.println("   🆔 ID: " + String(bin_id));
  Serial.println("   📍 Location: " + String(location_name));
  Serial.println("   📡 GPS: " + String(has_gps ? "ENABLED" : "DISABLED"));
  Serial.println("   📏 Height: " + String(BIN_HEIGHT_CM) + "cm");
  Serial.println("========================================");
  
  // Initialize pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BATTERY_PIN, INPUT);
  
  digitalWrite(TRIG_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  
  // Initialize GPS if enabled
  if (has_gps) {
    SerialGPS.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    Serial.println("📡 GPS initialized");
  } else {
    Serial.println("📡 GPS disabled for this bin");
  }
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize time
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("⏰ Synchronizing time...");
  delay(2000);
  
  // Test sensors
  testSensors();
  
  // Read battery
  readBatteryVoltage();
  
  Serial.println("========================================");
  Serial.println("✅ BIN READY - Starting monitoring...");
  Serial.println("📊 Data refresh: Every 10 seconds");
  Serial.println("🎯 Ultra-accurate measurements");
  Serial.println("========================================");
  
  // Send initial data
  sendBinDataToFirestore();
}

void loop() {
  deviceUptime = millis();
  
  // Read sensor every 2 seconds
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL) {
    if (has_gps) {
      readGPS();
    }
    readBinLevelAccurate();
    updateBinStatus();
    displayCurrentStatus();
    lastSensorRead = millis();
  }
  
  // Send to Firebase every 10 seconds
  if (millis() - lastSend >= SEND_INTERVAL) {
    readBatteryVoltage();
    sendBinDataToFirestore();
    lastSend = millis();
    dataCounter++;
  }
  
  checkWiFiConnection();
  delay(100);
}

// ==================== WIFI FUNCTIONS ====================
void connectToWiFi() {
  WiFi.disconnect();
  delay(1000);
  WiFi.mode(WIFI_STA);
  
  Serial.println("📶 Connecting to: " + String(ssid));
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ WiFi Connected!");
    Serial.println("📡 IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n❌ WiFi Failed!");
    wifiConnected = false;
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED && wifiConnected) {
    Serial.println("📶 WiFi lost! Reconnecting...");
    wifiConnected = false;
    connectToWiFi();
  }
}

// ==================== GPS FUNCTIONS ====================
void readGPS() {
  if (!has_gps) return;
  
  bool newData = false;
  while (SerialGPS.available() > 0) {
    if (gps.encode(SerialGPS.read())) {
      newData = true;
    }
  }
  
  if (newData && gps.location.isValid()) {
    latitude = gps.location.lat();
    longitude = gps.location.lng();
    gpsConnected = true;
    gpsFixed = true;
    
    if (gps.altitude.isValid()) altitude_m = gps.altitude.meters();
    if (gps.satellites.isValid()) satellites = gps.satellites.value();
  }
}

// ==================== SENSOR FUNCTIONS ====================
float takeSingleReading() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(5);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, SENSOR_TIMEOUT);
  if (duration == 0) return -1;
  
  float distance = (duration * 0.0343) / 2;
  if (distance < MIN_VALID_DISTANCE || distance > MAX_VALID_DISTANCE) return -1;
  
  return distance;
}

void readBinLevelAccurate() {
  float readings[READINGS_COUNT];
  int validReadings = 0;
  
  for (int i = 0; i < READINGS_COUNT; i++) {
    float reading = takeSingleReading();
    if (reading > 0) {
      readings[validReadings] = reading;
      validReadings++;
    }
    delay(50);
  }
  
  if (validReadings == 0) {
    sensorWorking = false;
    bin_status = "SENSOR_ERROR";
    fill_level = "UNKNOWN";
    return;
  }
  
  sensorWorking = true;
  
  // Use median for accuracy
  if (validReadings >= 3) {
    // Sort readings
    for (int i = 0; i < validReadings - 1; i++) {
      for (int j = i + 1; j < validReadings; j++) {
        if (readings[i] > readings[j]) {
          float temp = readings[i];
          readings[i] = readings[j];
          readings[j] = temp;
        }
      }
    }
    distance_cm = readings[validReadings / 2];
  } else {
    // Use average
    float sum = 0;
    for (int i = 0; i < validReadings; i++) sum += readings[i];
    distance_cm = sum / validReadings;
  }
  
  // Calculate fill percentage
  waste_height_cm = SENSOR_TO_BIN_BOTTOM - distance_cm;
  if (waste_height_cm < 0) waste_height_cm = 0;
  if (waste_height_cm > BIN_HEIGHT_CM) waste_height_cm = BIN_HEIGHT_CM;
  
  fill_percentage = (waste_height_cm / BIN_HEIGHT_CM) * 100.0;
  fill_percentage = constrain(fill_percentage, 0, 100);
  fill_percentage = round(fill_percentage * 10.0) / 10.0;
}

void updateBinStatus() {
  if (!sensorWorking) {
    bin_status = "SENSOR_ERROR";
    fill_level = "UNKNOWN";
    bin_full_alert = false;
    bin_critical_alert = false;
    return;
  }
  
  if (fill_percentage >= CRITICAL_FULL_THRESHOLD) {
    fill_level = "CRITICAL";
    bin_status = "CRITICAL_FULL";
    bin_full_alert = true;
    bin_critical_alert = true;
  } else if (fill_percentage >= FULL_THRESHOLD) {
    fill_level = "FULL";
    bin_status = "FULL";
    bin_full_alert = true;
    bin_critical_alert = false;
  } else if (fill_percentage >= HIGH_THRESHOLD) {
    fill_level = "HIGH";
    bin_status = "ALMOST_FULL";
    bin_full_alert = false;
    bin_critical_alert = false;
  } else if (fill_percentage >= MEDIUM_THRESHOLD) {
    fill_level = "MEDIUM";
    bin_status = "HALF_FULL";
    bin_full_alert = false;
    bin_critical_alert = false;
  } else if (fill_percentage >= LOW_THRESHOLD) {
    fill_level = "LOW";
    bin_status = "QUARTER_FULL";
    bin_full_alert = false;
    bin_critical_alert = false;
  } else if (fill_percentage >= EMPTY_THRESHOLD) {
    fill_level = "VERY_LOW";
    bin_status = "NEARLY_EMPTY";
    bin_full_alert = false;
    bin_critical_alert = false;
  } else {
    fill_level = "EMPTY";
    bin_status = "EMPTY";
    bin_full_alert = false;
    bin_critical_alert = false;
  }
}

// ==================== BATTERY MONITORING ====================
void readBatteryVoltage() {
  int analogValue = analogRead(BATTERY_PIN);
  battery_voltage = (analogValue * REFERENCE_VOLTAGE / 4095.0) * VOLTAGE_DIVIDER_RATIO;
  battery_percentage = map(constrain(battery_voltage * 100, 330, 420), 330, 420, 0, 100);
}

// ==================== DISPLAY FUNCTIONS ====================
void displayCurrentStatus() {
  Serial.print("📊 " + String(bin_id) + " | ");
  Serial.print("Fill: " + String(fill_percentage, 1) + "% ");
  Serial.print("[" + fill_level + "] ");
  Serial.print("H:" + String(waste_height_cm, 1) + "cm ");
  Serial.print("D:" + String(distance_cm, 1) + "cm ");
  Serial.print("Sensor:" + String(sensorWorking ? "✅" : "❌") + " ");
  Serial.print("WiFi:" + String(wifiConnected ? "✅" : "❌") + " ");
  if (has_gps) Serial.print("GPS:" + String(gpsFixed ? "✅" : "🔍") + " ");
  Serial.print("Batt:" + String(battery_percentage) + "%");
  
  if (bin_critical_alert) Serial.print(" 🔴CRITICAL");
  else if (bin_full_alert) Serial.print(" 🟠FULL");
  
  Serial.println();
}

void testSensors() {
  Serial.println("🔧 Testing sensors...");
  int validReadings = 0;
  
  for (int i = 0; i < 5; i++) {
    float dist = takeSingleReading();
    if (dist > 0) {
      validReadings++;
      Serial.println("   Reading " + String(i+1) + ": " + String(dist, 1) + "cm ✅");
    } else {
      Serial.println("   Reading " + String(i+1) + ": Failed ❌");
    }
    delay(200);
  }
  
  Serial.println("📊 Sensor test: " + String(validReadings) + "/5 valid readings");
}

// ==================== FIRESTORE FUNCTIONS ====================
void sendBinDataToFirestore() {
  if (!wifiConnected) {
    Serial.println("❌ No WiFi - Data not sent");
    return;
  }
  
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();
  
  String timestamp = getCurrentTimestamp();
  String iso_timestamp = getCurrentISOTimestamp();
  
  DynamicJsonDocument doc(3072);
  
  // Basic info
  doc["fields"]["bin_id"]["stringValue"] = bin_id;
  doc["fields"]["location"]["stringValue"] = location_name;
  doc["fields"]["timestamp"]["timestampValue"] = iso_timestamp;
  
  // Fill data
  doc["fields"]["fill_percentage"]["doubleValue"] = fill_percentage;
  doc["fields"]["waste_height_cm"]["doubleValue"] = round(waste_height_cm * 10) / 10.0;
  doc["fields"]["distance_cm"]["doubleValue"] = round(distance_cm * 10) / 10.0;
  doc["fields"]["bin_status"]["stringValue"] = bin_status;
  doc["fields"]["fill_level"]["stringValue"] = fill_level;
  doc["fields"]["bin_height_cm"]["doubleValue"] = BIN_HEIGHT_CM;
  
  // Alerts
  doc["fields"]["is_full"]["booleanValue"] = bin_full_alert;
  doc["fields"]["is_critical"]["booleanValue"] = bin_critical_alert;
  doc["fields"]["needs_emptying"]["booleanValue"] = (fill_percentage >= FULL_THRESHOLD);
  
  // Location data
  if (has_gps && gpsFixed) {
    doc["fields"]["latitude"]["doubleValue"] = latitude;
    doc["fields"]["longitude"]["doubleValue"] = longitude;
    doc["fields"]["satellites"]["integerValue"] = String(satellites);
  }
  
  // Battery
  doc["fields"]["battery_voltage"]["doubleValue"] = battery_voltage;
  doc["fields"]["battery_percentage"]["integerValue"] = String(battery_percentage);
  
  // System info
  doc["fields"]["sensor_working"]["booleanValue"] = sensorWorking;
  doc["fields"]["wifi_connected"]["booleanValue"] = wifiConnected;
  doc["fields"]["data_count"]["integerValue"] = String(dataCounter);
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("🔥 Sending to Firebase... ");
  
  String url = "https://firestore.googleapis.com/v1/projects/" + String(project_id) + 
               "/databases/(default)/documents/" + String(bins_collection) + "/" + String(bin_id) + 
               "?key=" + String(firestore_api_key);
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  
  int statusCode = http.PATCH(jsonString);
  if (statusCode == 200) {
    Serial.println("✅ Success");
  } else if (statusCode == 404) {
    // Create new document
    http.PUT(jsonString);
    Serial.println("✅ Created new document");
  } else {
    Serial.println("❌ Failed (" + String(statusCode) + ")");
  }
  http.end();
}

// ==================== UTILITY FUNCTIONS ====================
String getCurrentTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "Time not set";
  }
  
  char timeStringBuff[50];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(timeStringBuff);
}

String getCurrentISOTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "2024-01-01T00:00:00Z";
  }
  
  char timeStringBuff[30];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(timeStringBuff);
}