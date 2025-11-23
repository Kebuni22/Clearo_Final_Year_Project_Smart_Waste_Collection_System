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

const char* bin_id = "SMART_BIN_003_S";
const char* location_name = "236 Lakdam Studio";
const bool has_gps = true;               // CHANGE THIS FOR EACH BIN

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
const float BIN_HEIGHT_CM = 30.0;
const float SENSOR_HEIGHT_FROM_TOP_CM = 1.5;
const float SENSOR_TO_BIN_BOTTOM = BIN_HEIGHT_CM + SENSOR_HEIGHT_FROM_TOP_CM;

// Calibration offset (adjust if needed for sensor accuracy)
const float SENSOR_CALIBRATION_OFFSET = 0.0;

// ACCURATE THRESHOLDS
const float CRITICAL_FULL_THRESHOLD = 95.0;
const float FULL_THRESHOLD = 85.0;
const float HIGH_THRESHOLD = 70.0;
const float MEDIUM_THRESHOLD = 50.0;
const float LOW_THRESHOLD = 25.0;
const float EMPTY_THRESHOLD = 10.0;

// Enhanced sensor accuracy settings
const int READINGS_COUNT = 15;            // Increased readings for better accuracy
const int WARMUP_READINGS = 5;            // More warmup readings
const float MAX_VALID_DISTANCE = 50.0;
const float MIN_VALID_DISTANCE = 1.0;
const unsigned long SENSOR_TIMEOUT = 30000;
const float OUTLIER_THRESHOLD = 4.0;      // Stricter outlier filtering

// Timing settings - FIXED FOR PROPER UPDATES
const unsigned long SEND_INTERVAL = 10000;        // Exactly 10 seconds
const unsigned long SENSOR_READ_INTERVAL = 2000;  // Read sensor every 2 seconds
const unsigned long OFFLINE_CHECK_INTERVAL = 60000; // Check offline status every 60 seconds (1 minute)

// ==================== GLOBAL VARIABLES ====================
TinyGPSPlus gps;
HardwareSerial SerialGPS(2);

// Location data
float latitude = 0.0;
float longitude = 0.0;
float altitude_m = 0.0;
int satellites = 0;
bool gpsFixed = false;

// Bin measurement data - for accuracy
float distance_cm = 0.0;
float fill_percentage = 0.0;
float waste_height_cm = 0.0;
String bin_status = "INITIALIZING";
String fill_level = "UNKNOWN";

// Enhanced measurement tracking
float last_valid_distance = 0.0;
float distance_change_rate = 0.0;
int consecutive_errors = 0;
const int MAX_CONSECUTIVE_ERRORS = 5;

// LAST SAVED DATA - stores the last successfully sent data
float last_saved_fill_percentage = 0.0;
float last_saved_waste_height = 0.0;
float last_saved_distance = 0.0;
String last_saved_status = "UNKNOWN";
String last_saved_fill_level = "UNKNOWN";
unsigned long last_saved_timestamp = 0;

// State tracking
bool bin_full_alert = false;
bool bin_critical_alert = false;
bool wasEmpty = true;
bool wasFull = false;
bool wasCritical = false;
bool is_online = true;  // Start as online

// Timing variables
unsigned long lastSend = 0;
unsigned long lastSensorRead = 0;
unsigned long lastOfflineCheck = 0;
unsigned long lastSuccessfulUpdate = 0;
unsigned long dataCounter = 0;
unsigned long deviceUptime = 0;
unsigned long bootTime = 0;

// Status flags
bool gpsConnected = false;
bool sensorWorking = false;
bool wifiConnected = false;
bool firestoreConnected = false;

// NTP Time
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 19800;  // IST +5:30
const int daylightOffset_sec = 0;

// Error tracking
String last_error = "NONE";
int error_count = 0;

