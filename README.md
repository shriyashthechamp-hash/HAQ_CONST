# HAQ — Benefits, Unlocked.

> **Welfare navigation platform for construction workers in Pune, Maharashtra.**  
> Translating complex state regulations under the Maharashtra Building and Other Construction Workers Welfare Board (**MAHABOCW**) into clear, dignified, and actionable steps.

---

## 1. Product Overview & Architecture

HAQ is a production-grade, full-stack mobile application built for construction workers in Pune. It guides workers through understanding their potential eligibility, preparing necessary legal and identity documentation (such as the **Form-V 90-day work certificate**), drafting formal request letters to contractors, chatting with a grounded AI assistant powered by Groq, and tracking their application journey with strict submission evidence gating.

### Core Principles
1. **Uncompromising Truth & Grounded Provenance**: Every condition, rule, and form citation is verified against official MAHABOCW sources (`mahabocw.in`).
2. **Deterministic Rules & AI Advisory Isolation**: The AI assistant (Groq) is strictly advisory. Deterministic backend logic and state machines govern eligibility calculations and journey milestones.
3. **No Secret Leakage**: The Groq API key is maintained exclusively server-side in `apps/api/.env` and never leaked to the client bundle, source code, or git history.
4. **Resilient Multilingual First**: Full, native support for **Marathi (मराठी)**, **Hindi (हिन्दी)**, and **English** with Devanagari typography support.

---

## 2. Monorepo Structure

```
Haq_Construct/
├── apps/
│   ├── mobile/                    # React Native (Expo SDK 52, Expo Router, TypeScript)
│   │   ├── app/
│   │   │   ├── _layout.tsx        # Root layout with AppProvider & dark status bar
│   │   │   ├── index.tsx          # Screen 1: Welcome to HAQ
│   │   │   ├── eligibility.tsx    # Screen 2: Potential Eligibility Questionnaire
│   │   │   ├── documents.tsx      # Screen 3: Smart Document Checklist (Centrepiece)
│   │   │   ├── assistant.tsx      # Screen 4: HAQ Benefits Assistant & Contractor Letter Draft
│   │   │   └── journey.tsx        # Screen 5: Application Journey & Official Handoff
│   │   ├── src/
│   │   │   ├── components/        # HeaderBar, BottomNav, SourceCitationCard
│   │   │   ├── context/           # AppContext with AsyncStorage language/session persistence
│   │   │   ├── i18n/              # Marathi, Hindi, English translation dictionaries
│   │   │   ├── services/          # Mobile ApiService with Android (10.0.2.2) / Web routing
│   │   │   └── theme/             # Design tokens (#070A0F, #FF6B2C, #1677FF, #10B981)
│   │   ├── app.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                       # Node.js, Express, Prisma ORM, Groq SDK, TypeScript
│       ├── prisma/
│       │   ├── schema.prisma      # PostgreSQL models (Sessions, Sources, Rules, Docs, Journey)
│       │   └── seed.ts            # Official MAHABOCW reviewed data seed script
│       ├── src/
│       │   ├── services/
│       │   │   ├── knowledgeService.ts    # Reviewed source retrieval & citations
│       │   │   ├── eligibilityService.ts  # Deterministic rule engine (Age 18-60, 90+ days)
│       │   │   ├── documentService.ts     # Checklist status updates & progress calculation
│       │   │   ├── journeyService.ts      # State transition machine & submission gating
│       │   │   └── groqAssistantService.ts# Groq inference, contractor letter generator & fallback
│       │   ├── app.ts             # Express app with rate limiting, Zod validation, error handling
│       │   ├── index.ts           # Server bootstrap
│       │   └── prisma.ts          # Prisma client singleton
│       ├── tests/
│       │   └── api.test.ts        # 13 automated integration & logic tests
│       ├── .env                   # Local server configuration (Gitignored)
│       ├── .env.example           # Template configuration
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                    # Shared TypeScript types, Zod schemas, contracts
│       ├── src/
│       │   ├── types.ts           # Domain models, Status enums, Citations
│       │   ├── schemas.ts         # Zod schemas for API validation
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   └── architecture.md            # System architecture and security decisions
├── .gitignore                     # Rigorous protection of .env and credentials
└── package.json                   # Root workspace orchestration
```

---

## 3. Five Connected Screens

