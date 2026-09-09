# TherapyHub - In-Home Physiotherapy Booking Platform
> Complete cross-platform system featuring **Patient Mobile App (iOS & Android)**, **Therapist Mobile App (iOS & Android)**, and **Admin & Desk Boy Web Dispatch Portal**.

---

## Project Structure
- `apps/`
  - `mobile/`: React Native (Expo) app for **Patients** (SSO/Biometrics, Home Visit Requests, Live Tracking) & **Therapists** (Dispatch Queue, Navigation, Status Lifecycle, SOAP notes).
  - `web-admin/`: Vite React + Tailwind CSS Web Portal for **Desk Boys** & **Admins** (Phone request intake, triage queue, therapist assignment, automated fee calculation).
  - `backend/`: Node.js Express API server with PostGIS geospatial matching, payment state machine, and seed data.
- `packages/`
  - `shared/`: Shared TypeScript models, 7 Therapy categories, and pricing calculation logic.
- `*.md`: Architecture, failure resilience, and deployment blueprints.

---

## Quick Start Guide

### 1. Start the Backend API Server
```bash
npm run start:backend
# API running on http://localhost:4000
```

### 2. Start the Admin & Desk Boy Web Dispatch Dashboard
```bash
npm run start:web
# Web Portal running on http://localhost:3000
```

### 3. Start the Mobile Application (iOS & Android)
```bash
npm run start:mobile
# Scan QR code with Expo Go on your iPhone or Android!
```