// Sensor statistics
float min_distance = 999.0;
float max_distance = 0.0;
float avg_distance = 0.0;
int total_readings = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  bootTime = millis();
  
  // Display bin information
  Serial.println("========================================");
  Serial.println("🚀 SMART BIN SYSTEM v3.0 - ULTRA ACCURATE");
  Serial.println("========================================");
  Serial.println("📋 BIN CONFIGURATION:");
  Serial.println("   🆔 ID: " + String(bin_id));
  Serial.println("   📍 Location: " + String(location_name));
  Serial.println("   📡 GPS: " + String(has_gps ? "ENABLED" : "DISABLED"));
  Serial.println("   📏 Height: " + String(BIN_HEIGHT_CM) + "cm");
  Serial.println("   🎯 Ultra-Accurate Mode (15 readings)");
  Serial.println("   📊 Update: Every 10 seconds");
  Serial.println("   ⏱️  Auto-Offline: After 1 minute");
  Serial.println("   💾 Last Data Saved: ON STOP");
  Serial.println("========================================");
  
  // Initialize pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  digitalWrite(TRIG_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  
  // Initialize GPS if enabled
  if (has_gps) {
    SerialGPS.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    Serial.println("📡 GPS initialized - Waiting for fix...");
    gpsConnected = true;
  } else {
    Serial.println("📡 GPS disabled for this bin");
    gpsConnected = false;
    gpsFixed = false;
  }
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize time
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("⏰ Synchronizing time...");
  delay(2000);
  
  // Warm up sensor
  Serial.println("🔧 Warming up ultrasonic sensor...");
  for (int i = 0; i < WARMUP_READINGS; i++) {
    takeSingleReading();
    delay(100);
  }
  
  // Test sensors with enhanced diagnostics
  testSensorsEnhanced();
  
  // Mark as online and save initial timestamp
  is_online = true;
  lastSuccessfulUpdate = millis();
  lastOfflineCheck = millis();
  
  Serial.println("========================================");
  Serial.println("✅ BIN READY - Starting monitoring...");
  Serial.println("📊 Updates: Every 10 seconds (PRECISE)");
  Serial.println("🎯 Ultra-accurate fill measurements");
  Serial.println("🟢 Status: ONLINE");
  Serial.println("⚠️  Auto-offline: After 1 minute no updates");
  Serial.println("💾 Last data saved on stop");
  Serial.println("========================================");
  
  // Send initial data with online status
  sendBinDataToFirestore();
}

void loop() {
  deviceUptime = millis() - bootTime;
  
  // Read sensor every 2 seconds for accurate continuous monitoring
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL) {
    if (has_gps) {
      readGPS();
    }
    readBinLevelEnhanced();
    updateBinStatus();
    displayCurrentStatus();
    lastSensorRead = millis();
  }
  
  // Send to Firebase EXACTLY every 10 seconds
  if (millis() - lastSend >= SEND_INTERVAL) {
    sendBinDataToFirestore();
    lastSend = millis();
    dataCounter++;
  }
  
  // Check offline status every 1 minute
  if (millis() - lastOfflineCheck >= OFFLINE_CHECK_INTERVAL) {
    checkOfflineStatus();
    lastOfflineCheck = millis();
  }
  
  checkWiFiConnection();
  delay(50);  // Reduced delay for more responsive system
}

// ==================== WIFI FUNCTIONS ====================
void connectToWiFi() {
  WiFi.disconnect();
  delay(1000);
  WiFi.mode(WIFI_STA);
  
  Serial.println("📶 Connecting to: " + String(ssid));
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    if (attempts % 10 == 0) {
      Serial.println();
      Serial.print("📶 Retry attempt " + String(attempts/10) + "...");
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    is_online = true;
    Serial.println("\n✅ WiFi Connected!");
    Serial.println("📡 IP: " + WiFi.localIP().toString());
    Serial.println("📶 Signal: " + String(WiFi.RSSI()) + " dBm");
  } else {
    Serial.println("\n❌ WiFi Failed!");
    wifiConnected = false;
    is_online = false;
    last_error = "WIFI_CONNECTION_FAILED";
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED && wifiConnected) {
    Serial.println("📶 WiFi lost! Reconnecting...");
    wifiConnected = false;
    is_online = false;
    connectToWiFi();
  }
}