| Screen | Route | Description |
|---|---|---|
| **Screen 1 — Welcome** | `/` | HAQ Wordmark, "Benefits, Unlocked" tagline, language switcher (मराठी, हिन्दी, English), geometric construction motif, and orange "Get Started" button. No forced sign-in. |
| **Screen 2 — Potential Eligibility** | `/eligibility` | 4-step guided questionnaire (Age 18–60, 90+ days construction work in past 12 months, Trade category, Maharashtra residency). Shows satisfied, unresolved, and failed checks with verified source citations. |
| **Screen 3 — Smart Document Checklist** | `/documents` | Visual centrepiece tracking 6 essential documents across 4 states (`AVAILABLE`, `NEEDS_VERIFICATION`, `ACTION_REQUIRED`, `MISSING`). Preparation progress bar, accepted alternatives, notes input, and Form-V download link. |
| **Screen 4 — HAQ Benefits Assistant** | `/assistant` | Live conversational assistant powered by Groq (`qwen/qwen3.8-27b`) with citations to verified sources. Features an interactive **Contractor Request Generator** to produce signed Form-V request letters with 1-tap copy. |
| **Screen 5 — Application Journey** | `/journey` | 5-stage vertical timeline (`ELIGIBILITY_GUIDANCE` → `DOCUMENT_PREPARATION` → `PORTAL_HANDOFF` → `SUBMITTED` → `OUTCOME_RECORDED`). Strictly gates submission until official receipt reference is entered. Official portal link to `mahabocw.in` and Pune Swargate office contacts. |

---

## 4. Local Setup & Configuration

### Prerequisites
- Node.js (v18+)
- PostgreSQL 14+ (Installed locally via Homebrew or Supabase)
- Groq API Key (Obtained from [https://console.groq.com/keys](https://console.groq.com/keys))

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Create or verify `apps/api/.env`:
```ini
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://shriyasdeshmukh@localhost:5432/haq_db?schema=public"
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b
```
*(Notice: Never place the Groq key in client code or commit `.env` to Git. `.gitignore` is pre-configured to strictly ignore it).*

### Step 3: Run Database Migrations and Seed Official Data
```bash
# Push schema to PostgreSQL database
npm run prisma:push --workspace=@haq/api

# Seed verified MAHABOCW sources, benefit rules, and document requirements
npm run prisma:seed --workspace=@haq/api
```

### Step 4: Run Automated Tests
```bash
npm test
```
All **13 integration tests** pass, verifying:
- Health and source retrieval
- Eligibility rule calculations (Satisfied, Ineligible, Incomplete)
- Document checklist state updates and progress percentages
- Strict journey stage transitions and submission evidence gating
- Live Groq assistant responses and Marathi contractor letter drafting

---

## 5. Running the Application

### Start the Backend API Server
```bash
npm run dev:api
# API will listen on http://localhost:4000
```

### Launch the Mobile Application
```bash
npm run dev:mobile
```
- Press `w` in terminal to launch in **Web browser** (great for desktop review and debugging).
- Press `a` in terminal to launch on **Android Emulator** or scan the QR code using the **Expo Go** mobile app on any physical device connected to your network.

---

## 6. Official Verified Knowledge Base Sources

1. **MAHABOCW Registration Portal**: [https://mahabocw.in/en/workers-registration/](https://mahabocw.in/en/workers-registration/)
2. **Official Downloads & Form-V**: [https://mahabocw.in/en/download/](https://mahabocw.in/en/download/)
3. **Pune District Executive Labour Office**:
   - Office of Deputy Labour Commissioner, PMT Building, 4th Floor, Swargate, Pune - 411042.
   - Helpline: **1800-889-2816** / **022-26573832**.
   - Email: `dy.lc.pune@mahabocw.in`.

---

## 7. Next Priority Roadmap

1. **Aadhaar OCR / Document Pre-Scanner**: Local on-device edge ML scanner to verify DOB on school leaving certificates or Aadhaar without uploading PII to cloud servers.
2. **Voice In / Voice Out (Web Audio / Expo AV)**: Direct Marathi & Hindi audio input and speech synthesis for construction workers with limited literacy.
3. **Authorized Kendra Locator**: Geolocation directory of approved Aaple Sarkar Seva Kendras and CSC desks across Pune, Pimpri-Chinchwad, and Haveli talukas.
