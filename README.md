# DiaVita: Smart Diabetes Lifestyle Companion

**Semester 5 Project: Diabetes Lifestyle Management App (BIP ID 2026MIN524)**
Bannari Amman Institute of Technology · Academic Year 2026–2027
Team: **Akash R (7376242AD114)**, **Anupraghavan R (7376242AD120)** · Guide: **Prof. Gunavardini V**

DiaVita is a responsive web app (works on phones and laptops) that helps people with diabetes manage
glucose, food, activity and medicines in one place. It turns the logged data into a daily **DiaVita Score**,
**estimated HbA1c**, **Time-in-Range** and personalised tips.

## What makes it innovative

Most diabetes apps only **store** readings. DiaVita **learns** how each user's own body responds.

1. **Food Fingerprint** (`/dashboard/fingerprint`): every meal is paired with the reading just before it and
   the highest reading 45–180 min after it. Each food gets a personal factor = actual rise ÷ rise predicted
   from its GI. A factor above 1 means the food spikes *this* user more than its GI suggests. This is based on
   Zeevi et al., *Cell* 2015, which showed that people respond very differently to the same food.
2. **Spike Predictor** (on Smart Plate): a least-squares model fits personal sensitivity
   *k* (mg/dL rise per unit of glycemic load) from meals without a walk:
   `predicted peak = baseline + k × Σ(item GL × personal food factor) × (1 − walk reduction)`.
   The walk effect is measured from the user's own data by comparing *k* with and without a post-meal walk.
3. **Talking assistant in Tamil, English and Hindi** (mic button on every screen): the patient talks as
   they normally would, including mixed Tanglish / Hinglish, e.g. "இப்ப குளுக்கோஸ் செக் பண்ணேன், அத ஆட் பண்ணு".
   The assistant asks what it still needs ("சுகர் எவ்வளவு வந்துச்சு?", "சாப்பிடுறதுக்கு முன்னாடியா, பின்னாடியா?"),
   confirms, saves, and replies aloud with advice. It handles sugar readings, meals (with a spike prediction),
   tablets, walks, "how is my sugar?" and "what can I eat?", understands Tamil number words ("நூத்தி நாப்பது" = 140),
   and offers big tap-to-answer buttons. The logic is in `frontend/lib/assistant.js`; it uses the browser
   Web Speech API (Chrome / Edge; Tamil voice on Android, romanised Tamil read aloud where no Tamil voice exists).
