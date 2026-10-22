# GridPilot ⚡
### Autonomous EV Fleet & Dynamic Power Allocation Orchestrator
> *EV Charging Queue, Renewable Microgrid Dispatch & Carbon Offset Manager for Repo Reboot I.Fest '26 (Renewable Energy Intelligence Track)*

---

## 📖 Overview

**GridPilot** is a production-grade EV charging plaza orchestration platform, mathematical dispatch engine, and real-time operations dashboard.

Commercial charging hubs face strict physical constraints: total utility grid connection limits, variable connector throughputs, non-linear vehicle battery acceptance curves, and stochastic vehicle arrivals with rigid departure deadlines. Standard First-Come, First-Served (FCFS) queuing frequently results in avoidable deadline misses, unserved battery energy, transformer overload, and inefficient peak demand utility charges.

GridPilot acts as the intelligent "Air Traffic Controller" for electric vehicle charging plazas. It implements **Least-Slack-First (LSF)** dynamic scheduling and real-time **Weighted Water-Filling Power Allocation**, continuously rebalancing power among active charging bays under grid constraints, connector faults, and dynamic demand-response capacity drops.

### ☀️ Renewable Intelligence & ESG Engine
GridPilot couples charging dispatch directly with on-site **Solar PV generation modeling**, **Time-of-Use (ToU) dynamic electricity tariffs**, and **decarbonization offset analytics**:
- **On-Site Solar Microgrid**: Mathematically models solar irradiance curves peaking at midday to supply clean, zero-cost, zero-emission charging energy.
- **Dynamic Time-of-Use (ToU) Tariffs**: Tracks fluctuating utility rates ($0.10/kWh off-peak, $0.18/kWh standard, $0.32/kWh peak) and shifts EV charging blocks into solar hours to maximize cost reductions.
- **Decarbonization Offset**: Quantifies displaced grid carbon emissions ($0.70\text{ kg CO}_2/\text{kWh}$) and computes equivalent trees planted in real time.

---

## 🎯 What Problem Does GridPilot Solve?

| Real-World Charging Challenge | GridPilot Algorithmic Solution |
| :--- | :--- |
| **Grid Transformer Overload** | Dynamically throttles charging bay allocations so total station draw never exceeds physical limits ($P_{\text{grid}} + P_{\text{solar}}$). |
| **Missed Departure Deadlines** | Calculates vehicle **Slack Margin** ($\text{Slack} = D - t - T_{\min}$) every minute, preempting non-urgent vehicles to ensure critical fleet departures are 100% satisfied. |
| **High Utility Demand Charges & Tariff Spikes** | Dynamically shifts high-power charging bursts into solar hours, minimizing reliance on expensive grid power during peak tariff windows ($0.32/kWh). |
| **Solar Curtailment & Clean Energy Waste** | Automatically absorbs fluctuating on-site solar PV generation into EV battery packs as flexible distributed energy storage. |
| **Cable / Inverter Tripping** | Weighted Water-Filling ensures power distributed to any vehicle never drops below its onboard charger minimum threshold ($P_{\min} \approx 6\text{ kW}$). |

---

## 👥 Who Is the End User?

1. **Commercial Fleet Depot Operators (Amazon, FedEx, DHL, Electric Bus Transit):**
   - Need delivery vans and transit buses fully charged before strict morning route departure deadlines without exceeding depot substation power limits.
2. **Commercial Charging Station Operators (CPOs — Electrify America, EVgo, ChargePoint):**
   - Manage multi-bay urban charging hubs, highway plazas, and airport parking structures. Need to maximize station throughput, eliminate demand penalties, and guarantee paying customers leave on time.
3. **Smart Grid & Distribution System Operators (DSOs / Utilities):**
   - Require demand response, peak shaving, and distributed energy resource (DER) orchestration to prevent local transformer burnouts.
4. **Corporate & Campus Sustainability Officers:**
   - Need verified ESG audit trails: Clean Energy Ratio (%), solar energy consumed (kWh), electricity cost savings ($), and verified carbon emissions avoided ($\text{kg CO}_2$).

---

## ⚡ Is the System Static or Dynamic?

### **GridPilot is 100% Dynamic with Real-Time Reactive Backend Computing.**

