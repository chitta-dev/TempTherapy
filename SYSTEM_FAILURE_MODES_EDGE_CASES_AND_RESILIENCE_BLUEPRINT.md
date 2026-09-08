# Comprehensive Resilience Blueprint: Failure Modes, Edge Cases & Automated Recovery Strategies
*(On-Demand In-Home Physiotherapy Booking Platform)*

> **Purpose:** Identify every possible scenario in which the booking, dispatch, execution, payment, and infrastructure pipelines can fail—and specify the exact automated, technical, and operational fix for each.  
> **Status:** Planning & Architectural Resilience Design (No implementation until explicitly instructed)

---

## Table of Contents
1. [Executive Resilience Framework](#1-executive-resilience-framework)
2. [Category 1: Environmental, Weather & Real-World Transit Failures](#2-category-1-environmental-weather--real-world-transit-failures)
3. [Category 2: Therapist-Side Failures & Emergencies](#3-category-2-therapist-side-failures--emergencies)
4. [Category 3: Patient-Side Failures & No-Shows](#4-category-3-patient-side-failures--no-shows)
5. [Category 4: Scheduling, Concurrency & Dispatch Logic Failures](#5-category-4-scheduling-concurrency--dispatch-logic-failures)
6. [Category 5: Payment, Billing & Financial Discrepancies](#6-category-5-payment-billing--financial-discrepancies)
7. [Category 6: Technical Infrastructure, Server & Network Outages](#7-category-6-technical-infrastructure-server--network-outages)
8. [Category 7: Safety, Medical Emergencies & Red Flag Escalations](#8-category-7-safety-medical-emergencies--red-flag-escalations)
9. [Master Failure-to-Fix Summary Matrix](#9-master-failure-to-fix-summary-matrix)

---

## 1. Executive Resilience Framework

A reliable on-demand healthcare platform must survive real-world chaos. We classify recovery mechanisms into three operational rings:

```mermaid
graph TD
    subgraph Ring 1: Automated Self-Healing (System Level)
        A1[Database Locks & Optimistic Concurrency]
        A2[Offline Caching & Local SQLite Sync]
        A3[Automated Travel Buffer & Route Calculators]
    end

    subgraph Ring 2: Smart Assist & Re-dispatch (Operator Level)
        B1[One-Click Emergency Reassignment]
        B2[Broadcast SOS to Backup Standby Therapists]
        B3[Automated WhatsApp/SMS Fallback Gateways]
    end

    subgraph Ring 3: Customer Safeguards (User Level)
        C1[Grace Periods & 10-Minute Waiting Clocks]
        C2[Zero-Penalty Weather/Emergency Reschedule]
        C3[Cash Escrow & Verified Session OTPs]
    end
```

---

## 2. Category 1: Environmental, Weather & Real-World Transit Failures

### 1.1 Severe Weather, Heavy Rain, Floods, or Storms
* **The Failure:** Heavy rain, localized flooding, or extreme weather makes roads impassable. The therapist cannot travel to the patient's home safely.
* **System Fix & Recovery Strategy:**
  1. **Weather Warning Alert Flag:** Admin or Desk Boy can activate an *"Inclement Weather Zone"* on the dispatch map for specific pin codes.
  2. **Automated Reschedule Flow:** System automatically sends a push notification + WhatsApp to affected patients:  
     > *"Due to severe waterlogging in your zone, Dr. Alex is unable to travel safely. Tap here to pick a free rescheduled slot or switch to an instant virtual video consultation."*
  3. **Zero-Penalty Policy:** Automatically waives all cancellation/rescheduling fees. Package session credits remain 100% intact.

---

### 1.2 Unprecedented Traffic Jams & Transit Roadblocks
* **The Failure:** Therapist is stuck in a sudden traffic jam or detour; ETA increases significantly, causing them to arrive 30+ minutes late.
* **System Fix & Recovery Strategy:**
  1. **Dynamic ETA Monitoring:** The therapist app sends GPS pings every 60 seconds while status is `EN_ROUTE`. The backend checks Google Maps / Mapbox Distance Matrix API.
  2. **Automated Delay Trigger:** If current time + remaining transit time exceeds `scheduled_start + 15 mins`:
     - System automatically fires a proactive SMS/Push to patient: *"Dr. Alex is delayed by traffic. New estimated arrival: 10:25 AM. We apologize for the delay."*
     - Gives patient a one-tap option: **"I can wait"** OR **"Reschedule to later today"**.
  3. **Downstream Buffer Protection:** Automatically shifts subsequent appointments on the therapist's calendar or alerts the Desk Boy to reassign the therapist's next patient to a backup therapist.

---

## 3. Category 2: Therapist-Side Failures & Emergencies

### 2.1 Sudden Therapist Sickness or Emergency Leave on the Day of Visit
* **The Failure:** Therapist wakes up sick or suffers a personal emergency with 5 assigned home visits scheduled for the day.
* **System Fix & Recovery Strategy:**
  1. **One-Tap Therapist Emergency Toggle:** Therapist taps *"Emergency Leave / Sick Day"* in their app.
  2. **Desk Boy Red Alert & Batch Reassign Engine:**
     - The dispatch portal immediately flags all affected visits as `URGENT_REASSIGN_NEEDED`.
     - The system auto-ranks available replacement therapists in the same geographic cluster with matching clinical qualifications.
     - Desk Boy clicks **"One-Click Auto-Reassign"** or broadcasts an *"Urgent Open Shift"* notification to off-duty therapists offering an extra surge bonus.
  3. **Patient Notification:** Patient receives an updated notification with the new therapist's profile, or a prompt to confirm if the revised time works for them.

---

### 2.2 Vehicle Breakdown or Accident En Route
* **The Failure:** Therapist's vehicle breaks down mid-transit to a patient's house.
* **System Fix & Recovery Strategy:**
  1. **In-App SOS / Breakdown Button:** Therapist taps *"Transit Breakdown"* in their app.
  2. **Instant Dispatch Escalation:**
     - Status updates instantly to `TRANSIT_HALTED`.
     - Desk Boy is alerted with an audible alarm and the therapist's exact breakdown GPS coordinates.
  3. **Alternative Transport / Re-dispatch:**
     - Desk Boy can either order a fast Uber/Cab for the therapist via company reimbursement or reassign the visit to the nearest standby therapist.
     - Patient receives a direct call from the Desk Boy within 3 minutes explaining the situation.

---

### 2.3 Previous Appointment Running Over Time
* **The Failure:** A complex neurological patient requires 15 minutes of extra care, causing the therapist to run late for the next scheduled home visit.
* **System Fix & Recovery Strategy:**
  1. **Session Extension Warning:** At minute 40 of a 45-minute session, the therapist app displays a prompt: *"Session finishing on time?"* with options: `Yes` or `Extend +15 Mins`.
  2. **Automated Impact Check:** If extended, the backend checks the travel buffer to the next patient.
  3. **Smart Notification:** If the buffer is breached, the next patient is automatically notified of a 15-minute delay before they even wonder where the therapist is.

---

## 4. Category 3: Patient-Side Failures & No-Shows

### 3.1 Patient Unreachable / Door Locked / No Response upon Arrival
* **The Failure:** Therapist reaches the patient's house, rings the doorbell, and calls the patient's phone, but gets no response.
* **System Fix & Recovery Strategy:**
  1. **Verified Arrival Check-In:** Therapist taps *"Arrived at Location"* (app validates GPS location is within 100 meters of patient address).
  2. **Automated 10-Minute Grace Countdown Clock:**
     - App starts a 10-minute countdown timer.
     - System automatically triggers:
       - 📞 Automated voice call to patient phone.
       - 💬 High-priority WhatsApp message & push notification: *"Your physiotherapist has arrived at your door."*
       - 🖥️ Desk Boy portal alert to attempt reaching emergency contact.
  3. **No-Show Resolution:**
     - If no response after 10 minutes, the therapist is allowed to tap **"Mark as Patient No-Show"** with a required photo of the door/building.
     - A partial base fee / travel fee is charged to compensate the therapist for travel time.

---

### 3.2 Incorrect Address / Inaccurate GPS Pin / Gate Security Refusal
* **The Failure:** Patient pinned a location 2 km away from their actual house, or gate security refuses entry to the therapist.
* **System Fix & Recovery Strategy:**
  1. **Direct Masked In-App Calling:** Therapist and Patient can call each other through virtual number masking (Twilio / Exotel) without revealing private personal numbers.
  2. **One-Tap Location Share:** Patient can tap *"Send Corrected Live Location"* in their app, which instantly updates the therapist's turn-by-turn navigation.
  3. **Digital Entry Pass:** Patient app generates a temporary visitor entry pass / gate security code during booking.

---

### 3.3 Patient Sudden Medical Emergency / Hospitalization
* **The Failure:** Patient's condition worsens drastically, or they are admitted to the hospital, requiring urgent cancellation of multi-week sessions.
* **System Fix & Recovery Strategy:**
  1. **Medical Exemption Cancellation:** Patient or Desk Boy flags the cancellation reason as `MEDICAL_EMERGENCY`.
  2. **100% Refund / Package Freeze:**
     - Immediate refund of individual session fee or complete freeze on package expiration date without penalty.
     - Assigned therapist is immediately released back to the available pool for other patients.

---

## 5. Category 4: Scheduling, Concurrency & Dispatch Logic Failures

### 5.1 Concurrency Race Condition (Double-Booking Same Therapist)
* **The Failure:** Two Desk Boys attempt to assign the same therapist to two different patients for the same time slot at the exact same second.
* **System Fix & Recovery Strategy:**
  1. **Database Row-Level Locking (Pessimistic Locking):**
     ```sql
     -- Atomic slot reservation transaction in PostgreSQL
     BEGIN;
     SELECT id FROM therapists WHERE id = $1 AND is_available = true FOR UPDATE;
     -- Check overlap with existing appointments
     IF NOT EXISTS (
         SELECT 1 FROM appointments 
         WHERE therapist_id = $1 
           AND status NOT IN ('CANCELLED', 'REJECTED')
           AND tstzrange(scheduled_start, scheduled_end) && tstzrange($new_start, $new_end)
     ) THEN
         INSERT INTO appointments (...) VALUES (...);
         COMMIT;
     ELSE
         ROLLBACK; -- Second desk boy receives instant error: "Therapist was just booked"
     END IF;
     ```
  2. **UI Feedback:** Second Desk Boy sees an immediate toast notification: *"Therapist was just assigned by another coordinator. Showing next best available match."*

---

### 5.2 Impossible Route Assignment (Zone Infeasibility)
* **The Failure:** A Desk Boy accidentally assigns a therapist to a patient 25 km away with only a 15-minute gap between visits.
* **System Fix & Recovery Strategy:**
  1. **Hard Travel Buffer Validation Rules:** The backend validates transit feasibility before allowing assignment approval:
     $$\text{Gap Between Slots} \ge \text{Google Maps Travel Duration} + 15\text{ mins buffer}$$
  2. **Validation Block:** If the gap is insufficient, the system disables the "Approve" button and displays a red warning: *"Insufficient travel time (Requires 38 mins transit, gap is only 15 mins). Suggest 11:30 AM instead."*

---

### 5.3 Surge Demand (Zero Therapists Available in Zone)
* **The Failure:** 20 patients request visits in a specific neighborhood, but only 3 therapists are active in that zone.
* **System Fix & Recovery Strategy:**
  1. **Waitlist & Radius Expansion:**
     - Request is queued with a `WAITLISTED` status.
     - System automatically expands the search radius by +5 km offering extended travel compensation to therapists in neighboring zones.
  2. **Desk Boy Concierge Prompt:** Desk Boy can call the patient to offer alternative time slots later in the day or next day with a 10% priority discount.

---

## 6. Category 5: Payment, Billing & Financial Discrepancies

### 6.1 Payment Gateway Timeout / Webhook Dropped
* **The Failure:** Patient enters card details, money is deducted from their bank account, but the payment gateway webhook drops, leaving the booking status as `PENDING`.
* **System Fix & Recovery Strategy:**
  1. **Idempotent Webhook Processing + Polling Fallback:**
     - All payment transactions use unique idempotency keys (`booking_req_uuid`).
     - A background cron worker polls the payment gateway API (Stripe / Razorpay) every 2 minutes for any `PENDING` transactions older than 3 minutes.
  2. **Auto-Reconciliation:** Once the payment gateway confirms receipt, status transitions to `CONFIRMED` without user intervention.

---

### 6.2 Patient Refuses to Pay After In-Home Session Completion
* **The Failure:** Patient chose "Post-Session Digital Pay", but after the therapist finishes 60 minutes of treatment, the patient refuses to pay or their card fails.
* **System Fix & Recovery Strategy:**
  1. **Guaranteed Therapist Compensation:** The platform pays the therapist their full agreed commission regardless of patient default (platform absorbs first-line risk).
  2. **Account Lock & Auto-Invoicing:**
     - Patient account is temporarily locked; cannot request any future visits.
     - Automated SMS/WhatsApp invoice link with payment reminders sent every 24 hours.
     - Desk Boy is notified to follow up via phone.

---

### 6.3 Disputed Cash-on-Service (COS) Collection
* **The Failure:** Patient claims they gave cash to the therapist; therapist claims the patient didn't pay.
* **System Fix & Recovery Strategy:**
  1. **Digital Cash Handshake (OTP Confirmation):**
     - When therapist selects "Cash Collected", the patient's phone displays a 4-digit **Cash Collection Confirmation Code**.
     - Therapist must enter this code into their app to finalize the cash transaction.
     - Eliminates disputes over whether cash was handed over.

---

## 7. Category 6: Technical Infrastructure, Server & Network Outages

### 7.1 Complete Loss of Mobile Internet at Patient's Residence
* **The Failure:** Therapist enters a basement apartment or rural residence with 0 mobile network bars. Cannot tap "Complete Session" or log treatment notes.
* **System Fix & Recovery Strategy:**
  1. **Offline-First Mobile Architecture (SQLite / Hive Local Store):**
     - Therapist app stores the entire day's visit manifest, patient address, and medical intake notes locally on the device.
     - Therapist can record treatment notes, pain scores, and mark "Session Completed" while completely offline.
  2. **Background Sync:** The app queues the completed payload and automatically syncs with the server the moment network connectivity is restored.

---

### 7.2 Central Server / Database Outage
* **The Failure:** The cloud backend experiences an unexpected 15-minute downtime during active hours.
* **System Fix & Recovery Strategy:**
  1. **Redundant Standby Database (Multi-AZ Failover):**
     - Managed PostgreSQL with automated multi-zone failover (switching to replica in < 30 seconds).
  2. **Read-Only Disaster Cache:** Mobile apps cache active appointment details so patients and therapists can still see current scheduled bookings and direct phone numbers even if central APIs are temporarily restarting.

---

### 7.3 Push Notification Delivery Delay (FCM / APNs Failure)
* **The Failure:** Apple APNs or Google FCM delays a critical dispatch push notification by 20 minutes.
* **System Fix & Recovery Strategy:**
  1. **Multi-Channel Fallback Gateway:**
     - If an urgent dispatch or status update is not acknowledged by the app within **90 seconds**, the backend automatically triggers an **SMS / WhatsApp fallback** via Twilio / Gupshup / Infobip.
     - Ensures 99.99% message delivery reliability.

---

## 8. Category 7: Safety, Medical Emergencies & Red Flag Escalations

### 8.1 Safety Concern, Harassment, or Unsafe Environment
* **The Failure:** A female therapist arrives at a residence and feels unsafe or faces inappropriate behavior.
* **System Fix & Recovery Strategy:**
  1. **One-Tap Disagree & Exit Protocol (In-App Panic Button):**
     - Prominently placed **Emergency SOS button** in the therapist app.
     - Tapping immediately:
       - Sends live GPS coordinates and an urgent alarm to the Desk Boy & Admin security dashboard.
       - Silently alerts the nearest emergency response team / supervisor.
  2. **Immediate Abort Rights:** Therapist has full authority to immediately terminate the session and leave premises without penalty.
  3. **Permanent Blacklisting:** Offending user account and phone number are permanently banned across all services.

---

### 8.2 Patient Experiences Acute Medical Crisis During Session
* **The Failure:** Patient suffers sudden severe dizziness, chest pain, stroke symptoms, or acute muscle tear during physical therapy exercises.
* **System Fix & Recovery Strategy:**
  1. **Emergency Medical Protocol in Therapist App:**
     - Instant red-button **"Call Emergency Ambulance (911 / 112 / 108)"** directly from the app.
     - Displays the patient's verified emergency contact and medical conditions on screen.
  2. **Mandatory Clinical Incident Report:** App prompts the therapist to log a structured medical incident report for clinical auditing and insurance documentation.

---

## 9. Master Failure-to-Fix Summary Matrix

| Failure Scenario | Primary Impact | Root Cause | Automated Technical Fix | Operational Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Heavy Rain / Floods** | Therapist cannot travel | Road impassable | Weather-zone toggle in admin; auto-prompts free reschedule / video PT | Waive all cancellation fees |
| **Sudden Traffic Jam** | Late arrival | Traffic congestion | Continuous GPS tracking; auto-calculates new ETA & warns patient if >15m late | Patient can wait or pick new slot |
| **Therapist Sick / Emergency** | 5 visits at risk | Health / personal | One-tap sick toggle; auto-flags visits as `URGENT_REASSIGN_NEEDED` | Desk Boy auto-reassigns to standby PTs |
| **Vehicle Breakdown** | Stranded en route | Mechanical failure | In-app "Transit Breakdown" SOS with live coordinates | Company orders fast Uber or reassigns |
| **Patient No-Show** | Wasted PT trip | Patient not home | GPS check-in at door + 10-min countdown + automated IVR call/WhatsApp | Charge base travel fee after photo proof |
| **Wrong Address Pin** | Lost therapist | User map error | Masked in-app calling + one-tap live location share by patient | Desk Boy assists over phone |
| **Double-Booking PT** | Overlapping slots | Race condition | PostgreSQL row-level pessimistic locking (`FOR UPDATE`) | Prevent second booking at DB level |
| **Impossible Buffer** | Unrealistic transit | Coordinator error | Backend route feasibility check ($Gap \ge TravelTime + 15m$) | Block assignment with red warning |
| **Payment Timeout** | Money deducted, no slot | Webhook dropped | Idempotent transaction keys + auto-polling cron worker | Auto-confirms upon gateway sync |
| **Patient Refusal to Pay** | Financial loss | Bad actor | App locks patient account; platform pays therapist commission | Automated daily invoices & recovery |
| **COS Cash Dispute** | Disputed handoff | Word vs. word | 4-digit Cash OTP shown on patient app, entered by therapist | Eliminates cash disputes |
| **No Internet in House** | Cannot complete visit | Dead zone | Offline-first SQLite local caching; auto-syncs when online | Zero data loss |
| **Server Downtime** | App unreachable | Cloud outage | Multi-AZ database failover + local read-only cache on mobile | <30s recovery |
| **Push Notification Lag** | Missed dispatch | APNs/FCM delay | 90-second unacknowledged timeout triggers SMS/WhatsApp fallback | Guaranteed delivery |
| **Safety / Harassment** | Physical threat | Inappropriate patient | In-app Panic SOS button with live GPS alert to admin & police | Therapist aborts, patient blacklisted |

---

> [!IMPORTANT]
> **Planning Confirmation:**  
> This blueprint guarantees that the physiotherapy booking platform is bulletproof against physical, operational, algorithmic, financial, and infrastructure failures.  
> We remain in the **Planning Phase**. Implementation will begin only upon your next instruction.