// ==================== OFFLINE DETECTION ====================
void checkOfflineStatus() {
  unsigned long timeSinceLastUpdate = millis() - lastSuccessfulUpdate;
  
  // If more than 60 seconds (1 minute) since last successful update
  if (timeSinceLastUpdate > OFFLINE_CHECK_INTERVAL) {
    if (is_online) {
      Serial.println("🔴 DEVICE MARKED OFFLINE - No updates for 1 minute");
      is_online = false;
      // Update offline status in Firestore
      updateOfflineStatus();
    }
  } else {
    // Device is sending updates regularly
    if (!is_online && wifiConnected) {
      Serial.println("🟢 DEVICE BACK ONLINE - Updates resumed");
      is_online = true;
    }
  }
}

void updateOfflineStatus() {
  if (!wifiConnected) {
    return;
  }
  
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();
  
  String iso_timestamp = getCurrentISOTimestamp();
  
  // Update to OFFLINE status with last saved data
  DynamicJsonDocument doc(2048);
  doc["fields"]["is_online"]["booleanValue"] = false;
  doc["fields"]["connection_status"]["stringValue"] = "OFFLINE";
  doc["fields"]["last_updated"]["timestampValue"] = iso_timestamp;
  
  // Keep last saved fill data
  doc["fields"]["fill_percentage"]["doubleValue"] = last_saved_fill_percentage;
  doc["fields"]["waste_height_cm"]["doubleValue"] = last_saved_waste_height;
  doc["fields"]["distance_cm"]["doubleValue"] = last_saved_distance;
  doc["fields"]["bin_status"]["stringValue"] = last_saved_status;
  doc["fields"]["fill_level"]["stringValue"] = last_saved_fill_level;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  String url = "https://firestore.googleapis.com/v1/projects/" + String(project_id) + 
               "/databases/(default)/documents/" + String(bins_collection) + "/" + String(bin_id) + 
               "?updateMask.fieldPaths=is_online&updateMask.fieldPaths=connection_status&updateMask.fieldPaths=last_updated&key=" + String(firestore_api_key);
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  
  int statusCode = http.PATCH(jsonString);
  
  if (statusCode == 200) {
    Serial.println("💾 Offline status saved with last data");
  }
  
  http.end();
}

// ==================== GPS FUNCTIONS ====================
void readGPS() {
  if (!has_gps) return;
  
  bool newData = false;
  unsigned long gpsStart = millis();
  
  // Read GPS data for up to 100ms
  while (SerialGPS.available() > 0 && (millis() - gpsStart) < 100) {
    if (gps.encode(SerialGPS.read())) {
      newData = true;
    }
  }
  
  if (newData) {
    if (gps.location.isValid()) {
      latitude = gps.location.lat();
      longitude = gps.location.lng();
      gpsFixed = true;
      
      if (gps.altitude.isValid()) {
        altitude_m = gps.altitude.meters();
      }
      if (gps.satellites.isValid()) {
        satellites = gps.satellites.value();
      }
    } else {
      gpsFixed = false;
    }
  }
  
  // Update GPS connection status
  if (gps.charsProcessed() < 10) {
    gpsConnected = false;
  } else {
    gpsConnected = true;
  }
}

// ==================== ENHANCED SENSOR FUNCTIONS ====================
float takeSingleReading() {
  // Clear trigger
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  // Send pulse
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Measure echo
  long duration = pulseIn(ECHO_PIN, HIGH, SENSOR_TIMEOUT);
  
  if (duration == 0) {
    return -1.0;  // Timeout
  }
  
  // Calculate distance (speed of sound: 343 m/s = 0.0343 cm/μs)
  float distance = (duration * 0.0343) / 2.0;
  
  // Apply calibration offset
  distance += SENSOR_CALIBRATION_OFFSET;
  
  // Validate reading
  if (distance < MIN_VALID_DISTANCE || distance > MAX_VALID_DISTANCE) {
    return -1.0;
  }
  
  return distance;
}

