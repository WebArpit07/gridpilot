# GridPilot ⚡
### Autonomous EV Fleet & Dynamic Power Allocation Orchestrator
> *Liquid OS EV Charging Queue & Grid-Aware Power Dispatch Manager for Repo Reboot I.Fest '26*

---

## 📖 Overview

**GridPilot** is a high-performance EV charging station orchestrator and discrete-event simulation engine paired with an ultra-modern, cyberpunk luxury dashboard. 

Commercial and municipal electric vehicle (EV) charging plazas face strict electrical infrastructure constraints: total grid power caps, connector throughput limits, non-linear battery profiles, and stochastic vehicle arrivals with rigid departure deadlines. Standard First-Come, First-Served (FCFS) queuing frequently results in avoidable deadline misses, unserved battery energy, and inefficient demand spikes.

GridPilot solves this by implementing **Least-Slack-First (LSF)** dynamic scheduling and real-time power allocation, dynamically reallocating charging power under physical grid constraints, connector faults, and sudden demand-response capacity drops.

---

## ⚡ Core Features

- **Futuristic Luxury Sidebar & Navigation**:
  - Persistent left sidebar housing brand identity, real-time FastAPI health monitor with live ping indicator, scenario switchers, and policy mode selectors.
  - Multi-view architecture: **Dashboard Overview**, **Station & Grid Hardware**, **Car State & Fleet Cohort**, **History & Event Trace**, and **Live Backend JSON Inspector**.
- **Iconic EV Telemetry Showcase**:
  - **EV Cars & Fleet Telemetry**: Top-down futuristic wireframe vehicle with glowing neon cyan high-voltage battery core, real-time SOC percentage, remaining charge time, range estimate, and unit cost.
  - **Charge Goals Radial Gauge**: Neon fuchsia-to-purple circular progress arc displaying daily completion goals and fleet energy progress.
  - **Grid Route & Trip Planner**: Dark violet neon grid map with active route trajectories, waypoints, and zoom controls.
- **Head-to-Head Algorithmic Evaluation**:
  - Executive verdict banner highlighting algorithmic superiority (+% completion gain, deadline misses prevented, and kWh energy gain).
  - 8 comparative metric cards: Completion Rate, Deadline Misses, Average Wait Time, Battery Energy, Peak Demand, Point Utilization, Vehicles Served, and Unserved Energy.
- **Dynamic Aggregate Power Curve (Recharts)**:
  - Multi-series area curves with flowing neon gradients: Neon Cyan (LSF), Neon Fuchsia (FCFS), and Sunset Amber (Station Physical Limit).
  - Interactive series toggles and dynamic capacity drop reference markers.
- **Minute-by-Minute Gantt Timelines**:
  - Discrete connector occupancy lanes (CP-1, CP-2, CP-3, CP-4...) with operational status flags.
  - Multi-colored vehicle blocks: Neon Fuchsia/Purple (Completed), Sunset Amber (Throttled/Power Reduced), and Crimson Rose (Deadline Miss).
  - Interactive playback scrubber (`Play`, `Pause`, `Reset`, and time slider from $t=0$m to $90$m) with glowing timeline needle.
  - Detailed hover modal with individual vehicle telemetry.
- **Deterministic Event Trace & Explainability Feed**:
  - Filterable trace log of every minute transition with mathematical explainability popovers.
- **Live FastAPI Backend JSON Inspector**:
  - In-app JSON viewer to inspect and copy raw API response payloads.

---

## 📐 Mathematical Formulation

### 1. Slack Calculation (LSF Metric)
For vehicle $i$ at minute $t$, its remaining required energy $E_{\text{rem}, i}(t)$ is:
$$E_{\text{rem}, i}(t) = C_i \cdot \frac{\text{SOC}_{\text{target}, i} - \text{SOC}_i(t)}{100}$$

The minimum theoretical charging duration $T_{\min, i}(t)$ in minutes is:
$$T_{\min, i}(t) = \frac{60 \cdot E_{\text{rem}, i}(t)}{\eta \cdot \min(P_{\text{vehicle}, i}, P_{\text{point}, j})}$$
where $\eta$ is converter efficiency ($0.90$).

The dynamic slack $\text{Slack}_i(t)$ is defined as:
$$\text{Slack}_i(t) = D_i - t - T_{\min, i}(t)$$
where $D_i$ is departure deadline.
* **$\text{Slack}_i(t) < 0$**: Mathematically infeasible request (cannot reach target SOC before departure).
* **Minimal positive slack**: Highest scheduling urgency $\rightarrow$ prioritized for connector allocation and power dispatch.

