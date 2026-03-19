contiun<div align="center">

# 🏛️ Barangay Management Information System
### BMIS — Barangay Damolog, Municipality of Sogod, Cebu

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Firebase-orange?style=for-the-badge&logo=firebase)](https://bmis-damolog.web.app)
[![API](https://img.shields.io/badge/API-Railway-blueviolet?style=for-the-badge&logo=railway)](https://bmis-damolog-production.up.railway.app)
[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

A full-stack digital governance platform built for Philippine barangay operations — covering residents, documents, blotters, health, emergency response, budget, and more.

</div>

---

## ✨ Features

### 👥 Resident Management
- Complete resident registry with demographics, household grouping, and sitio mapping
- Voter, senior citizen, PWD, and 4Ps tagging
- Household mapping with family tree visualization
- Duplicate detection and bulk management

### 📄 Document Issuance
- Issue **Barangay Clearance**, **Certificate of Residency**, **Certificate of Indigency**, **Business Clearance**, and **Blotter Certification**
- Auto-generated control numbers and QR codes for verification
- PDF print with official letterhead and dry seal notice
- Full version history — reissue with audit trail

### 🎫 Queue Management
- Kanban-style queue board (Pending → Processing → Released)
- Walk-in and online request types
- Smart release flow: issue document → auto-print PDF → collect payment in one seamless sequence
- Queue number lookup (`Q-MMDD-NNN`) for payment recovery if modal is accidentally closed
- Auto-refresh every 15 seconds

### 💰 Payment & Collection
- Official receipt (OR) generation with QR code
- Lookup by queue number — auto-fills payer, document type, and fee
- Automatically marks queue as Released after payment is collected
- Daily collection report (printable, landscape A4)
- Void receipts with reason tracking
- Summary cards: daily, monthly, and yearly totals by category

### 📋 Blotter Records
- Case management with complainant/respondent details
- Lupon hearing scheduling and resolution tracking
- Status workflow: Pending → Settled / Escalated
- Blotter certification document generation

### 🏥 Health Records
- Per-resident health profiles: blood type, allergies, chronic conditions
- Vaccination records with next-dose tracking
- BHW (Barangay Health Worker) management
- House visit logs with vitals recording
- Medicine distribution tracking

### 🚨 Emergency Management
- Evacuation center management with capacity tracking
- Evacuee check-in/check-out logs
- Relief distribution records
- Vulnerable resident mapping (seniors, PWD, minors, 4Ps)

### 💼 Budget & Projects
- Barangay project tracking with fund source and status
- Expense recording per project with receipt numbers
- Budget utilization summary

### 🌱 Livelihood Programs
- Skill tagging per resident (carpenter, farmer, driver, etc.)
- Livelihood program management with slot tracking
- Skilled resident directory

### 📅 Events & Tasks
- Barangay event calendar with type and status tracking
- Task assignment system with priority levels and due dates

### 📊 Analytics & Reports
- Monthly breakdown: documents issued, revenue, new residents, blotters
- Charts by document type, revenue category, and sitio population
- Year-over-year comparison

### 🗺️ Map View & Household Mapping
- Sitio-level population breakdown
- Household grouping with voter and vulnerability counts

### 👮 Officials Management
- Active officials registry with position and term tracking
- Used as signatories on issued documents

### 🔐 Admin & Access Control
- Role-based access (Admin, Staff, Viewer)
- Audit log for sensitive actions
- User management

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Backend | ASP.NET Core 10 (Minimal API + Controllers) |
| Database | SQLite (via Entity Framework Core 10) |
| Auth | Firebase Authentication |
| Frontend Hosting | Firebase Hosting |
| Backend Hosting | Railway |
| PDF Generation | Browser `window.print()` with custom HTML/CSS |
| QR Codes | Google Charts API |

---

## 🗂️ Project Structure

```
barangay-system/
├── barangay-web/          # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── pages/         # All page components
│   │   ├── components/    # Shared components (ResidentPicker, etc.)
│   │   ├── api.ts         # Fetch wrapper (get/post/patch/put/del)
│   │   ├── auth.tsx       # Firebase auth + role context
│   │   ├── types.ts       # All TypeScript interfaces
│   │   └── App.tsx        # Router + layout
│   ├── .env               # VITE_API_URL (Railway)
│   └── firebase.json      # Firebase hosting config
│
├── BarangayAPI/           # ASP.NET Core backend
│   ├── Controllers/       # REST API controllers
│   ├── Models/            # EF Core entity models
│   ├── Data/              # AppDbContext
│   ├── Program.cs         # App bootstrap + inline schema migrations
│   └── barangay.db        # SQLite database file
│
└── BarangayDesktop/       # WinForms desktop companion app
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js 20+](https://nodejs.org)
- [.NET 10 SDK](https://dotnet.microsoft.com/download)

### Run the Backend locally

```bash
cd barangay-system/BarangayAPI
dotnet run
# API runs on http://localhost:5000
```

The database is auto-created on first run. Schema migrations are applied automatically on startup — no `dotnet ef` commands needed.

### Run the Frontend locally

```bash
cd barangay-system/barangay-web
npm install
npm run dev
# App runs on http://localhost:5173
```

By default the frontend points to the Railway API. To use your local API instead, create `.env.local`:

```env
VITE_API_URL=http://localhost:5000
```

### Default Login

| Username | Password |
|---|---|
| `admin` | `admin123` |

---

## 🌐 Deployment

### Backend → Railway
Push to GitHub — Railway auto-deploys from the `BarangayAPI` directory. Schema migrations run on startup.

### Frontend → Firebase Hosting

```bash
cd barangay-system/barangay-web
npm run build
firebase deploy
```

---

## 📸 Screenshots

> Dashboard · Queue Management · Document Issuance · Payment Collection

*Coming soon*

---

## 📝 License

Built for **Barangay Damolog, Municipality of Sogod, Cebu, Philippines**.  
For local government use.

---

<div align="center">
  <sub>Built with ❤️ for better barangay governance</sub>
</div>