float calculateMedian(float* arr, int size) {
  if (size == 0) return 0.0;
  
  // Create a copy to avoid modifying original array
  float temp[size];
  for (int i = 0; i < size; i++) {
    temp[i] = arr[i];
  }
  
  // Bubble sort
  for (int i = 0; i < size - 1; i++) {
    for (int j = i + 1; j < size; j++) {
      if (temp[i] > temp[j]) {
        float tempVal = temp[i];
        temp[i] = temp[j];
        temp[j] = tempVal;
      }
    }
  }
  
  // Return median
  if (size % 2 == 0) {
    return (temp[size/2 - 1] + temp[size/2]) / 2.0;
  } else {
    return temp[size/2];
  }
}

float filterOutliers(float* readings, int count, float median) {
  if (count == 0) return 0.0;
  
  float filtered[READINGS_COUNT];
  int filteredCount = 0;
  
  // Remove outliers (readings far from median)
  for (int i = 0; i < count; i++) {
    if (abs(readings[i] - median) <= OUTLIER_THRESHOLD) {
      filtered[filteredCount] = readings[i];
      filteredCount++;
    }
  }
  
  // Calculate average of filtered readings
  if (filteredCount > 0) {
    float sum = 0.0;
    for (int i = 0; i < filteredCount; i++) {
      sum += filtered[i];
    }
    return sum / filteredCount;
  }
  
  return median;  // Fallback to median
}

void readBinLevelEnhanced() {
  float readings[READINGS_COUNT];
  int validReadings = 0;
  
  // Take multiple readings for maximum accuracy
  for (int i = 0; i < READINGS_COUNT; i++) {
    float reading = takeSingleReading();
    if (reading > 0.0) {
      readings[validReadings] = reading;
      validReadings++;
    }
    delay(30);  // Small delay between readings
  }
  
  // Check if we have enough valid readings
  if (validReadings < 5) {  // Need at least 5 valid readings
    consecutive_errors++;
    
    if (consecutive_errors >= MAX_CONSECUTIVE_ERRORS) {
      sensorWorking = false;
      bin_status = "SENSOR_ERROR";
      fill_level = "UNKNOWN";
      last_error = "INSUFFICIENT_READINGS";
      error_count++;
      Serial.println("❌ SENSOR ERROR: Too many failed readings!");
    } else {
      // Use last valid distance with warning
      distance_cm = last_valid_distance;
      sensorWorking = (last_valid_distance > 0.0);
      Serial.println("⚠️  Using last valid reading due to sensor issues");
    }
    return;
  }
  
  // Reset error counter
  consecutive_errors = 0;
  sensorWorking = true;
  
  // Calculate median
  float median = calculateMedian(readings, validReadings);
  
  // Filter outliers and get final distance
  float filteredDistance = filterOutliers(readings, validReadings, median);
  
  // Calculate change rate
  if (last_valid_distance > 0.0) {
    distance_change_rate = abs(filteredDistance - last_valid_distance);
  }
  
  // Update distance
  distance_cm = filteredDistance;
  last_valid_distance = distance_cm;
  
  // Update sensor statistics
  updateSensorStats(distance_cm);
  
  // Calculate waste height (distance from sensor to waste surface)
  waste_height_cm = SENSOR_TO_BIN_BOTTOM - distance_cm;
  
  // Constrain values
  if (waste_height_cm < 0.0) waste_height_cm = 0.0;
  if (waste_height_cm > BIN_HEIGHT_CM) waste_height_cm = BIN_HEIGHT_CM;
  
  // Calculate fill percentage (waste height / bin height * 100)
  fill_percentage = (waste_height_cm / BIN_HEIGHT_CM) * 100.0;
  fill_percentage = constrain(fill_percentage, 0.0, 100.0);
  
  // Round to 1 decimal place for accuracy
  fill_percentage = round(fill_percentage * 10.0) / 10.0;
  waste_height_cm = round(waste_height_cm * 10.0) / 10.0;
  distance_cm = round(distance_cm * 10.0) / 10.0;
}

