# The Deep Dive 🌊

An immersive, scroll-driven ocean descent experience exploring the depths from the sunlit surface to the 6,000-meter abyssal trenches.

Built with **Vite + Vanilla JS**, **GSAP ScrollTrigger**, **Lenis**, and **NestJS (TypeScript) with SQLite**, fully containerised with **Docker Compose** and **Kubernetes**.

---

## 📸 Key Features

- **High-Performance Frame Scrubbing**: Single full-screen canvas mapped to 525 1280×720 JPEG frames across an 8-screen timeline (`800vh`), redrawn only when the frame index changes.
- **Sliding-Window Memory Cache**:
  - Preloads the initial 90 frames behind an animated sonar loader.
  - Dynamically retains only $\pm 60$ frames on desktop (and $\pm 25$ frames on mobile with a step of 2) in memory.
  - Evicts out-of-range frames to keep memory footprints low and avoid browser tab crashes.
  - Prioritizes background fetching around the active scroll position if the user scrubs ahead rapidly.
- **Depth & Zone Interpolation**:
  - `Frame 1` = `0 m` (Sunlight / Epipelagic Zone)
  - `Frame 144` = `200 m` (Sunlight boundary)
  - `Frame 287` = `1,000 m` (Twilight / Mesopelagic boundary)
  - `Frame 430` = `4,000 m` (Midnight / Bathypelagic boundary)
  - `Frame 525` = `6,000 m` (Abyss / Challenger trench floor)
- **Live Dive Computer Telemetry**:
  - Vertical gauge with animated cursor and progress track.
  - Digital readout (`meters` and `feet`), hydrostatic pressure (`atm`), and ocean temperature (`°C`).
  - Text transition and subtle screen shake when entering new depth zones.
- **Narrative Creature Cards**:
  - Green Sea Turtle (*Chelonia mydas*) in Sunlight.
  - Bioluminescent Comb Jelly (*Ctenophora & Atolla*) in Twilight.
  - Deep Sea Anglerfish (*Melanocetus johnsonii*) in Midnight.
  - Pelican Gulper Eel (*Eurypharynx pelecanoides*) in Abyss.
  - 6,000 m Challenger Trench treasure achievement and expedition logger.
- **Global Explorer Logbook (NestJS + SQLite)**:
  - Submit your name and maximum depth reached.
  - Real-time leaderboard modal displaying top 10 descents.
  - Input validation, IP rate-limiting, and CORS protection.
- **Accessibility**: Full `prefers-reduced-motion` compliance.

---

## 📂 Repository Structure

```text
deepdive/
├── .dockerignore               # Docker build exclusions
├── .env.example                # Frontend environment template
├── .gitignore                  # Git exclusions (dependencies, db, secrets)
├── Dockerfile                  # Multi-stage client Dockerfile (Nginx)
├── docker-compose.yml          # Container orchestration (client + server)
├── index.html                  # Main application markup & HUD
├── nginx.conf                  # Nginx configuration with /scores proxy
├── package.json                # Frontend package configuration
├── vite.config.js              # Vite bundler & dev proxy config
├── k8s/                        # Kubernetes deployment & service manifests
│   ├── backend.yaml            # Backend deployment, PVC, service
│   └── frontend.yaml           # Frontend deployment, service
├── public/
│   └── frames/
│       └── deep/               # 525 1280x720 JPEG frames (deep_0001.jpg - deep_0525.jpg)
├── server/                     # NestJS TypeScript backend
│   ├── .env.example            # Backend environment template
│   ├── Dockerfile              # Backend multi-stage Dockerfile
│   ├── package.json            # Server dependencies (NestJS, SQLite)
│   ├── tsconfig.json           # TypeScript configuration
│   └── src/
│       ├── main.ts             # Server entry point & CORS
│       ├── app.module.ts       # Module registration & rate-limiting
│       ├── database.service.ts # SQLite connection & schema initialization
│       └── scores/             # Scores controller, service, and DTOs
└── src/                        # Frontend source code
    ├── api.js                  # Score submission & leaderboard client
    ├── config.js               # Depth anchors, zones, creature facts
    ├── frameLoader.js          # Sliding-window memory management
    ├── main.js                 # Lenis scroll, GSAP ScrollTrigger, HUD
    └── style.css               # Design system & responsive styles
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 20+ (Node 22 recommended)
- **npm** 10+
- (Optional) **Docker & Docker Compose** for containerized deployment

---

### Local Development

#### 1. Start the NestJS Backend
```bash
cd server
npm install
npm run start:dev
```
The backend will listen on `http://localhost:3000`.

#### 2. Start the Frontend Client
In a separate terminal at the project root:
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. API requests to `/scores` are automatically proxied to the backend on port 3000.

---

### 🐳 Running with Docker Compose

Build and launch both client and server containers with one command:

```bash
docker compose up --build
```

- **Frontend Application**: `http://localhost:8080`
- **Backend API**: `http://localhost:3000/scores`
- SQLite database is persisted in a named Docker volume (`server-data`).

To stop the containers:
```bash
docker compose down
```

---

### ☸️ Deploying to Kubernetes

Deploy the manifests in `k8s/`:

```bash
# 1. Deploy Backend (Namespace, PVC, Deployment, Service)
kubectl apply -f k8s/backend.yaml

# 2. Deploy Frontend (Deployment, LoadBalancer Service)
kubectl apply -f k8s/frontend.yaml

# 3. Check deployment status
kubectl get pods,svc -n deepdive
```

Access the frontend via NodePort `30080` or your cluster's LoadBalancer external IP.

---

## 📡 API Reference

### `GET /scores`
Returns the top 10 deepest descents.

**Query Parameters:**
- `limit` *(optional, number, default: 10, max: 50)*

**Sample Response:**
```json
[
  {
    "id": 1,
    "name": "Victor Vescovo",
    "maxDepth": 6000,
    "createdAt": "2026-10-14 01:14:23"
  },
  {
    "id": 2,
    "name": "Don Walsh",
    "maxDepth": 5920,
    "createdAt": "2026-10-14 01:14:23"
  }
]
```

### `POST /scores`
Records a diver's expedition.

**Validation Rules:**
- `name`: String, 1–20 characters, required.
- `maxDepth`: Number, 0–6000 m, required.

**Sample Request:**
```json
{
  "name": "Challenger Pilot",
  "maxDepth": 6000
}
```

**Sample Response:**
```json
{
  "id": 9,
  "name": "Challenger Pilot",
  "maxDepth": 6000,
  "createdAt": "2026-10-14 02:22:15"
}
```

---

## 🛡️ Git Hygiene & Security

Sensitive files and local artifacts are strictly ignored via `.gitignore`:
- `node_modules/` (dependencies)
- `.env*` (secrets, API keys)
- `data/` and `*.sqlite*` (local database files)
- `dist/` and `build/` (generated bundles)
- `*.log` (temporary logs)

---

## 📜 License
MIT License.