* **Zero Hardcoded Mock Data**: It is not a static webpage. Every chart, metric card, Gantt block, and audit event is computed in real time.
* **Full-Stack Computational Pipeline**:
  - **FastAPI / Python Numerical Engine**: Computes discrete-event simulation physics, solves convex water-filling optimization equations at every simulated minute, models solar irradiance bell curves, computes ToU tariff bills, and streams trace logs.
  - **Next.js 16 (React 19 / Turbopack)**: Dynamically renders all interactive Recharts curves, SVG dials, Gantt timeline bars, metric cards, and event explainability streams.
  - **Minute-by-Minute Interactive Scrubber**: Operators can scrub through simulation time ($t = 0 \to 180\text{ min}$) or press Play to observe vehicle batteries charge, power curves fluctuate, and scheduling decisions execute dynamically.
  - **Client-Side Simulation Fallback**: If the backend is disconnected, the frontend automatically falls back to an internal deterministic mathematical engine, ensuring uninterrupted live demonstrations.

---

## 🚀 Quickstart — One-Click Demo Launcher

Launch the entire GridPilot stack (backend, frontend, preflight test suite) with a single command from the project root:

```bash
python run.py
```

`run.py` automatically:
1. **Validates Environment**: Checks Python `.venv` and Node `node_modules` dependencies.
2. **Runs Pre-flight Tests**: Executes all **50 unit, integration, and renewable invariant tests** (`pytest`) before booting to guarantee zero regression.
3. **Parallel Service Startup**: Spawns the FastAPI backend (`:8000`) and Next.js frontend (`:3000`) concurrently.
4. **Console Dashboard Banner**: Prints direct URLs for Dashboard, Swagger Docs, Health API, and CSV Export.
5. **Graceful Shutdown**: Traps `Ctrl + C` and terminates all child processes cleanly without leaving orphaned ports on Windows or Linux.

---