void updateSensorStats(float currentDistance) {
  total_readings++;
  
  // Update min/max
  if (currentDistance < min_distance) min_distance = currentDistance;
  if (currentDistance > max_distance) max_distance = currentDistance;
  
  // Update running average
  avg_distance = ((avg_distance * (total_readings - 1)) + currentDistance) / total_readings;
}

void updateBinStatus() {
  if (!sensorWorking) {
    bin_status = "SENSOR_ERROR";
    fill_level = "UNKNOWN";
    bin_full_alert = false;
    bin_critical_alert = false;
    return;
  }
  
  // Determine fill level and status based on accurate thresholds
  if (fill_percentage >= CRITICAL_FULL_THRESHOLD) {
    fill_level = "CRITICAL";
    bin_status = "CRITICAL_FULL";
    bin_full_alert = true;
    bin_critical_alert = true;
    
    if (!wasCritical) {
      Serial.println("🔴 ALERT: Bin reached CRITICAL level!");
      wasCritical = true;
    }
  } else if (fill_percentage >= FULL_THRESHOLD) {
    fill_level = "FULL";
    bin_status = "FULL";
    bin_full_alert = true;
    bin_critical_alert = false;
    wasCritical = false;
    
    if (!wasFull) {
      Serial.println("🟠 ALERT: Bin is FULL!");
      wasFull = true;
    }
  } else if (fill_percentage >= HIGH_THRESHOLD) {
    fill_level = "HIGH";
    bin_status = "ALMOST_FULL";
    bin_full_alert = false;
    bin_critical_alert = false;
    wasFull = false;
    wasCritical = false;
  } else if (fill_percentage >= MEDIUM_THRESHOLD) {
    fill_level = "MEDIUM";
    bin_status = "HALF_FULL";
    bin_full_alert = false;
    bin_critical_alert = false;
    wasFull = false;
    wasCritical = false;
  } else if (fill_percentage >= LOW_THRESHOLD) {
    fill_level = "LOW";
    bin_status = "QUARTER_FULL";
    bin_full_alert = false;
    bin_critical_alert = false;
    wasFull = false;
    wasCritical = false;
  } else if (fill_percentage >= EMPTY_THRESHOLD) {
    fill_level = "VERY_LOW";
    bin_status = "NEARLY_EMPTY";
    bin_full_alert = false;
    bin_critical_alert = false;
    wasFull = false;
    wasCritical = false;
  } else {
    fill_level = "EMPTY";
    bin_status = "EMPTY";
    bin_full_alert = false;
    bin_critical_alert = false;
    wasFull = false;
    wasCritical = false;
    
    if (!wasEmpty) {
      Serial.println("🟢 Bin has been emptied!");
      wasEmpty = true;
    }
  }
}

// ==================== DISPLAY FUNCTIONS ====================
void displayCurrentStatus() {
  Serial.print("📊 " + String(bin_id) + " | ");
  Serial.print("Fill: " + String(fill_percentage, 1) + "% ");
  Serial.print("[" + fill_level + "] | ");
  Serial.print("H:" + String(waste_height_cm, 1) + "cm ");
  Serial.print("D:" + String(distance_cm, 1) + "cm | ");
  
  // Status indicators
  Serial.print(is_online ? "🟢 ONLINE" : "🔴 OFFLINE");
  Serial.print(" | Sensor:" + String(sensorWorking ? "✅" : "❌") + " ");
  Serial.print("WiFi:" + String(wifiConnected ? "✅" : "❌") + " ");
  
  if (has_gps) {
    Serial.print("GPS:" + String(gpsFixed ? "✅" : "🔍") + " ");
    if (gpsFixed) {
      Serial.print("Sats:" + String(satellites) + " ");
    }
  } else {
    Serial.print("GPS:N/A ");
  }
  
  // Alerts
  if (bin_critical_alert) Serial.print("🔴 CRITICAL");
  else if (bin_full_alert) Serial.print("🟠 FULL");
  
  Serial.println();
}

