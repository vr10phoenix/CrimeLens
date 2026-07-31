```    ____  ____   ___   __  __  _____  _      _____  _   _  ____  
      / ___||  _ \ |_ _| |  \/  || ____|| |    | ____|| \ | |/ ___| 
     | |    | |_) | | |  | |\/| ||  _|  | |    |  _|  |  \| |\___ \ 
     | |___ |  _ <  | |  | |  | || |___ | |___ | |___ | |\  | ___) |
      \____||_| \_\|___| |_|  |_||_____||_____||_____||_| \_||____/

                CONVERSATIONAL AND ANALYTICS AI PLATFORM
```

# KSP CrimeLens – AI‑Powered Crime Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.x-4581C3.svg)](https://neo4j.com/)
[![Ollama](https://img.shields.io/badge/Ollama-LLM-000000.svg)](https://ollama.com/)
[![ML](https://img.shields.io/badge/Scikit--learn-1.3+-F7931E.svg)](https://scikit-learn.org/)

**Real‑time crime analytics, predictive policing, and AI‑powered investigation — all in one dark‑themed tactical dashboard.**

---

## Overview

**KSP CrimeLens** is a full‑stack, multi‑modal intelligence system built for the Karnataka State Police.  
It ingests **10,000+ synthetic FIRs**, **15,000 persons**, **6,000 financial accounts**, and **12 gangs** spread across all 31 districts of Karnataka. The platform then:

- **Stores structured data** in a high‑performance PostgreSQL database
- **Builds a knowledge graph** in Neo4j that links persons, gangs, cases, accounts, and phone records
- **Indexes real FIR documents** (PDFs & images) using a Chroma vector database with **multilingual embeddings** (`BAAI/bge-m3`)
- **Runs a dual‑retrieval RAG chatbot** that answers questions in **English & Kannada** by combining PostgreSQL SQL results with vector‑retrieved FIR excerpts
- **Trains ML models** for **crime forecasting** (Prophet) and **individual risk scoring** (Isolation Forest)
- **Delivers a stunning, interactive analytics dashboard** featuring 20+ live charts, maps, network graphs, and predictive widgets – all built with React, Recharts, D3.js, and Tailwind CSS

Every component is **open‑source, runs locally (no external APIs, no rate limits)**, and can be launched with a single script.

---

###  Architecture



---

### 🎯 Features

- **Massive Synthetic Dataset** – 10,000 FIRs, 15,000 persons, 12 gangs, 6,000 accounts with realistic Karnataka addresses, IPC sections, and multi‑hop relationships (family, gang, financial, phone calls)
- **Multi‑Modal RAG Chatbot** – Retrieves relevant data from PostgreSQL (via Text‑to‑SQL) and FIR documents (via vector search), then answers in **English or Kannada** using Ollama‑served LLMs (`gemma2:9b`, `aya-23-8b` ready)
- **Neo4j Knowledge Graph** – 6 relationship types (`ACCUSED_IN`, `MEMBER_OF`, `TRANSFERRED_TO`, `CALLED`, `OWNS`, `VICTIM_IN`) for network analysis and centrality detection
- **20+ Analytics Endpoints** – Hourly heatmaps, day‑of‑week trends, monthly forecasts, district‑crime matrix, gang activity, repeat offenders, victim demographics, weapon usage, and more
- **Predictive ML** – Next‑month crime forecasting (Prophet) and individual risk scoring (Isolation Forest)
- **Geospatial Mapping** – Karnataka choropleth map with district‑level crime counts and severity index
- **Financial Crime Detection** – Money laundering ring detection using cycle queries in Neo4j
- **Document Ingestion Pipeline** – PDF/Image OCR → text chunks → multilingual embeddings → Chroma vector store (runs on Colab GPU)
- **Immersive Dark UI** – Tactical dark theme with glassmorphism, animated counters, scanline overlays, and responsive grid layout
- **Live Mode** – Toggle to auto‑refresh all charts every 30 seconds

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite, Tailwind CSS, Recharts, D3.js, Framer Motion, Lucide Icons |
| **Backend** | FastAPI (Python), SQLAlchemy, Uvicorn |
| **Structured DB** | PostgreSQL 16 (Docker) |
| **Vector DB** | ChromaDB (with `intfloat/multilingual-e5-small` or `BAAI/bge-m3` embeddings) |
| **Graph DB** | Neo4j 5 (Docker) |
| **LLM** | Ollama (supports `gemma2:9b`, `qwen2:7b`, `aya-23-8b`, etc.) |
| **ML** | Prophet (forecasting), Scikit‑learn (Isolation Forest), Pandas, Joblib |
| **Document Processing** | PyMuPDF, Tesseract OCR, LangChain, HuggingFace Embeddings |
| **DevOps** | Docker, Docker Compose, PowerShell scripts |

---

### Getting Started

#### Prerequisites

- **Docker Desktop** (for PostgreSQL & Neo4j)
- **Ollama** (installed and running locally)
- **Python 3.11+** with `venv`
- **Node.js 18+** with `npm`
- **Google Colab** (for one‑time ChromaDB build — optional; local GPU can also be used)

#### Clone the repository

```bash
git clone https://github.com/vr10phoenix/crimelens.git
cd crimelens
```
#### Setup Environment 
```
venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```
#### Start PostgreSQL and Docker
```
docker run -d --name crime-lens-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=secret123 -e POSTGRES_DB=crime_db -p 5432:5432 postgres:16
docker run -d --name crime-neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/testpass neo4j:latest
```
#### Generate Dataset
```
python generate_data.py
```
#### Build Knowledge Graph
```
python build_graph.py
```

#### Build ChromaDB (FIR documents)
Upload your PDFs and FIR images to Google Drive.
Run the provided Colab notebook ```notebooks/ChromaDB_Ingestion.ipynb``` — it performs OCR, chunks, embeds, and stores the vector database on Drive.

Download the chroma_db folder and place it in the project root.

#### Pull LLM models
```
ollama pull gemma2:9b
ollama pull bge-m3    
```
#### Launch Backends
```
# LLM + RAG backend
uvicorn Backend.main:app --reload --port 8000

# Analytics & ML backend
uvicorn Backend.analytics_backend:app --reload --port 8001
```

#### start Frontend
```
cd dashboard
npm install --legacy-peer-deps
npm run dev
```

**Open http://localhost:5173 in your browser.**


### API Endpoints

#### Analytics (localhost:8001)

| Category        | Endpoint                                | Description                                   |
|-----------------|-----------------------------------------|-----------------------------------------------|
| Stats           | /api/analytics/stats/enhanced           | Total FIRs, gangs, closure rate, avg arrest time |
| Temporal        | /api/analytics/hourly_heatmap           | Cases per hour (24 bins)                      |
|                 | /api/analytics/day_of_week              | Cases by weekday                              |
|                 | /api/analytics/monthly_trend_extended   | Monthly trend (5 years)                       |
| Crime Types     | /api/analytics/crime_types              | Major crime head distribution                 |
|                 | /api/analytics/crime_severity_index     | Heinous % per district                        |
| Spatial         | /api/analytics/district_crimes          | Cases per district                            |
|                 | /api/analytics/district_crime_matrix    | Top‑5 crime types per district                |
| Offender/Victim | /api/analytics/repeat_offenders         | Top repeat offenders                          |
|                 | /api/analytics/offender_demographics    | Age/gender of accused                         |
|                 | /api/analytics/victim_demographics      | Age/gender of victims                         |
|                 | /api/analytics/weapon_usage             | Common weapons in brief facts                 |
| Gangs & Networks| /api/analytics/gang_activity            | Members & linked cases per gang               |
|                 | /api/analytics/gang_network_centrality  | Top connected persons (Neo4j)                 |
|                 | /api/analytics/neo4j-network            | Full graph nodes & edges (Neo4j)              |
| Financial       | /api/analytics/financial_crimes         | Transaction summary                           |
|                 | /api/analytics/money_laundering_rings   | Circular transactions (Neo4j)                 |
| Justice         | /api/analytics/police_station_performance | Caseload & arrest efficiency                |
|                 | /api/analytics/court_pendency           | Court workload by status                      |
|                 | /api/analytics/arrest_surrender_ratio   | Monthly arrest vs surrender                   |
|                 | /api/analytics/case_resolution_funnel   | Case stages distribution                      |
| Search          | /api/analytics/fir_fulltext_search      | Full‑text search in brief facts               |
|                 | /api/analytics/case_similarity/{id}     | Similar FIRs by keyword overlap               |
| Predictive      | /api/analytics/predictive_deployment    | Suggested patrol hours per district           |
| Cross‑District  | /api/analytics/cross_district_crime     | Accused operating outside home district       |

---

#### ML (localhost:8001)

| Endpoint               | Description                                |
|-------------------------|--------------------------------------------|
| /api/ml/forecast        | 6‑month crime forecast (Prophet)           |
| /api/ml/risk-scores     | Top‑N high‑risk individuals (Isolation Forest) |

---

#### RAG Chat (localhost:8000)

| Endpoint   | Description                                               |
|------------|-----------------------------------------------------------|
| /api/chat  | Main chatbot endpoint (POST) – accepts `{ "query": "..." }` |

### Screenshots
##### Chat-bot
![ChatBot](https://github.com/vr10phoenix/CrimeLens/blob/main/Assets/Screenshot%202026-08-01%20011348.png)
##### Analytics
![Analytics](https://github.com/vr10phoenix/CrimeLens/blob/main/Assets/Screenshot%202026-08-01%20011416.png)
##### Predictive Models
![Predictive](https://github.com/vr10phoenix/CrimeLens/blob/main/Assets/Screenshot%202026-08-01%20011433.png)
##### Network Graph
![Network Graph](https://github.com/vr10phoenix/CrimeLens/blob/main/Assets/Screenshot%202026-08-01%20011456.png)

### Further Development
- Developing Advanced Analytics and upgrading existing sections.
- Building on the base level Prototype Machine Leanring Models.
- Improving Network graph to capture patterns.

### Contributors
**P Vardhan Reddy** - Full‑stack development, data engineering, ML models, UI/UX design
**Ujjwal Gupta**    - Backend development, API design, and deployment workflows