4. **Live sync:** every open screen of a patient (phone, laptop, a family member's device) updates the moment
   any data changes, using Server-Sent Events (`GET /api/live`).

**Demo data:** Profile → "Load 14-day demo data" (or the banner on an empty dashboard) creates a simulated
patient with built-in food sensitivities and a walk effect. On that data the model recovers the walk effect
(27% learned vs 28% simulated) and flags all 6 foods that have a strong personal effect.

## Features

| Module | What it does |
|---|---|
| Auth & Profile | Register / login (JWT + bcrypt), BMI with Asian cut-offs, personal glucose targets |
| Glucose Log | Fasting / pre-meal / post-meal / bedtime readings, instant hypo & hyper alerts (15-15 rule), daily range chart, time in range, averages by time of check, day-by-day history with the meal each after-meal reading followed, CSV export |
| Smart Plate | Indian food library with Glycemic Index. Live carbs, calories, Glycemic Load and low-GI swap tips |
| Activity | Walking, yoga, cycling and more. MET-based calories and a weekly 150-minute goal chart |
| Medications | Tablet / insulin schedule with a daily "taken" checklist |
| IDRS Risk Check | Indian Diabetes Risk Score (MDRF), 4 questions, low / moderate / high risk |
| Insights | DiaVita Score (0–100), eA1c = (avg + 46.7) / 28.7, Time-in-Range, rule-based tips |
| Doctor Report | 7 / 14 / 30-day printable summary (Print → Save as PDF) |

## Tech stack

- **Frontend:** Next.js 15 (App Router, React 19), Tailwind CSS 4, Recharts, lucide-react
- **Backend:** Node.js + Express 5 REST API, JWT, bcryptjs, helmet
- **Database:** Neon serverless PostgreSQL (8 tables, accessed with `pg`)

```
Browser (Next.js, port 3000)  ──REST/JSON──▶  Express API (port 5000)  ──SQL/SSL──▶  Neon PostgreSQL
```

## Folder structure

```
backend/
  src/server.js            Express app + routes
  src/db.js                Neon connection pool
  src/migrate.js           Creates tables + seeds the food library
  src/sql/schema.sql       Database schema
  src/routes/              auth, glucose, meals, activities, medications, risk, insights
frontend/
  app/                     Next.js pages (landing, login, register, dashboard/*, dashboard/help)
  components/              Logo, UI kit, charts, voice entry, photos
  lib/api.js               API client + helpers
  lib/help.js              Help page content
  public/brand/            DiaVita logo
DiaVita_Second_Review.pptx Second review presentation
```

The design uses the "Charming seaside" palette (`#B3EBF2`, `#85D1DB`, `#B6F2D1`, `#C9FDF2`), defined in
`frontend/app/globals.css`. Photos in `frontend/public/photos/` are third-party images kept out of this
repository; without them the app shows soft palette tiles in their place.

## Quick start on this laptop

Double-click **`START-DIAVITA.bat`**. It opens the API and website windows and then the browser.
All data is stored in the **Neon** cloud database (project `diavita`, region Singapore), so the laptop
needs an internet connection. `http://localhost:5000/api/health` shows `"provider": "Neon PostgreSQL (ap-southeast-1)"`.

### Demo patients
`npm run db:seed` (in `backend`) creates six dummy patients, each with 14 days of glucose readings, meals,
walks and medicines. Every patient reacts to food differently, so each Food Fingerprint is different.
All of them use the password `demo1234`, and the login page lists them.

| Patient | Email | Diabetes type |
|---|---|---|
| Ravi Kumar | `demo@diavita.app` | Type 2 |
| Lakshmi Narayanan | `lakshmi@diavita.app` | Type 2 |
| Arjun Mehta | `arjun@diavita.app` | Type 1 (insulin) |
| Fathima Begum | `fathima@diavita.app` | Pre-diabetes |
| Suresh Babu | `suresh@diavita.app` | Type 2 |
| Priya Sharma | `priya@diavita.app` | Gestational |

## Setup with Neon (about 5 minutes)

### 1. Create the Neon database
Either use the Neon CLI:
```bash
npx neonctl auth
npx neonctl projects create --name diavita --region-id aws-ap-southeast-1 --database diavita
npx neonctl connection-string --database-name diavita --pooled
```
or sign in at https://console.neon.tech, create a project named `diavita`, click **Connect** and copy the
Node.js connection string. Use `sslmode=verify-full` in the URL.

### 2. Backend
```bash
cd backend
cp .env.example .env        # then paste your Neon URL into DATABASE_URL
npm install
npm run db:migrate          # creates all tables + 31 foods
npm run db:seed             # six demo patients with 14 days of data
npm run dev                 # API on http://localhost:5000
```
Check it at http://localhost:5000/api/health. It should say `"database":"connected"`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                 # app on http://localhost:3000
```
`frontend/.env.local` holds `NEXT_PUBLIC_API_URL=http://localhost:5000/api`.

**Try it on your phone:** connect the phone to the same Wi-Fi, open `http://<laptop-IP>:3000`, then set
`NEXT_PUBLIC_API_URL=http://<laptop-IP>:5000/api` and `CORS_ORIGIN=http://<laptop-IP>:3000`.

### Deploy (free tiers)
- **API → Render:** root `backend`, build `npm install`, start `npm start`. Add the env vars from `.env`.
- **Frontend → Vercel:** root `frontend`. Set `NEXT_PUBLIC_API_URL` to the Render URL + `/api`.
  Then set `CORS_ORIGIN` on Render to the Vercel URL.

## API reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Create account / log in → JWT |
| GET / PUT | `/api/auth/me`, `/api/auth/profile` | Current user / update profile & targets |
| GET / POST / DELETE | `/api/glucose` | Readings (`?days=30`), POST returns a safety `alert` |
| GET | `/api/meals/foods?q=` | Food library with GI |
| GET / POST / DELETE | `/api/meals` | Meals with carbs, calories, GL + `swap` suggestion |
| GET / POST / DELETE | `/api/activities` | Activities with MET calorie estimate |
| GET / POST / DELETE | `/api/medications`, POST `/:id/toggle` | Schedule + mark taken today |
| GET / POST | `/api/risk` | IDRS assessments |
| GET | `/api/insights/summary`, `/api/insights/report?days=7` | Score, eA1c, TIR, tips, daily report |
| GET | `/api/smart/food-response` | Food Fingerprint: personal model, walk effect, food ranking, meal pairs |
| GET | `/api/smart/spike-model` | Inputs for the Spike Predictor (k, baseline, walk effect, food factors) |
| POST | `/api/demo/seed` | Replace the user's logs with 14 days of demo data |

All endpoints except auth need the header `Authorization: Bearer <token>`.

## Database tables
`users`, `glucose_readings`, `foods`, `meals` (items stored as JSONB), `activities`, `medications`,
`medication_logs` (one row per dose per day), `risk_assessments`.

## Key formulas (for the viva)
- **Glycemic Load** = GI × carbs (g) / 100. Per meal: ≤ 10 low, 11–19 medium, ≥ 20 high.
- **eA1c** (ADAG study, Nathan 2008) = (average glucose mg/dL + 46.7) / 28.7.
- **Time in Range** = % of readings within 70–180 mg/dL (target ≥ 70%, International Consensus 2019).
- **IDRS** = age (0/20/30) + waist (0/10/20) + activity (0/10/20/30) + family history (0/10/20).
  Below 30 is low risk, 30–50 moderate, 60 or more high.
- **DiaVita Score** = glucose control 40 + activity 25 + diet 20 + medication 15.

> DiaVita gives lifestyle guidance only and does not replace medical advice.