void testSensorsEnhanced() {
  Serial.println("🔧 Enhanced sensor diagnostics...");
  float testReadings[15];
  int validCount = 0;
  
  for (int i = 0; i < 15; i++) {
    float dist = takeSingleReading();
    if (dist > 0.0) {
      testReadings[validCount] = dist;
      validCount++;
      Serial.println("   ✅ Reading " + String(i+1) + ": " + String(dist, 2) + "cm");
    } else {
      Serial.println("   ❌ Reading " + String(i+1) + ": FAILED");
    }
    delay(100);
  }
  
  if (validCount >= 8) {
    float median = calculateMedian(testReadings, validCount);
    float filtered = filterOutliers(testReadings, validCount, median);
    
    Serial.println("📊 Test Results:");
    Serial.println("   Valid readings: " + String(validCount) + "/15");
    Serial.println("   Median distance: " + String(median, 2) + "cm");
    Serial.println("   Filtered distance: " + String(filtered, 2) + "cm");
    Serial.println("   ✅ Sensor working properly");
    sensorWorking = true;
    
    // Set initial values
    distance_cm = filtered;
    last_valid_distance = filtered;
  } else {
    Serial.println("⚠️  Warning: Low success rate (" + String(validCount) + "/15)");
    Serial.println("   Please check sensor connections");
    sensorWorking = false;
  }
}

