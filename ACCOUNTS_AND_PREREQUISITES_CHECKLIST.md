# Complete Accounts & Prerequisites Checklist
*(On-Demand In-Home Physiotherapy Platform: iOS, Android & Web)*

> **Purpose:** Step-by-step master list of every account, service, and prerequisite needed to build, test, and launch the platform.  
> **Status:** Planning Phase Reference

---

## Summary Overview

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               ACCOUNT REQUIREMENTS AT A GLANCE                         │
├───────────────────────────────────┬──────────────────┬──────────────┬──────────────────┤
│ Stage                             │ Accounts Needed  │ Upfront Cost │ Time to Setup    │
├───────────────────────────────────┼──────────────────┼──────────────┼──────────────────┤
│ 🛠️ **Stage 1: Development & Test** │ **6 Accounts**   │ **$0 (FREE)**│ **~20 Minutes**  │
│ 🚀 **Stage 2: Public Store Launch**│ **4 Accounts**   │ **~$134 Total**│ **When Ready to Launch**│
└───────────────────────────────────┴──────────────────┴──────────────┴──────────────────┘
```

---

## 🛠️ Stage 1: Free Accounts Needed for Development & Testing (Cost: $0)

You only need these **6 free accounts** to build, test, and run the entire system on your phones and computer.

### 1. GitHub Account (Source Code & Version Control)
* **Website:** [github.com](https://github.com)
* **Cost:** **100% Free**
* **Purpose:** Stores the codebase securely, tracks changes, and triggers automated deployments to web and mobile.

---

### 2. Expo Account (Mobile Cloud Builds & Testing)
* **Website:** [expo.dev](https://expo.dev)
* **Cost:** **100% Free Tier**
* **Purpose:**
  - Compiles iOS and Android mobile apps in the cloud for free without needing a Mac.
  - Allows you to test the mobile apps on your physical iPhone / Android device instantly via the **Expo Go** app.
  - Powers Over-The-Air (OTA) instant updates.

---

### 3. Supabase Account (Database, Backend & Auth)
* **Website:** [supabase.com](https://supabase.com)
* **Cost:** **100% Free Tier** (500 MB database, 50,000 monthly active users)
* **Purpose:**
  - Hosts the **PostgreSQL database with PostGIS** for real-time geospatial matching (calculating distance between therapist and patient).
  - Handles authentication (SSO & Email/Password).
  - Provides encrypted storage for medical scans and reports.

---

### 4. Vercel Account (Admin & Desk Boy Web Hosting)
* **Website:** [vercel.com](https://vercel.com)
* **Cost:** **100% Free Hobby Tier**
* **Purpose:**
  - 1-click deployment for the Admin & Desk Boy Web Dispatch Dashboard.
  - Automatically connects to your GitHub repository and updates the live web portal on every code push.
  - Provides free global CDN and automatic HTTPS/SSL certificates.

---

### 5. Google Cloud Console Account (Maps & Google Sign-In)
* **Website:** [console.cloud.google.com](https://console.cloud.google.com)
* **Cost:** **Free with $200 recurring monthly credit** (Google gives $200 free credit every single month, which easily covers ~28,000 map searches and address lookups).
* **Purpose:**
  - **Google Maps API:** Interactive address picker, autocomplete search, and geocoding.
  - **Distance Matrix API:** Real-time transit duration calculation for therapist travel buffers.
  - **Google Sign-In:** One-tap SSO login for patients.

---

### 6. Firebase Console Account (Push Notifications Gateway)
* **Website:** [firebase.google.com](https://firebase.google.com)
* **Cost:** **100% Free** (Unlimited push notifications)
* **Purpose:**
  - Powers **Firebase Cloud Messaging (FCM)** to send instant push notifications to Patient and Therapist mobile apps (e.g., *"Therapist on the way"*, *"New Booking Assigned"*).

---

## 🚀 Stage 2: Production Accounts Needed for Public Launch

*(You do NOT need these immediately to start development; you only set these up when ready to publish to the public App Store and accept real customer payments).*

### 7. Google Play Developer Account (Android App Store)
* **Website:** [play.google.com/console](https://play.google.com/console/signup)
* **Cost:** **$25 One-Time Lifetime Fee** (Payable to Google)
* **Purpose:** Required to publish the Patient and Therapist Android apps on the Google Play Store.

---

### 8. Apple Developer Program Account (iOS App Store)
* **Website:** [developer.apple.com/programs](https://developer.apple.com/programs/)
* **Cost:** **$99 / Year** (Payable to Apple)
* **Purpose:**
  - Required to publish iOS apps on the Apple App Store.
  - Enables **Apple Sign-In (SSO)** and Apple Push Notification service (APNs).
  - Allows inviting beta testers via **Apple TestFlight**.

---

### 9. Payment Gateway Account (Stripe / Razorpay)
* **Website:** [stripe.com](https://stripe.com) or [razorpay.com](https://razorpay.com)
* **Cost:** **Free to create** (Standard ~2% to 3% fee only when real customer transactions happen).
* **Purpose:**
  - Processes patient payments via Credit/Debit cards, Apple Pay, Google Pay, Net Banking, and UPI.
  - Handles automated commission payouts directly to therapists' bank accounts.

---

### 10. Custom Domain Name (For Web Portal & Brand)
* **Website:** [namecheap.com](https://namecheap.com), [cloudflare.com](https://cloudflare.com), or [godaddy.com](https://godaddy.com)
* **Cost:** **~$10 / Year** (e.g., `yourphysiobrand.com`)
* **Purpose:** Professional web address for your Admin & Desk Boy dispatch portal (e.g., `https://admin.yourphysiobrand.com`) and official API endpoints.

---

## 📋 Action Checklist to Get Started

| # | Account Name | URL | Immediate Action | Cost |
| :---: | :--- | :--- | :---: | :---: |
| 1 | **GitHub** | [github.com/signup](https://github.com/signup) | Create free account | **$0** |
| 2 | **Expo** | [expo.dev/signup](https://expo.dev/signup) | Create free account | **$0** |
| 3 | **Supabase** | [supabase.com](https://supabase.com) | Sign in with GitHub | **$0** |
| 4 | **Vercel** | [vercel.com/signup](https://vercel.com/signup) | Sign in with GitHub | **$0** |
| 5 | **Google Cloud** | [console.cloud.google.com](https://console.cloud.google.com) | Create project for Maps | **$0** |
| 6 | **Firebase** | [firebase.google.com](https://firebase.google.com) | Create project for Push | **$0** |
