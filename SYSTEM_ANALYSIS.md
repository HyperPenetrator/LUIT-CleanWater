# LUIT Clean Water - End-to-End System Analysis
## Hackathon Pitch Slide Summary

---

## 1. USER REPORTING FLOW (Public → PHC → Lab → Public)

### **Two Submission Channels:**

#### **Channel A: Direct Web Reporting (Online)**
- User fills form: Problem + Source Type + PIN Code + Locality + District
- Data submitted via `POST /api/reporting/submit-report`
- Stored in Firestore with `status: 'reported'` and `active: true`

#### **Channel B: Offline SMS Reporting (Airplane Mode)**
- User generates SMS format from their report (2 options)
  - Compact: `WQ|781014|Health symptoms|Tube well|Description`
  - Full: Multi-line structured format
- Saves text offline (Notes app / clipboard)
- **When online:** Pastes SMS into "Submit SMS Report" section
- Parsed via `POST /api/reporting/sms/parse`
- Stored identically to online reports

### **Entry Point to System:**
Both channels create identical database records in `water_quality_reports` collection:
```
{
  pinCode, sourceType, problem, localityName, district,
  status: 'reported', active: true, upvotes: 0, verified: false
}
```

---

## 2. DATA FLOW: BACKEND PROCESSING

### **Stage 1: Report Aggregation (by PHC)**
```
Public Reports (Status: 'reported')
         ↓
PHC Dashboard fetches: GET /api/phc/active-reports/<district>
         ↓
Backend groups reports by PIN code
         ↓
Calculates severity:
  - 1-4 reports: No grouping (too few)
  - 5-9 reports: 'mild' severity
  - 10-19 reports: 'medium' severity
  - 20+ reports: 'severe' severity
         ↓
Shows "Send to Testing Lab" button (only if ≥5 reports)
```

### **Stage 2: Lab Assignment (PHC Submits)**
```
PHC clicks "Send to Testing Lab" button
         ↓
Captures PHC geolocation (latitude, longitude)
         ↓
POST /api/phc/send-to-lab with:
  - pinCode, reportIds[], severity, description
  - latitude, longitude (from geolocation)
         ↓
Backend updates ALL report statuses: 'contaminated'
         ↓
Creates lab_assignment document in Firestore
         ↓
Lab receives work queue
```

### **Stage 3: Lab Testing & Solution Upload**
```
Lab views assignments: GET /api/lab/assignments?district=X
         ↓
Lab performs water testing (real-world)
         ↓
POST /api/lab/upload-solution/<assignmentId> with:
  - Test results (PDF)
  - Solution description
         ↓
Updates assignment status: 'solution_uploaded'
```

### **Stage 4: PHC Cleaning & Verification**
```
PHC receives notification: Solution available
         ↓
PHC implements cleaning solution
         ↓
PHC confirms cleaning: POST /api/lab/confirm-clean/<assignmentId>
         ↓
Backend updates ALL report statuses: 'cleaned'
         ↓
Area removed from contamination list
```

### **Database Collections:**
- `water_quality_reports/` - Individual user reports
- `lab_assignments/` - Grouped submissions from PHCs to labs
- Status transitions: `reported` → `contaminated` → `cleaned`

---

## 3. RULE-BASED LOGIC & ALERT TRIGGERS

### **Severity Calculation Engine:**
```
Report Count by PIN Code
  ├─ 1-4 reports → Severity: 'none'
  ├─ 5-9 reports → Severity: 'mild'    [✓ Send to Lab enabled]
  ├─ 10-19 reports → Severity: 'medium'
  └─ 20+ reports → Severity: 'severe'  [CRITICAL]
```

### **Status-Based Logic:**
```
Report Status             Active?    Visible Where?
─────────────────────────────────────────────────────
'reported'               true       PHC Dashboard
'contaminated'           true       Landing page alerts
'cleaned'                false      Statistics only
                         
Trigger: status='contaminated' AND has (latitude, longitude)
  ↓
Mark in "Contaminated Areas" on landing page
```

