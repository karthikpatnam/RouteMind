# RouteMind 🚢

**RouteMind** is a state-of-the-art AI-Powered Predictive Supply Chain Routing system designed to autonomously aggregate real-time intelligence, assess physical and geopolitical risks, and dynamically recommend the most optimal maritime shipping routes.

## ✨ Key Features
- **Multi-Agent Intelligence**: Specialized autonomous agents fetch real-time Weather, OSINT News, and Traffic congestion metrics.
- **Glass-box Analytics**: Built-in WebSocket streaming allows users to watch the AI's internal reasoning and polling processes live.
- **Hybrid Decision Engine**: Fuses mathematical routing graphs (NetworkX Dijkstra) with probabilistic Semantic Reasoning (Google Gemini) for the best of both worlds.
- **Auditable Ledger**: Seamless integration with Supabase (PostgreSQL) archives all agent decisions, confidence values, and telemetry.

---

## 🏗️ Architecture Stack
- **Frontend**: Next.js (App Router), React, TailwindCSS, TypeScript
- **Backend**: Python, FastAPI, WebSockets
- **Agent Orchestration**: LangGraph, Google Gemini LLM
- **Database**: Supabase / PostgreSQL

---

## ⚡ The Backend Flow

The backend operates as an event-driven Intelligence Core that doesn't just rely on text generation—it computes real physical constraints dynamically.

1. **Trigger & Broadcast**: The system receives a geographic request from the Next.js UI via `/api/agents/trigger`. A WebSocket instantly opens to broadcast the ensuing "thinking process" back to the user interface.
2. **Concurrent Sensory Scanning**: Using Python's `asyncio.gather`, LangGraph concurrently dispatches three independent agents:
   - 🌦️ **Weather Agent**: Polls the Open-Meteo Marine API for localized wind speed, wave height, and precipitation, returning a base numerical risk factor.
   - 📰 **Geopolitical OSINT Agent**: Scrapes global news APIs for the target region, calculating an autonomous "local sentiment score" to identify potential piracy, port closures, or strikes.
   - 🚢 **Traffic Agent**: Simulates geospatial congestion and maritime chokepoints based on AIS data density.
3. **Graph Penalty Calculation**: 
   - The original shipping lanes are loaded into a physical **NetworkX mathematical graph**.
   - The aggregated risk metrics (e.g., strong wind or heavily negative news sentiment) are converted into penalties applied to the edges of the routes in the graph.
   - A proprietary Dijkstra algorithm (`find_route`) evaluates and secures the safest deterministic path bypassing these dynamic hazards.
4. **LLM Synthesis**: The raw sensory telemetry *and* the deterministic NetworkX calculated route are bundled and fed into the **Gemini Routing Engine**.
5. **Decision Render**: The LLM Engine acts as the final "Captain," translating the computational risk and alternate routing into a highly readable, context-aware human recommendation. 
6. **Data Archival**: The full diagnostic package (including reasoning, confidence metrics, and raw telemetry) is persisted entirely in Supabase for supply chain auditing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js & pnpm
- Python 3.10+
- A Google Gemini API Key
- Supabase project credentials

### 1. Clone & Setup Environment

Populate your local environment files:
- **Frontend** (`.env.local`)
- **Backend** (`backend/.env`)

Make sure to include your `GEMINI_API_KEY` in the python `.env` file.

### 2. Start the Backend (FastAPI Intelligence Core)
Open a terminal, navigate to the `backend` folder, and run:
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### 3. Start the Frontend (Next.js Dashboard)
Open a separate terminal and run:
```bash
npm install 
# or pnpm install

npm run dev
# or pnpm dev
```

Visit `http://localhost:3000` to interact with the dashboard and trigger an optimization simulation.