## 🗺️ Interactive Web UI & Operator Navigation Manual

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                       GRIDPILOT UI                                     │
├────────────────────┬───────────────────────────────────────────────────────────────────┤
│    SIDEBAR HUB     │                         MAIN DASHBOARD                            │
│  • System Status   │  [1. EV Showcase Bento: Model 3 | Goals Gauge | GPS Route Map]    │
│  • Scenario Select │  [2. Algorithmic Verdict: LSF Dominance Delta & Misses Saved]     │
│  • Solar Toggle    │  [3. Renewable Intelligence Bento: Green Ratio | Solar Split | ESG]│
│  • Run Simulation  │  [4. 6-Card KPI Bento: Satisfaction | Peak kW | Fairness Index]   │
│  • Export CSV      │  [5. Dynamic Power Curve: Solar Curve + EV Demand + Capacity]     │
│  • Policy Switch   │  [6. Charging Bay Gantt Timelines: Bay 1 to Bay N + Scrubber Line]│
│  • Time Scrubber   │  [7. Explainable Event Log Feed: Why decisions were made]         │
│  • Navigation Tabs │                                                                   │
└────────────────────┴───────────────────────────────────────────────────────────────────┘
```

### 1. Left Control Sidebar
- **System Health Pill**: Real-time heartbeat beacon connected to `/health`. Displays ping latency and backend status.
- **Scenario Selector Dropdown**: Switch between benchmark scenarios (Scenario A through Scenario E).
- **Apple-Grade Solar Microgrid Toggle**:
  - Engineered with Framer Motion spring physics (`stiffness: 500, damping: 30`) and haptic tap scaling (`whileTap={{ scale: 0.95 }}`).
  - **ON**: Radiant amber/emerald track glow with rotating illuminated Sun icon ($180^\circ$).
  - **OFF**: Deep slate track with smooth transition to Moon icon.
- **Run Simulation Button**: Glowing gradient trigger that executes the full discrete simulation.
- **Export Report (CSV)**: Generates a downloadable 4-section auditable CSV spreadsheet.
- **Policy Evaluation Switch**: Toggle between **Split View (LSF vs FCFS)**, **LSF Only**, or **FCFS Baseline**.
- **Time Scrubber Bar**: Play, Pause, Reset, and scrub minute-by-minute across the simulation horizon.
- **Navigation Tabs**: Switch between **Dashboard**, **Station & Grid**, **Car State / Fleet**, **History**, and **Backend Raw Data**.

### 2. Main Dashboard Workspace
- **Iconic EV Telemetry Showcase Grid**:
  - *Fleet Vehicle Telemetry*: Futuristic wireframe vehicle displaying battery capacity, real-time SoC %, remaining charge time, and range.
  - *Charge Goals Radial Gauge*: Precision SVG circular progress arc with sub-pixel milestone labels (`0`, `50`, `100`) vertically padded to prevent stroke collision.
  - *Grid Route & Trip Planner*: Dark violet neon grid map with active route trajectories, waypoints, and an anchored glowing beacon pulsing at destination coordinates `(210, 50)`.
- **Algorithmic Evaluation Verdict Banner**: Executive banner highlighting algorithmic superiority (+% completion gain, deadline misses prevented, and kWh energy gain).
- **Renewable Intelligence & ESG Analytics Bento**:
  - *Clean Energy Ratio*: Circular emerald SVG progress ring indicating solar self-consumption.
  - *Solar vs. Grid Energy Split*: Dual-toned comparative progress bar (kWh solar vs. kWh grid).
  - *Dynamic Electricity Cost & Savings*: Financial tracking under dynamic ToU rates.
  - *Decarbonization Offset*: Real-time $\text{kg CO}_2$ avoided and equivalent trees planted.
- **6-Card Operational KPI Grid**: Deadline Satisfaction Rate (%), Total Energy Delivered (kWh), Mean Waiting Time (min), Station Peak Power (kW), Bay Utilization (%), and Jain's Fairness Index.
- **Dynamic Stacked Power Curve Chart (Recharts)**:
  - Multi-series area curves: **Golden/Amber Area** (Solar PV Generation $P_{\text{solar}}(t)$), **Cyan/Blue Area** (Allocated EV Demand $P_{\text{allocated}}(t)$), and **Slate/White Line** (Station Physical Capacity $P_{\text{grid}} + P_{\text{solar}}$).
  - Interactive tooltip displaying minute breakdown: Allocated kW, Solar kW, Grid kW, and Active Tariff ($/kWh).
- **Minute-by-Minute Gantt Timelines**:
  - Multi-lane connector tracks (CP-1, CP-2, CP-3, CP-4...) showing vehicle occupancy blocks, power throttling, completion states, and an interactive scrubber needle.
- **Explainable Event Log & Audit Stream**:
  - Chronological decision feed explaining *why* decisions were made, enriched with `RENEWABLE_DISPATCH` badges showing solar peak absorption and ToU tariff shifts.

### 3. Secondary Inspection Tabs
- **Station & Grid Hardware**: Live bay status (Idle, Charging, Throttled, Faulted), connector ratings, and event injection tables.
- **Car State & Fleet Cohort**: Roster table with vehicle arrival minutes, departure deadlines, target SoCs, and completion states.
- **History & Run Archive**: Historical log of previous simulation runs for regression tracking.
- **Backend JSON Inspector**: Live in-app JSON inspector displaying raw FastAPI request/response payloads.

---

## 📐 Mathematical Formulation

### 1. Slack Calculation (LSF Scheduling Priority)
For vehicle $i$ at minute $t$, its remaining required energy $E_{\text{rem}, i}(t)$ is:
$$E_{\text{rem}, i}(t) = C_i \cdot \frac{\text{SOC}_{\text{target}, i} - \text{SOC}_i(t)}{100}$$

The minimum theoretical charging duration $T_{\min, i}(t)$ in minutes is:
$$T_{\min, i}(t) = \frac{60 \cdot E_{\text{rem}, i}(t)}{\eta \cdot \min(P_{\text{vehicle}, i}, P_{\text{point}, j})}$$
where $\eta$ is converter efficiency ($0.92$).

The dynamic slack $\text{Slack}_i(t)$ is defined as:
$$\text{Slack}_i(t) = D_i - t - T_{\min, i}(t)$$
where $D_i$ is departure deadline.
* **$\text{Slack}_i(t) < 0$**: Mathematically infeasible request (cannot reach target SOC before departure).
* **Minimal positive slack**: Highest scheduling urgency $\rightarrow$ prioritized for connector allocation and power dispatch.

### 2. Weighted Water-Filling Power Allocation
When total requested power exceeds station available capacity, power is distributed by solving the convex water-filling problem:
$$\max_{\{P_i\}} \sum_{i \in \text{Active}} w_i \cdot \ln(P_i(t)) \quad \text{s.t.} \quad \sum_{i \in \text{Active}} P_i(t) \le P_{\text{station, available}}(t)$$
$$P_{\min, i} \le P_i(t) \le \min(P_{\text{vehicle}, i}, P_{\text{point}, j})$$
where priority weight $w_i = \frac{1}{\max(1, \text{Slack}_i(t))}$.

### 3. Solar PV Generation Model (Bell-Curve Irradiance)
Available on-site solar power at simulation minute $t$ is modeled via solar irradiance geometry:
$$P_{\text{solar}}(t) = P_{\text{peak}} \cdot \max\left(0, \sin\left(\frac{\pi (t - t_{\text{sunrise}})}{t_{\text{sunset}} - t_{\text{sunrise}}}\right)\right)$$
where $t_{\text{sunrise}} = 0$, $t_{\text{sunset}} = 180$, and solar output peaks at midday ($t = 90\text{ min}$).

### 4. Hybrid Energy Balance & Station Capacity
At every discrete minute $t$, total available station power budget expands with renewable generation:
$$P_{\text{available}}(t) = P_{\text{grid\_cap}}(t) + P_{\text{solar}}(t)$$

Energy drawn is partitioned into green (solar) and brown (utility grid):
* **If $P_{\text{allocated}}(t) \le P_{\text{solar}}(t)$**: 100% of charging energy is green. Zero grid cost is incurred.
* **If $P_{\text{allocated}}(t) > P_{\text{solar}}(t)$**: Solar supplies $P_{\text{solar}}(t)$ and grid supplies the difference:
  $$P_{\text{grid}}(t) = P_{\text{allocated}}(t) - P_{\text{solar}}(t)$$
  $$\text{Cost}(t) = P_{\text{grid}}(t) \cdot \frac{\Delta t}{60} \cdot \text{Tariff}(t)$$

### 5. Decarbonization Offset & Environmental Accounting
Cumulative $\text{CO}_2$ emissions avoided by consuming on-site solar power:
$$\text{CO}_{2, \text{avoided}} (\text{kg}) = E_{\text{solar}} (\text{kWh}) \cdot I_{\text{grid}}$$
where grid carbon intensity $I_{\text{grid}} = 0.70\text{ kg CO}_2/\text{kWh}$.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19) |
| **Styling & Theme** | [Tailwind CSS v4](https://tailwindcss.com/) with Cyberpunk Luxury Velvet palette |
| **Typography** | `Plus Jakarta Sans` (UI) and `JetBrains Mono` (Telemetry & Code) |
| **Motion & Charts** | [Framer Motion](https://www.framer.com/motion/), [Recharts](https://recharts.org/), [Lucide React](https://lucide.dev/) |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+), [Pydantic v2](https://docs.pydantic.dev/) |
| **Mathematical Engine** | NumPy, Discrete-Event Numerical Physics Engine |
| **Server & Runner** | [Uvicorn](https://www.uvicorn.org/) ASGI, Multi-process Runner |
| **Testing** | [Pytest](https://pytest.org/) (**50 unit, integration, reproducibility & renewable tests**) |

---

## 📁 Project Architecture

```
gridpilot/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── schemas.py           # Pydantic request & response schemas (Renewable & ESG fields)
│   │   │   └── simulations.py       # REST API endpoints & 4-section CSV export generator
│   │   ├── engine/
│   │   │   ├── allocator.py         # Dynamic weighted water-filling power allocation engine
│   │   │   ├── metrics.py           # Evaluation KPI calculator, ESG accounting & invariant checkers
│   │   │   ├── models.py            # Domain entity definitions (EV, Station, Bay, Tariff)
│   │   │   ├── policies.py          # LSF & FCFS scheduling implementations
│   │   │   ├── renewables.py        # Solar PV irradiance curve & dynamic ToU tariff contracts
│   │   │   ├── runner.py            # Head-to-head comparison runner
│   │   │   ├── scenarios.py         # Benchmark scenario definitions (A, B, C, D, E)
│   │   │   └── simulator.py         # Discrete minute simulation engine with hybrid power budget
│   │   └── main.py                  # FastAPI application entry point with CORS
│   ├── tests/
│   │   ├── test_allocator.py        # Water-filling power allocator tests
│   │   ├── test_api.py              # API endpoint integration tests
│   │   ├── test_models.py           # Data model validation tests
│   │   ├── test_policies.py         # Scheduling policy tests
│   │   ├── test_renewables.py       # Solar curve, ToU split & ESG calculation tests
│   │   ├── test_reproducibility.py  # Deterministic replay & energy conservation tests
│   │   ├── test_runner.py           # Comparison runner tests
│   │   └── test_simulator.py        # Discrete-event engine tests
│   └── requirements.txt             # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── globals.css              # Velvet luxury palette & ambient glow classes
│   │   ├── layout.tsx               # Root layout & Plus Jakarta Sans typography
│   │   └── page.tsx                 # Main orchestrated dashboard workspace
│   ├── components/
│   │   ├── backend-data-views.tsx   # Dedicated Station, Fleet, and JSON views
│   │   ├── dashboard-skeleton.tsx   # Sweeping purple shimmer loading skeleton
│   │   ├── ev-showcase-grid.tsx     # Precision EV telemetry, collision-free Goals, & Map
│   │   ├── event-log.tsx            # Explainability feed with green dispatch badges
│   │   ├── metrics-overview.tsx     # Head-to-head KPI cards & Renewable ESG Bento row
│   │   ├── power-chart.tsx          # Dynamic stacked power curve with Solar PV & ToU tooltip
│   │   ├── providers.tsx            # ThemeProvider & liquid backdrop glows
│   │   ├── sidebar.tsx              # Luxury left sidebar with Apple-grade spring Solar toggle
│   │   └── timeline-view.tsx        # Multi-lane Gantt connector timelines
│   ├── lib/
│   │   ├── api.ts                   # Resilient dual-endpoint API client & CSV export
│   │   ├── types.ts                 # TypeScript interfaces (Renewable metrics & PowerTimeline)
│   │   └── utils.ts                 # Time-series builders, formatters & solar interpolation
│   ├── next.config.ts               # Next.js config & backend proxy rewrites
│   └── package.json
├── pytest.ini                       # Pytest configuration
├── run.py                           # One-Click Unified Launcher (DevOps Automation)
└── README.md                        # Project documentation
```

---

## 🛠️ Manual Setup & Installation Guide

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
   *All **50 test suites** across models, policies, runner, allocator, renewables, API endpoints, and reproducibility invariants will pass.*

4. **Launch the FastAPI backend server**:
   ```bash
   uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
   ```
   *The backend will be live at `http://127.0.0.1:8000`. Verify health at `http://127.0.0.1:8000/health` or view Swagger docs at `http://127.0.0.1:8000/docs`.*

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
| `GET` | `/api/scenarios` | Lists benchmark scenarios (Scenario A, B, C, D, and E) |
| `GET` | `/api/scenarios/{name}` | Returns detailed `StationConfig`, vehicles cohort, solar profile, and dynamic events |
| `POST` | `/api/simulations/compare` | Executes head-to-head simulation comparison between FCFS and LSF with optional `solar_enabled: bool` |
| `POST` | `/api/simulations/export/csv` | Generates downloadable 4-section CSV report (Summary KPIs, Renewable Accounting, Trace, Vehicles) |