### **Geographic Alert Logic (Haversine Formula):**
```
User's Location (GPS) + User's coordinates
         ↓
Fetch contaminated areas from /api/phc/contaminated-areas
         ↓
For each area: Calculate distance = Haversine(user, area)
         ↓
IF distance ≤ 2km
  ├─ Show RED warning: "⚠️ Contamination nearby"
  ├─ Show report details: PIN, severity, problems
  └─ Display "Please avoid using water"
         ↓
Auto-refresh: Every 30 seconds on landing page
Auto-refresh: Every 30 seconds on PHC dashboard (map layer)
```

### **Threshold-Based Enforcement:**
```
"Send to Lab" Button Rules:
  ├─ IF PIN reports < 5 → DISABLED (gray out)
  ├─ IF PIN already sent to lab → DISABLED ("Already sent")
  └─ IF PIN reports ≥ 5 AND not sent → ENABLED (blue button)
     
Validation:
  ├─ Form validation: All fields required
  ├─ SMS validation: Must parse correctly
  └─ Geolocation validation: Lat (-90 to 90), Lon (-180 to 180)
```

---

## 4. ALERT & GUIDANCE DELIVERY

### **Channel 1: Real-Time Landing Page Alerts**
```
Landing Page (/):
  ├─ Contaminated Areas Section (RED cards)
  │  ├─ Shows PIN code, severity, report count
  │  ├─ Updates every 30 seconds
  │  └─ Only shows areas ≤2km from user
  │
  ├─ Recent Reported Issues (yellow cards)
  │  ├─ Shows latest community reports
  │  └─ Clickable for details
  │
  └─ Status Popup on Load
     ├─ "Your Area Status: [CONTAMINATED/CLEAN]"
     ├─ Triggered by geolocation
     └─ If contaminated: Shows nearby issue cards
```

### **Channel 2: PHC Dashboard (Authority View)**
```
PHC Dashboard:
  ├─ Tab 1: Active Reports (Grouped by PIN)
  │  ├─ Shows report count, severity badge
  │  ├─ Lists all problems & sources
  │  └─ "Send to Testing Lab" button
  │
  ├─ Tab 2: Solutions (From Labs)
  │  ├─ Shows lab's solution PDFs
  │  └─ Guidance for cleaning
  │
  └─ Tab 3: Hotspot Map
     ├─ Interactive Leaflet map
     ├─ 🔴 RED markers = Contaminated areas
     ├─ 🟢 GREEN markers = Cleaned areas
     ├─ Auto-updates every 30 seconds
     └─ Click for details
```

### **Channel 3: Notifications (Not Yet Implemented)**
```
Potential:
  ├─ Browser notifications when new reports nearby
  ├─ Email summaries for PHC/Lab users
  └─ SMS alerts for critical contamination
```

---

## 5. ACTION & ALERT TRACKING

### **Tracking Mechanism:**

#### **A. Report-Level Tracking**
```
Each Report Document Stores:
  ├─ status: 'reported' | 'contaminated' | 'cleaned'
  ├─ active: true | false
  ├─ reportedAt: ISO timestamp
  ├─ upvotes: integer (community validation)
  └─ verified: boolean
```

#### **B. Lab Assignment Tracking**
```
Each Lab Assignment Document Stores:
  ├─ pinCode, reportIds[]
  ├─ status: 'pending_lab_visit' → 'solution_uploaded' → 'cleaned'
  ├─ latitude, longitude (for map alerts)
  ├─ severity: 'mild' | 'medium' | 'severe'
  ├─ description: PHC's notes
  ├─ createdAt: ISO timestamp
  └─ phcSubmittedAt: ISO timestamp
```

