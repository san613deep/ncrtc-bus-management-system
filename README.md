# NCRTC Bus Management System
### Final-Year Capstone | NSUT Delhi | Team of 4

A production-style fleet management system for NCRTC's feeder bus network around the Delhi NCR RRTS corridor.

![License](https://img.shields.io/badge/license-MIT-blue) ![Stack](https://img.shields.io/badge/stack-FastAPI%20%7C%20Spring%20Boot%20%7C%20Next.js-green)

---

## 🚀 Quickstart (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/ncrtc-bms.git
cd ncrtc-bms

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your values (or use defaults for local dev)

# 3. Start everything
docker compose up --build

# Wait ~60 seconds for all services to start + seed to run

# 4. Open the app
# Dashboard:  http://localhost:3000
# API Docs:   http://localhost:8000/docs
```

## 🔑 Demo Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `password` | System Admin |
| `manager1` | `password` | Depot Manager (Noida) |
| `operator1` | `password` | Control Room Operator |
| `driver1` | `password` | Bus Driver (Noida) |

> ⚠️ **Demo only** — these credentials are for evaluation purposes. Never use in production.

---

## 📐 Architecture

```
Next.js Frontend (Port 3000)
         │  HTTPS/JSON
         ▼
FastAPI Backend (Port 8000)
    ├── Auth, AVLS, IMS, CMS
    └── Proxy → Spring Boot (Port 8080)
                  └── Scheduling (Routes + Duties)
                      └── MySQL (Port 3306)
    └── PostgreSQL + PostGIS (Port 5432)
    └── Redis Cache (Port 6379)
         ▲
GPS Tick Script (simulates live buses every 5s)
```

## 🧩 Modules

| Module | Description | Status |
|---|---|---|
| **AVLS** | Live bus tracking map + GPS history | Phase 3 |
| **IMS** | Incident reporting and management | Phase 4 |
| **CMS** | Notices with read receipts | Phase 2 |
| **Scheduling** | Routes and duty management (Spring Boot) | Phase 5 |

## 📂 Folder Structure

```
ncrtc-bms/
├── backend/              FastAPI (Python) — Auth, AVLS, IMS, CMS
├── scheduling-service/   Spring Boot (Java) — Routes + Duties
├── frontend/             Next.js 14 + Tailwind CSS
├── scripts/tick/         GPS simulation tick script
├── .github/workflows/    GitHub Actions CI/CD
└── docker-compose.yml    One command to run everything
```

## 🛠️ Tech Stack

- **Backend**: FastAPI 0.111 (Python 3.12) + Spring Boot 3.2 (Java 17)
- **Frontend**: Next.js 14 + React 18 + Tailwind CSS 3
- **Databases**: PostgreSQL 16 + PostGIS (primary) + MySQL 8 (scheduling)
- **Cache**: Redis 7
- **Maps**: Leaflet + OpenStreetMap (free, no API key)
- **Auth**: JWT (HS256) + bcrypt password hashing
- **DevOps**: Docker Compose + GitHub Actions CI

## 🔌 API Documentation

Auto-generated Swagger UI available at: **http://localhost:8000/docs**

## 🧪 Running Tests

```bash
# FastAPI tests
cd backend && pytest tests/ -v

# Spring Boot tests  
cd scheduling-service && mvn test

# Frontend type check
cd frontend && npx tsc --noEmit
```

## 📝 Architecture Note

This is a student capstone project using **seeded dummy data** and a **GPS tick script** for live bus simulation. In a production system:
- The tick script → a TCP ingest server receiving real NMEA GPS sentences
- The PostgreSQL insert → a message queue (Kafka) + consumer worker  
- The polling map → WebSocket connections for real-time push updates
- The Docker Compose → Kubernetes on AWS EKS

We built the correct *shape* of the system. The data is simulated, the architecture is real.

## 👥 Team

| Member | Module Ownership |
|---|---|
| Dev A | Auth + AVLS (FastAPI + Live Map) |
| Dev B | IMS + DevOps (Docker + CI/CD + AWS) |
| Dev C | CMS + Seed Scripts |
| Dev D | Scheduling (Spring Boot + Roster UI) |

---

*NCRTC BMS v1.0 · Student Project · NSUT Delhi*