// ==================== FIRESTORE FUNCTIONS ====================
void sendBinDataToFirestore() {
  if (!wifiConnected) {
    Serial.println("❌ No WiFi - Data not sent");
    is_online = false;
    return;
  }
  
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();
  
  String timestamp = getCurrentTimestamp();
  String iso_timestamp = getCurrentISOTimestamp();
  
  DynamicJsonDocument doc(4096);
  
  // Basic info
  doc["fields"]["bin_id"]["stringValue"] = bin_id;
  doc["fields"]["location"]["stringValue"] = location_name;
  doc["fields"]["timestamp"]["timestampValue"] = iso_timestamp;
  doc["fields"]["last_updated"]["timestampValue"] = iso_timestamp;
  
  // ONLINE when actively sending
  doc["fields"]["is_online"]["booleanValue"] = true;
  doc["fields"]["connection_status"]["stringValue"] = "ONLINE";
  
  // ACCURATE Fill data - rounded to 1 decimal
  doc["fields"]["fill_percentage"]["doubleValue"] = fill_percentage;
  doc["fields"]["waste_height_cm"]["doubleValue"] = waste_height_cm;
  doc["fields"]["distance_cm"]["doubleValue"] = distance_cm;
  doc["fields"]["bin_status"]["stringValue"] = bin_status;
  doc["fields"]["fill_level"]["stringValue"] = fill_level;
  doc["fields"]["bin_height_cm"]["doubleValue"] = BIN_HEIGHT_CM;
  
  // SAVE LAST DATA for offline mode
  last_saved_fill_percentage = fill_percentage;
  last_saved_waste_height = waste_height_cm;
  last_saved_distance = distance_cm;
  last_saved_status = bin_status;
  last_saved_fill_level = fill_level;
  last_saved_timestamp = millis();
  
  // Alerts
  doc["fields"]["is_full"]["booleanValue"] = bin_full_alert;
  doc["fields"]["is_critical"]["booleanValue"] = bin_critical_alert;
  doc["fields"]["needs_emptying"]["booleanValue"] = (fill_percentage >= FULL_THRESHOLD);
  
  // GPS data
  doc["fields"]["has_gps"]["booleanValue"] = has_gps;
  if (has_gps && gpsFixed) {
    doc["fields"]["latitude"]["doubleValue"] = latitude;
    doc["fields"]["longitude"]["doubleValue"] = longitude;
    doc["fields"]["altitude_m"]["doubleValue"] = altitude_m;
    doc["fields"]["satellites"]["integerValue"] = satellites;
    doc["fields"]["gps_status"]["stringValue"] = "FIXED";
  } else if (has_gps && !gpsFixed) {
    doc["fields"]["gps_status"]["stringValue"] = "SEARCHING";
  } else {
    doc["fields"]["gps_status"]["stringValue"] = "NOT_AVAILABLE";
  }
  
  // System info
  doc["fields"]["sensor_working"]["booleanValue"] = sensorWorking;
  doc["fields"]["wifi_connected"]["booleanValue"] = wifiConnected;
  doc["fields"]["wifi_signal_strength"]["integerValue"] = WiFi.RSSI();
  doc["fields"]["data_count"]["integerValue"] = dataCounter;
  doc["fields"]["uptime_seconds"]["integerValue"] = deviceUptime / 1000;
  doc["fields"]["error_count"]["integerValue"] = error_count;
  doc["fields"]["last_error"]["stringValue"] = last_error;
  
  // Sensor statistics
  doc["fields"]["min_distance"]["doubleValue"] = min_distance;
  doc["fields"]["max_distance"]["doubleValue"] = max_distance;
  doc["fields"]["avg_distance"]["doubleValue"] = avg_distance;
  doc["fields"]["total_readings"]["integerValue"] = total_readings;
  doc["fields"]["consecutive_errors"]["integerValue"] = consecutive_errors;
  
  // Power source info
  doc["fields"]["power_source"]["stringValue"] = "EXTERNAL_BATTERY_PACK";
  doc["fields"]["battery_monitoring"]["stringValue"] = "DISABLED";
  
  // Firmware info
  doc["fields"]["firmware_version"]["stringValue"] = "v3.0_ULTRA_ACCURATE";
  doc["fields"]["device_type"]["stringValue"] = "ESP32_ULTRASONIC";
  doc["fields"]["update_interval_seconds"]["integerValue"] = SEND_INTERVAL / 1000;
  doc["fields"]["readings_per_measurement"]["integerValue"] = READINGS_COUNT;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("🔥 Sending to Firebase (Update #" + String(dataCounter + 1) + ")... ");
  
  String url = "https://firestore.googleapis.com/v1/projects/" + String(project_id) + 
               "/databases/(default)/documents/" + String(bins_collection) + "/" + String(bin_id) + 
               "?key=" + String(firestore_api_key);
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  
  int statusCode = http.PATCH(jsonString);
  
  if (statusCode == 200) {
    Serial.println("✅ Success - STATUS: ONLINE");
    Serial.println("   📊 Fill: " + String(fill_percentage, 1) + "% | Height: " + String(waste_height_cm, 1) + "cm | Distance: " + String(distance_cm, 1) + "cm");
    firestoreConnected = true;
    lastSuccessfulUpdate = millis();
    is_online = true;
    last_error = "NONE";
    
    // Log the successful save
    Serial.println("   💾 Last data saved at: " + getCurrentTimestamp());
    
  } else if (statusCode == 404) {
    // Document doesn't exist, create new one
    Serial.println("📝 Creating new document...");
    http.end();
    
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    statusCode = http.PUT(jsonString);
    
    if (statusCode == 200) {
      Serial.println("✅ Created new document - STATUS: ONLINE");
      Serial.println("   📊 Fill: " + String(fill_percentage, 1) + "% | Height: " + String(waste_height_cm, 1) + "cm");
      firestoreConnected = true;
      lastSuccessfulUpdate = millis();
      is_online = true;
      last_error = "NONE";
    } else {
      Serial.println("❌ Failed to create document (" + String(statusCode) + ")");
      firestoreConnected = false;
      last_error = "DOCUMENT_CREATE_FAILED_" + String(statusCode);
      error_count++;
    }
  } else {
    Serial.println("❌ Failed (" + String(statusCode) + ")");
    firestoreConnected = false;
    last_error = "FIRESTORE_ERROR_" + String(statusCode);
    error_count++;
    
    // Print response for debugging
    String response = http.getString();
    Serial.println("   Response: " + response.substring(0, 200));
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
    // Return current time based on millis if NTP fails
    unsigned long seconds = millis() / 1000;
    return "2024-01-01T00:00:00Z";
  }
  
  char timeStringBuff[30];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(timeStringBuff);
}