### 2. Physical Power Allocation Constraint
At every discrete minute $t$, total allocated station power satisfies:
$$\sum_{i \in \text{Active}} P_{i}(t) \le P_{\text{station, available}}(t)$$
$$0 \le P_i(t) \le \min\left(P_{\text{vehicle}, i}, P_{\text{point}, j}\right)$$

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19) |
| **Styling & Theme** | [Tailwind CSS v4](https://tailwindcss.com/) with Cyberpunk Luxury Velvet palette |
| **Typography** | `Plus Jakarta Sans` (UI) and `JetBrains Mono` (Telemetry & Code) |
| **Motion & Charts** | [Framer Motion](https://www.framer.com/motion/), [Recharts](https://recharts.org/), [Lucide React](https://lucide.dev/) |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+), [Pydantic v2](https://docs.pydantic.dev/) |
| **Server & Runner** | [Uvicorn](https://www.uvicorn.org/) ASGI, Discrete-Event Engine |
| **Testing** | [Pytest](https://pytest.org/) (38 unit & integration tests) |

---

## 📁 Project Architecture

```
gridpilot/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── schemas.py           # Pydantic request & response schemas
│   │   │   └── simulations.py       # REST API endpoints (/api/scenarios, /api/simulations)
│   │   ├── engine/
│   │   │   ├── allocator.py         # Dynamic power allocation engine
│   │   │   ├── metrics.py           # Evaluation KPI calculator
│   │   │   ├── models.py            # Domain entity definitions
│   │   │   ├── policies.py          # LSF & FCFS scheduling implementations
│   │   │   ├── runner.py            # Head-to-head comparison runner
│   │   │   ├── scenarios.py         # Benchmark scenario definitions (A, B, C, D)
│   │   │   └── simulator.py         # Discrete minute simulation engine
│   │   └── main.py                  # FastAPI application entry point with CORS
│   ├── tests/                       # 38 unit & integration tests
│   └── requirements.txt             # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── globals.css              # Velvet luxury palette & ambient glow classes
│   │   ├── layout.tsx               # Root layout & Plus Jakarta Sans typography
│   │   └── page.tsx                 # Main orchestrated dashboard workspace
│   ├── components/
│   │   ├── backend-data-views.tsx   # Dedicated Station, Fleet, and JSON views
│   │   ├── dashboard-skeleton.tsx   # Sweeping purple shimmer loading skeleton
│   │   ├── ev-showcase-grid.tsx     # Top-down EV telemetry, Charge Goals, & Map
│   │   ├── event-log.tsx            # Explainability feed & trace log table
│   │   ├── metrics-overview.tsx     # Head-to-head comparative KPI cards
│   │   ├── power-chart.tsx          # Dynamic Recharts aggregate power curves
│   │   ├── providers.tsx            # ThemeProvider & liquid backdrop glows
│   │   ├── sidebar.tsx              # Luxury left sidebar & mobile drawer
│   │   ├── theme-toggle.tsx         # Dark/Light theme toggle
│   │   └── timeline-view.tsx        # Multi-lane Gantt connector timelines
│   ├── lib/
│   │   ├── api.ts                   # Resilient dual-endpoint API client layer
│   │   ├── types.ts                 # TypeScript interfaces
│   │   └── utils.ts                 # Time-series builders & formatters
│   ├── next.config.ts               # Next.js config & backend proxy rewrites
│   └── package.json
├── pytest.ini                       # Pytest configuration
└── README.md                        # Project documentation
```

---

## 🚀 Setup & Installation Guide

### Prerequisites
* **Python**: `3.10` or higher installed
* **Node.js**: `18.18.0` or higher installed
* **Package Managers**: `npm` (bundled with Node.js) and `pip`

---

### Step 1: Clone or Navigate to the Workspace
```bash
cd c:\Users\glitc\gridpilot
```

---

### Step 2: Backend Setup (FastAPI)

1. **Create and activate a Python virtual environment**:
   * **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

2. **Install Python dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Verify the backend test suite**:
   ```bash
   pytest
   ```
   *All 38 test suites across models, policies, runner, allocator, and API endpoints should pass.*

4. **Launch the FastAPI backend server**:
   ```bash
   uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   *The backend will be live at `http://127.0.0.1:8000`. You can verify health at `http://127.0.0.1:8000/health` or view Swagger docs at `http://127.0.0.1:8000/docs`.*

---

### Step 3: Frontend Setup (Next.js)

1. **Open a new terminal and navigate to the `frontend/` directory**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Run the Next.js development server**:
   ```bash
   npm run dev
   ```
   *The frontend will start at `http://localhost:3000`.*

4. **Build for production (Optional)**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check endpoint returning `{"status": "ok"}` |
| `GET` | `/api/scenarios` | Lists benchmark scenarios (Scenario A, B, C, D) |
| `GET` | `/api/scenarios/{name}` | Returns detailed `StationConfig`, vehicles cohort, and dynamic events |
| `POST` | `/api/simulations/compare` | Executes head-to-head simulation comparison between FCFS and LSF |

---

## 🚦 Benchmark Scenarios

* **Scenario A — High-Density Deadline Stress**: 4 charging points (11kW each), 40kW station. 8 vehicles arriving simultaneously at $t=0$ with tight departure deadlines. Tests queue prioritization.
* **Scenario B — Heterogeneous Fleet**: 4 points. Mix of long-dwell low-power vehicles and short-dwell high-power vehicles arriving staggered. Tests connector turnover.
* **Scenario C — Dynamic Demand Response**: 4 points. Station capacity suddenly drops from 80kW to 30kW at $t=30$m. Tests real-time power scaling and shedding.
* **Scenario D — Hardware Fault & Infeasible Deadlines**: Features an EV with mathematically impossible deadlines ($\text{Slack} < 0$) and a simulated connector hardware failure. Tests graceful degradation.

---

## 🛡️ License

Developed for **Repo Reboot I.Fest '26**. All rights reserved.