---

## 🚦 Benchmark Scenarios

* **Scenario A — High-Density Deadline Stress**: 4 charging points (11kW each), 40kW station. 8 vehicles arriving simultaneously at $t=0$ with tight departure deadlines. Tests queue prioritization.
* **Scenario B — Heterogeneous Fleet**: 4 points. Mix of long-dwell low-power vehicles and short-dwell high-power vehicles arriving staggered. Tests connector turnover.
* **Scenario C — Dynamic Demand Response**: 4 points. Station capacity suddenly drops from 80kW to 30kW at $t=30$m. Tests real-time power scaling and shedding.
* **Scenario D — Hardware Fault & Infeasible Deadlines**: Features an EV with mathematically impossible deadlines ($\text{Slack} < 0$) and a simulated connector hardware failure. Tests graceful degradation.
* **Scenario E — Campus Solar Microgrid (★ NEW / RENEWABLE)**: 4-point station with a **25 kW on-site solar PV array** + 30 kW grid connection and 8 arriving EVs. Demonstrates how GridPilot dynamically schedules charging sessions to absorb peak midday solar power, maximize clean energy fraction, and eliminate expensive peak-grid power purchases.

---

## 🛡️ License

Developed for **Repo Reboot I.Fest '26 — Renewable Energy Intelligence Track**. All rights reserved.
