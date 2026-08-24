# PairEval — Campus Pairwise Evaluation Service

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](#testing--verification)
[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/react-18.3-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)

**PairEval** is an evidence-based pairwise comparison evaluation platform designed for higher education course assessments (group and individual peer evaluations). It eliminates absolute grading bias, mitigates free-rider problems, and curbs grade inflation while ensuring student evaluation sessions stay under 15 minutes.

---

## 🎯 Key Problems Solved

1. **Absolute Scoring Bias**: Evaluators no longer suffer from fatigue or anchoring bias caused by evaluating items in isolation sequentially. Pairwise comparison ("Is A or B better?") provides significantly higher consistency.
2. **Free-rider Problem**: Provides empirical evidence to differentiate individual contributions within group projects fairly without penalizing group dynamics.
3. **Peer Rating Inflation**: Replaces uniform perfect scores with forced-choice comparative evaluations.
4. **Privacy & Anonymity**: Enforces $k$-anonymity ($k \ge 3$) and hides daily score deltas to protect student evaluators from deanonymization in compliance with PDPA guidelines.

---

## 🚀 Core Features & Mathematical Principles

- **6-Point Forced-Choice Scale (D1)**: No neutral midpoint option (1–6 scale) to prevent central-tendency bias.
- **Pure Function Scoring Engine (AR-01)**: Mathematical band mapping (default 60% floor, 100% ceiling) and individual participation multipliers ($M$). Reproducible, deterministic, and state-free.
- **Mathematical Feasibility & Dynamic Coverage (AR-06)**: Automatically calculates evaluation workload ($k$) and coverage ($R$) constraints, adjusting parameters dynamically with explicit rationale when necessary.
- **Pairing Invariants (INV-1..5 & D8)**: Enforces item coverage, group separation, self-evaluation guards, and left/right item randomized presentation to minimize position bias.
- **Integrity & Quality Engine**: Real-time detection of intransitive 3-cycles ($A > B > C > A$), position bias, and straight-line rating patterns.
- **Append-Only Audit Trail (AR-03)**: Immutable log recording all critical administrative actions, score overrides, and student appeal workflows.

---

## 🏗️ System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │   Frontend Client (React + TypeScript)  │
                               │   - Tailwind CSS UI & Lucide Icons      │
                               │   - Offline Queue & Autosave Mechanism  │
                               └────────────────────┬────────────────────┘
                                                    │
                                         REST API / JSON (Idempotent)
                                                    │
                               ┌────────────────────▼────────────────────┐
                               │       Backend API Gateway (FastAPI)     │
                               │   - OIDC Google Auth & Hosted Domain    │
                               │   - Role-Based Access Control (RBAC)    │
                               └────────────────────┬────────────────────┘
                                                    │
             ┌──────────────────────────────────────┼──────────────────────────────────────┐
             │                                      │                                      │
┌────────────▼───────────┐             ┌────────────▼───────────┐             ┌────────────▼───────────┐
│ Feature Modules        │             │ Scoring & Pairing      │             │ Integrity & Audit      │
│ - Classroom Management │             │ - Pure Scoring Engine  │             │ - Intransitivity Check │
│ - Assignment Lifecycle │             │ - Feasibility Solver   │             │ - Append-only Logging  │
│ - Evaluation System    │             │ - k-Anonymity Guard    │             │ - Appeals Management   │
└────────────┬───────────┘             └────────────┬───────────┘             └────────────┬───────────┘
             │                                      │                                      │
             └──────────────────────────────────────┼──────────────────────────────────────┘
                                                    │
                               ┌────────────────────▼────────────────────┐
                               │          Data & Storage Tier            │
                               │   - Relational DB (SQLite / PostgreSQL) │
                               │   - Immutable Audit Records             │
                               └─────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── core/           # Configuration, database connection, security & auth middleware
│   │   ├── features/       # Modular feature domain packages
│   │   │   ├── assignment/ # Assignment creation, criteria & weights
│   │   │   ├── audit/      # Append-only audit logs & student grade appeals
│   │   │   ├── auth/       # Authentication, user profiles & domain restriction
│   │   │   ├── classroom/  # Classroom management & CSV roster import
│   │   │   ├── evaluation/ # Pairwise evaluation worksheets & draft autosave
│   │   │   ├── integrity/  # Intransitive 3-cycles, straight-lining & bias detector
│   │   │   ├── notification/# Notification and alert management
│   │   │   ├── pairing/    # Pairing engine & feasibility solver
│   │   │   ├── reporting/  # Export reports (CSV/XLSX) & k-anonymity score views
│   │   │   └── scoring/    # Pure function scoring engine & quality indices
│   │   ├── shared/         # Shared SQLAlchemy ORM models & base entities
│   │   └── main.py         # FastAPI application entrypoint & routing table
│   ├── tests/              # Backend test suite (E2E, pairing, scoring, security)
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/            # AuthContext and application providers
│   │   ├── components/     # Reusable UI components (Navbar, Toast, Badges)
│   │   ├── features/       # Feature views (Classrooms, Assignments, Worksheet, Reports, Audit)
│   │   ├── lib/            # API clients, local offline storage & utilities
│   │   ├── tests/          # Component & interaction test suites (Vitest)
│   │   ├── App.tsx         # Main application layout and view router
│   │   └── main.tsx        # React root mount
│   ├── package.json        # Frontend dependencies and scripts
│   ├── tailwind.config.js  # Tailwind CSS styling configuration
│   └── vite.config.ts      # Vite configuration & Vitest test setup
├── docs/                   # Architecture diagrams, ERD, OpenAPI specifications, user stories
├── memory-bank/            # Project memory bank, architectural standards, and unit specs
├── requirements.txt        # Root Python dependencies
├── package.json            # Root workspace scripts
└── pytest.ini              # Pytest configuration
```

---

## 🛠️ Prerequisites & Setup

### Prerequisites
- **Node.js**: v18.0.0 or later
- **Python**: v3.12 or later
- **npm** or **pnpm / yarn**

### 1. Installation

Install frontend and backend dependencies:

```bash
# Install frontend dependencies
npm --prefix frontend install

# Install backend dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the root directory (optional for default SQLite dev mode):

```env
PROJECT_NAME="PairEval"
API_V1_STR="/api"
SECRET_KEY="your-production-secret-key"
DATABASE_URL="sqlite:///./paireval.db"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
```

---

## 💻 Running the Application

### Running Frontend
```bash
# From repository root
npm run dev

# Or directly from frontend directory
cd frontend && npm run dev
```
The frontend will be available at `http://localhost:5173`.

### Running Backend API
```bash
# Start FastAPI server with live reload
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```
- **Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Testing & Quality Assurance

Run the unified test suite across both frontend and backend:

```bash
# Run both Backend Pytest and Frontend Vitest suites
npm test
```

### Run Backend Tests Only
```bash
python3 -m pytest -v
```

### Run Frontend Tests Only
```bash
npm --prefix frontend run test
```

### Type Checking & Linting
```bash
npm run lint
```

---

## 📖 API Documentation & Reference

The API surface adheres to OpenAPI 3.1 standards. Detailed API documentation is available at `docs/openapi.yaml` and live at `/docs`.

Key API endpoints include:
- `POST /api/auth/login` — Authentication & session creation
- `GET /api/classrooms` — List enrolled classrooms
- `POST /api/classrooms/{id}/roster/import` — CSV roster atomic import
- `POST /api/assignments/{id}/publish` — Assignment feasibility check & pairing generation
- `GET /api/evaluations/assignment/{id}/worksheet` — Student pairwise evaluation worksheet
- `POST /api/evaluations/submit` — Submit pairwise comparison ratings
- `GET /api/reports/assignment/{id}/student-scores` — Privacy-guarded student scores ($k \ge 3$)
- `GET /api/audit/assignment/{id}` — Append-only audit trail logs

---

## 🤝 Conventions & Contribution

- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/) format (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
- **Branching**: Develop on `feature/<feature-name>` branches and submit PRs to `develop`.
- **Accessibility & Testing**: Use semantic HTML and `data-testid` attributes for interactive elements.
- **TDD / Verification**: Ensure all tests pass (`npm test` & `npm run lint`) before submitting code changes.

---

## 📄 License

This project is licensed under the MIT License — see the repository files for details.
