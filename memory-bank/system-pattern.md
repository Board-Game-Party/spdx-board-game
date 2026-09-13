# System Pattern

Project นี้ใช้ Feature-based concept ในการจัดการ folder ด้านล่างคือตัวอย่างการ implement 

```plaintext
spdx-board-game/
├── memory-bank/                        # Context & Units Spec สำหรับ AI / Developer
│   ├── intent.md
│   ├── system-patterns.md              # กำหนด Tech Stack และ Architecture นี้
│   └── units/                          # Unit briefs แยกรายโมดูล
│       ├── auth-identity/
│       ├── pairing-engine/
│       ├── scoring-engine/
│       └── ...
│
├── backend/                            # FastAPI + Python
│   ├── app/
│   │   ├── main.py                     # FastAPI entrypoint, CORS, Exception handlers
│   │   ├── core/                       # Core setup: config, security, database session
│   │   ├── features/                   # Backend Feature-Based Modules
│   │   │   ├── auth/                   # [FR-AUTH-*] Google OAuth & session verification
│   │   │   │   ├── router.py           # FastAPI APIRouter
│   │   │   │   ├── schemas.py          # Pydantic models (Request/Response)
│   │   │   │   ├── services.py         # Business logic
│   │   │   │   └── models.py           # SQLAlchemy / ORM models
│   │   │   ├── classroom/              # [FR-CLASS-*] Roster & atomic CSV import parser
│   │   │   ├── assignment/             # [FR-ASSIGN-*] Lifecycle & weight validation
│   │   │   ├── pairing/                # [FR-PAIR-*, §8] Deterministic pairing & feasibility
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   ├── engine.py           # Invariants check (INV-1..5)
│   │   │   │   └── feasibility.py
│   │   │   ├── evaluation/             # [FR-EVAL-*] Autosave draft & submission endpoints
│   │   │   ├── scoring/                # [FR-SCORE-*, §9] Pure functions (AR-01) & Band mapping
│   │   │   ├── integrity/              # [QS-01..07] Quality signals & anomaly detector
│   │   │   ├── reporting/              # [FR-REPORT-*, FR-EXPORT-*] k-anonymity & CSV/XLSX
│   │   │   └── audit/                  # [FR-AUDIT-*] Append-only audit logger
│   │   └── shared/                     # Shared utilities, common middlewares, base schemas
│   ├── tests/                          # Tests แยกตาม feature (Golden tests, Property-based tests)
│   │   ├── test_scoring_golden.py      # [§9.5 Worked example verification]
│   │   └── test_pairing_properties.py  # [INV-1..5 Hypothesis / Property-based]
│   ├── requirements.txt / pyproject.toml
│   └── Dockerfile
│
└── frontend/                           # React + TypeScript + Tailwind CSS
    ├── src/
    │   ├── main.tsx                    # React bootstrap
    │   ├── app/                        # App router, Layouts, Global Context/Providers
    │   ├── features/                   # Frontend Feature-Based Modules
    │   │   ├── auth/                   # Login UI, Google consent button
    │   │   ├── classroom/              # Roster table, Atomic CSV upload modal
    │   │   ├── assignment/             # Setup form, Weight check indicator
    │   │   ├── evaluation/             # [FR-EVAL-*, FR-A11Y-*] Core Evaluation UI
    │   │   │   ├── components/
    │   │   │   │   ├── ForcedChoiceScale.tsx   # 6-point scale styled with Tailwind (D1)
    │   │   │   │   ├── ComparisonItemCard.tsx  # Display items & artifact link (A5)
    │   │   │   │   └── AutosaveBadge.tsx       # Live status aria-live="polite"
    │   │   │   ├── hooks/
    │   │   │   │   ├── useAutosave.ts          # Debounce ≤ 2s save draft
    │   │   │   │   └── useComparisonQueue.ts   # Offline sync handling (FR-EVAL-13)
    │   │   │   ├── api/
    │   │   │   │   └── evaluationApi.ts        # Axios / Fetch client hooks
    │   │   │   └── types/
    │   │   │       └── index.ts                # Evaluation TypeScript interfaces
    │   │   ├── reporting/              # Group/Individual summary & charts
    │   │   └── audit/                  # Score override & appeals intake views
    │   ├── components/                 # Shared UI (Tailwind Button, Modal, Inputs)
    │   └── lib/                        # Global utils (cn, date-format, api client)
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── package.json
    └── Dockerfile
```