#### **C. Status Update Flow**
```
Timeline Visualization:

User Reports Issue
  ↓ (stored as 'reported')
PHC Groups Reports (≥5 threshold reached)
  ↓ 
PHC Sends to Lab (status → 'contaminated')
  ↓
Lab Uploads Solution (status stays 'contaminated')
  ↓
PHC Confirms Clean (status → 'cleaned')
  ↓
Report Removed from Active Alerts
  ↓
Stored in Statistics/History
```

### **Query Patterns for Tracking:**

#### **Active Contamination (Real-Time Dashboard):**
```javascript
WHERE status IN ('reported', 'contaminated')
  AND active == true
  AND district == userDistrict
```

#### **Map Alerts:**
```javascript
WHERE status == 'contaminated'
  AND latitude != null
  AND longitude != null
  AND distance(user_location, [latitude, longitude]) <= 2km
```

#### **Statistics:**
```javascript
COUNT WHERE status == 'reported' OR status == 'contaminated'
COUNT WHERE status == 'cleaned'
COUNT WHERE active == true
```

### **Audit Trail:**
```
Tracked Events:
  ├─ Report submitted: timestamp, source (web/SMS), user
  ├─ Status changed: old_status → new_status, timestamp
  ├─ Lab assignment created: coordinates captured, PHC location
  ├─ Solution uploaded: PDF stored, timestamp
  └─ Area marked clean: verification by PHC, timestamp

Queryable By:
  ├─ District
  ├─ PIN code
  ├─ Status
  ├─ Date range
  └─ Severity level
```

---

## 6. KEY IMPLEMENTATION HIGHLIGHTS

### ✅ **What's Working:**
- ✓ Dual-channel reporting (web + SMS)
- ✓ PIN-based report aggregation
- ✓ Severity calculation (5-report threshold)
- ✓ Geolocation-based contamination alerts (2km radius)
- ✓ Lab workflow (assign → test → solution → verify)
- ✓ Auto-refresh mechanisms (30-second intervals)
- ✓ Interactive hotspot map (Leaflet.js)
- ✓ Haversine distance calculation
- ✓ Role-based dashboards (Public, PHC, Lab)
- ✓ Firestore-backed persistence

### ⚠️ **Current Limitations:**
- Coordinates are optional (defaults to NULL if geolocation denied)
- No real-time push notifications (polling-based)
- SMS requires manual paste (no true SMS gateway yet)
- No user authentication for public reports
- Lab assignment visibility limited to registered users

### 🚀 **Architecture:**
```
Frontend (React/Vite)
    ↓ API calls (Axios)
Flask Backend (Blueprints)
    ↓ Firestore service
Firebase Firestore (Cloud Database)
    ↓ File Storage (optional PDFs)
Cloudinary / Cloud Storage
```

---

## 7. ONE-SLIDE SUMMARY FOR HACKATHON PITCH

**"LUIT Clean Water: Community-Powered Water Quality Monitoring"**

🎯 **The Problem:** Water contamination goes unreported; authorities lack real-time data

📱 **Our Solution:**
1. **Dual-Channel Reporting:** Web + Offline SMS (for rural connectivity)
2. **Smart Aggregation:** Groups 5+ reports by location → Auto-escalates to labs
3. **Real-Time Alerts:** Haversine-based geofencing (2km radius) on interactive maps
4. **Authority Workflow:** PHC sends → Lab tests → PHC verifies → Alerts cleared
5. **Persistent Tracking:** Status pipeline: reported → contaminated → cleaned

🔄 **Data Flow:** User Report → PHC Groups → Lab Assignment → Solution → Verification → Alert Update

📊 **Intelligence:**
- PIN-code severity calculation (5-20+ reports)
- Automatic coordinate capture for geographic filtering
- 30-second auto-refresh on alerts
- Status-based rule engine

🌍 **Impact:** Tested on Kamrup Metropolitan district data; scalable to all Assam

---

**Key Metrics:**
- Reports aggregated by PIN code
- Minimum 5 reports required for lab escalation
- Maximum 2km alert radius per location
- Real-time status tracking via Firestore
