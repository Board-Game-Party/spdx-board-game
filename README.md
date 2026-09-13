# PairEval — Campus Pairwise Evaluation Service

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](#-testing--quality-assurance)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](#-quick-start-with-docker-recommended)
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

## ⚡ Quick Start with Docker (Recommended)

Run the entire application (Backend + Frontend + Database) with a **single command**:

```bash
# Start all services with hot-reload
docker compose up

# (Optional) In another terminal, seed SE101 demo classroom & test accounts
docker compose exec api python3 -m backend.scripts.seed_demo_data
```

- **Frontend Web Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API Gateway**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Run Tests in Ephemeral RAM Database
```bash
# Runs test suite against ephemeral tmpfs database and exits cleanly
docker compose -f compose.test.yaml up unit --abort-on-container-exit --exit-code-from unit
```

### Stop & Teardown Containers
```bash
docker compose down -v
```

---

## 💻 Local Development (Without Docker)

### 1. Prerequisites
- **Python**: v3.12 or later
- **Node.js**: v18.0.0 or later (with npm)

### 2. Installation
```bash
# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
npm --prefix frontend install
```

### 3. Seed Demo Data & Start Services
```bash
# Seed SE101 demo classroom and test accounts
python3 -m backend.scripts.seed_demo_data

# Start backend server
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000

# Start frontend development server
npm run dev
```

---

## 🧪 Testing & Quality Assurance

Run the unified test suite across both frontend (Vitest) and backend (Pytest):

```bash
# Run unified test suite
npm test
```

### Run Specific Test Suites
```bash
# Backend pytest suite only
python3 -m pytest -v

# Frontend vitest suite only
npm --prefix frontend run test

# Type checking & linting
npm run lint
```

---

## 🔄 Demo Helper Scripts

### With Docker
```bash
# Seed SE101 classroom with teacher, TA, and 4 student groups
docker compose exec api python3 -m backend.scripts.seed_demo_data

# Reset demo assignment back to clean DRAFT status (1-second reset)
docker compose exec api python3 -m backend.scripts.reset_demo
```

### Local Development (Without Docker)
```bash
# Seed SE101 classroom with teacher, TA, and 4 student groups
python3 -m backend.scripts.seed_demo_data

# Reset demo assignment back to clean DRAFT status (1-second reset)
python3 -m backend.scripts.reset_demo
```

---

## 📖 Documentation & Guides

| Document | Description |
| :--- | :--- |
| [`docs/setup-steps.md`](docs/setup-steps.md) | Before vs After Environment Loop Comparison Table |
| [`docs/architecture.md`](docs/architecture.md) | System Architecture & Modular Feature Packages |
| [`docs/erd.md`](docs/erd.md) | Entity Relationship Diagram & Database Schema |
| [`docs/openapi.yaml`](docs/openapi.yaml) | Full OpenAPI 3.0 REST Specification |
| [`docs/user-story.md`](docs/user-story.md) | Complete User Stories & Acceptance Criteria |

---

## 📁 Repository Structure

```text
.
├── Dockerfile              # Multi-stage container build (deps -> build -> test -> runtime)
├── .dockerignore           # Container build exclusion rules
├── compose.yaml            # Single-command dev environment with hot-reload
├── compose.test.yaml       # Ephemeral RAM test environment (tmpfs)
├── AGENTS.md               # Agent instructions & development loop rules
├── backend/
│   ├── app/
│   │   ├── core/           # Config, database connection, security & auth middleware
│   │   ├── features/       # Modular feature domain packages (auth, classroom, assignment, pairing, evaluation, scoring)
│   │   ├── shared/         # SQLAlchemy ORM models & database base entities
│   │   └── main.py         # FastAPI application entrypoint & routing table
│   ├── scripts/            # Demo seeding (seed_demo_data.py) & reset (reset_demo.py)
│   ├── tests/              # Backend test suite (E2E, pairing invariants, golden scoring)
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/            # AuthContext and application state providers
│   │   ├── features/       # Feature views (GoogleOAuthModal, Classrooms, Assignments, Worksheet, Reports)
│   │   ├── components/     # Reusable UI components
│   │   └── tests/          # Frontend Vitest test suite
│   ├── package.json        # Frontend dependencies and scripts
│   └── vite.config.ts      # Vite configuration & Vitest setup
├── docs/                   # Architectural guides, user stories, OpenAPI specs, and lab docs
└── package.json            # Root workspace scripts (npm test, dev, lint, build)
```

---

## 📄 License

This project is licensed under the MIT License — see repository files for details.
