# IOT GUIDE — ESP32 kit per tank/site (~KES 12–18k)

## Parts
- ESP32 DevKit V1, JSN-SR04T waterproof ultrasonic (tank %), YF-S201 flow sensor,
  analog TDS probe, turbidity probe, pH-4502C probe, 5V 2A supply / small solar + 18650.

## Wiring (typical)
- Ultrasonic TRIG→D5 ECHO→D18 (top of tank facing water, height H cm configured).
- Flow YF-S201 signal→D19 (pulse), VCC 5V.
- TDS→VP (A0 via divider), Turbidity→VN, pH→D34. Calibrate with known buffers.
- level% = (H - distance)/H*100. volume = level% * capacity.

## Arduino sketch (HTTP POST every 60s)
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
const char* WIFI_SSID="YOUR_WIFI"; const char* WIFI_PASS="...";
const char* API="https://YOUR-BACKEND.onrender.com/api/ingest/MS-XXXX";
void setup(){ WiFi.begin(WIFI_SSID,WIFI_PASS); }
void loop(){
  float level=68.5, flow=3.2, pressure=2.1, tds=310, turb=0.8, ph=7.2, temp=23.5;
  // ... read your sensors here ...
  HTTPClient http; http.begin(API);
  http.addHeader("Content-Type","application/json");
  String body = "{\"level_percent\":"+String(level)+",\"flow_lpm\":"+String(flow)
    +",\"pressure_bar\":"+String(pressure)+",\"tds_ppm\":"+String(tds)
    +",\"turbidity_ntu\":"+String(turb)+",\"ph\":"+String(ph)
    +",\"temp_c\":"+String(temp)+",\"battery\":96}";
  http.POST(body); http.end();
  delay(60000);
}
```
Get `DEVICE_KEY` from User dashboard → Devices (e.g. `MS-AB12CD34`).

## Without hardware
Backend auto-simulates a realistic day curve when readings are stale, so the
demo, charts, AI leak/purity and alerts all work out of the box.
