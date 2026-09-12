# PramaanSetu — Border & Verification Screening Console Frontend

AI-Based Fake Identity & Document Screening System React frontend for border and verification officers.

## Tech Stack
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6 / v7
- **Server State / Polling**: TanStack Query (@tanstack/react-query)
- **Styling**: Tailwind CSS with enterprise neutral & risk token theme
- **Icons**: Lucide React
- **Charts**: Recharts
- **Internationalization (i18n)**: react-i18next + i18next (English / Hindi bilingual support)

## Design System Tokens
- **Background**: `#F7F7F5`
- **Surface**: `#FFFFFF`
- **Border**: `#E2E1DC`
- **Text Primary**: `#1F1E1B`
- **Text Secondary**: `#5F5E58`
- **Risk Low**: `#1F8A4C` (`#EAF6EE` bg)
- **Risk Medium**: `#B5790B` (`#FCF3E1` bg)
- **Risk High**: `#B23A3A` (`#FBEAEA` bg)
- **Radii**: 12px cards, 8px controls

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Default: VITE_API_BASE_URL=http://localhost:8000
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

### 5. Type-Check
```bash
npx tsc --noEmit
```

## Application Routes
- `/`: **Dashboard** — Volume trends, high-risk ratios, recent scans table.
- `/scan/new`: **New Scan** — 1-click document selector (Passport / Aadhaar / PAN), drag-and-drop dropzone, optional webcam capture modal, demo presets.
- `/scan/:scanId/processing`: **Processing** — Real-time 6-stage pipeline stepper with live polling until completion.
- `/scan/:scanId/result`: **Result Dossier** — Verdict-first risk badge, document authenticity checks, visually distinct identity risk section, bilingual audit report, collapsible evidence viewer, and officer disposition action bar.
- `/history`: **Scan History** — Search, document type / risk band filters, and CSV export.
