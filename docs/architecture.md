# HAQ — Architecture & Design Decisions

## 1. System Overview
**HAQ — Benefits, Unlocked** is an accessible, privacy-respecting mobile application and backend service designed for construction workers in Pune, Maharashtra. It translates complex state welfare requirements into actionable steps for the Maharashtra Building and Other Construction Workers Welfare Board (**MAHABOCW**).

## 2. Core Architectural Principles
1. **Uncompromising Truth & Grounded Provenance**:
   - Every requirement, form, and condition maps directly to reviewed MAHABOCW sources (`mahabocw.in`).
   - Preliminary eligibility guidance is explicitly separated from official government approval.
2. **AI Advisory Isolation**:
   - The AI assistant (powered by Groq Llama/Qwen models) operates strictly through the backend.
   - AI responses are advisory only. Deterministic business logic in the backend engine controls eligibility calculations, document state transitions, and journey steps.
   - The Groq API key is strictly maintained server-side in `apps/api/.env` and never leaked to mobile clients or version control.
3. **Resilience & Offline/Degraded Capability**:
   - If the Groq API key is absent or Groq is unreachable, the assistant cleanly falls back to deterministic, reviewed guidance with a transparent badge.
   - Offline-capable state persistence through AsyncStorage on mobile and session persistence in PostgreSQL.
4. **Accessible Multilingual First**:
   - Native support for Marathi (मराठी), Hindi (हिन्दी), and English.
   - Curated human-verified dictionaries for safety-critical instructions, legal-adjacent disclaimers, and Devanagari typography.

## 3. Monorepo Structure
```
haq/
├── apps/
│   ├── mobile/         # React Native (Expo SDK 52+, Expo Router, TypeScript)
│   └── api/            # Node.js, Express, Prisma ORM, Groq SDK, TypeScript
├── packages/
│   └── shared/         # Shared TypeScript interfaces, schemas, rule definitions
├── docs/
│   └── architecture.md # Architectural decisions and system diagrams
├── .gitignore          # Rigorous ignores (.env, node_modules, build artifacts)
├── package.json        # NPM Workspaces monorepo definition
└── README.md           # Setup, test, and run instructions
```

## 4. Database & Persistence Layer (Prisma + PostgreSQL)
- **Session**: Anonymous yet tamper-evident session token supporting language preferences and progress recovery.
- **KnowledgeSource**: Reviewed official sources with URL, version date, official excerpt, and verified status.
- **BenefitRule**: Versioned rule checks (age 18-60, 90+ days work in last 12 months, valid construction category).
- **DocumentRequirement**: Official form links (Form-V, Contractor 90-Day Certificate, Gramsevak Certificate, etc.).
- **DocumentChecklistItem**: Individual worker document preparation states (`AVAILABLE`, `NEEDS_VERIFICATION`, `MISSING`, `ACTION_REQUIRED`) with user notes.
- **EligibilityAssessment**: Evaluated responses, satisfied checks, and unresolved items.
- **JourneyEvent**: Append-only log of milestone transitions, requiring explicit evidence before allowing `SUBMITTED` or `OUTCOME_RECORDED`.
- **ConversationMessage**: Conversation history with source citations.

## 5. Security & Privacy Guardrails
- Zero storage of biometric identifiers, Aadhaar numbers, or sensitive financial documents.
- Sanitized input and bounded prompt contexts to eliminate prompt injection risks.
- Backend rate limiting on `/api/assistant/*` and `/api/voice/*` endpoints.
- Redacted logging (no sensitive PII or credentials in server logs).
- Consent-based worker profile storage isolated per session.

---

## 6. HAQ 2.0 — Voice-First AI Agent Architecture

HAQ 2.0 upgrades the system from a passive chatbot into an intelligent, voice-first, semi-autonomous welfare benefits agent:

```
[ Worker Mobile App (React Native + Expo) ]
          │                  ▲
   Voice Input (Mic)    Voice Playback (WAV)
          │                  │
          ▼                  │
┌────────────────────────────────────────────────────────┐
│              HAQ 2.0 Backend Gateway                   │
├────────────────────────────────────────────────────────┤
│ 1. Voice Ingestion:                                    │
│    • Sarvam AI STT (`saaras:v2`, mr-IN / hi-IN / en-IN)│
├────────────────────────────────────────────────────────┤
│ 2. Agent Orchestrator:                                 │
│    • Groq LLM Engine (`qwen/qwen3.8-27b`)              │
│    • Tool-calling loop (Function Calling)              │
│      - searchSchemes (MAHABOCW database search)        │
│      - evaluateEligibility (Deterministic rule engine) │
│      - updateWorkerProfile (Consent-driven storage)    │
│      - getDocumentChecklist (Form-V & required docs)   │
│      - createApplicationTask (Semi-autonomous tasks)  │
├────────────────────────────────────────────────────────┤
│ 3. Voice Generation:                                   │
│    • Sarvam AI TTS (`bulbul:v3`, speaker `ritu`)       │
│    • Natural cadence Marathi voice response audio      │
├────────────────────────────────────────────────────────┤
│ 4. Document Intelligence:                              │
│    • Form-V clause & contractor signature analysis     │
│    • Confidence score & localized corrective advice    │
└────────────────────────────────────────────────────────┘
```

### Key Capabilities in 2.0:
1. **Push-to-Talk Voice Guidance**:
   - Workers speak directly in Marathi (`mr-IN`), transcribed via Sarvam `saaras:v2`.
   - Responses are spoken back using natural Devanagari voice synthesis (`bulbul:v3`, speaker `ritu`).
2. **Semi-Autonomous Task Management**:
   - The agent creates actionable tasks (e.g., getting Form-V signed by site supervisor, linking bank account).
   - Tasks are tracked in PostgreSQL with statuses: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`.
3. **Verified Knowledge Grounding**:
   - Every answer is grounded in official MAHABOCW sources (`MAHABOCW-SRC-REG-01`, `MAHABOCW-SRC-FORM-05`, etc.).
   - Explicit disclaimers remind workers that guidance is advisory and official sanctions rest with MAHABOCW.

