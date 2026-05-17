# AI Media Analyzer

> A production-grade asynchronous media ingestion and analysis pipeline. Accepts image uploads via file or remote URL, queues them through a Redis-backed BullMQ worker pool, and runs blur detection, brightness analysis, OCR extraction, and MobileNet scene classification — returning structured telemetry to a real-time React dashboard.

---

## Live Deployment

| Service | URL |
|---|---|
| **Frontend** | https://gingermedia.vercel.app |
| **Backend API** | https://gingermedia-backend-cybe.onrender.com |
| **Health Endpoint** | https://gingermedia-backend-cybe.onrender.com/api/health |

> **Note:** The Render backend runs on a free-tier instance and may take ~50s to cold-start after inactivity.

---

## Dashboard Preview

### Telemetry Overview — All Systems Online
![Telemetry Dashboard](./docs/dashboard_telemetry.png)
*Real-time pipeline metrics with live API/DB/Redis/Worker health indicators and processing history.*

### Analysis Intelligence — OCR + Quality Metrics
![OCR Analysis Results](./docs/dashboard_ocr_analysis.png)
*Per-upload telemetry: blur score, brightness analysis, OCR extraction with confidence, SHA-256 duplicate signature, and MobileNet scene classification.*

### Active Job — Queue Pipeline in Progress
![Queue Pipeline Active](./docs/dashboard_queue.png)
*Live pipeline visualizer tracking a job through each processing stage: UPLOADED → QUEUED → WORKER → OCR → ANALYSIS → DUPLICATE → COMPLETED.*

### Failure Simulation — Chaos Engineering
![Failure Simulation](./docs/dashboard_failure.png)
*Organic failure state triggered by unsupported payload types. Worker exceptions cascade cleanly to the DB's `FailureReason` table.*

---

## Technical Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Axios, Lucide React |
| **Backend** | Node.js, Express 5 |
| **Job Queue** | BullMQ 5, ioredis |
| **Message Broker** | Redis (Upstash managed, TLS) |
| **Database** | MySQL + Prisma ORM |
| **ML / Vision** | TensorFlow.js, MobileNet v2 |
| **OCR** | Tesseract.js (LSTM engine) |
| **Image Processing** | Sharp (native bindings) |
| **Deployment** | Render (backend), Vercel (frontend), Railway (MySQL) |

---

## System Architecture

The platform uses a strictly decoupled architecture. The API layer never performs compute — it only persists jobs and returns `202 QUEUED`. All heavy analysis runs asynchronously inside an isolated worker process.

```
Client Upload
    │
    ▼
POST /api/upload
    │
    ├──► Persist Upload record (status: QUEUED) ──► MySQL
    │
    └──► Enqueue job ──► Redis (BullMQ)
                              │
                              ▼
                         Worker Pool (concurrency: 5)
                              │
                    ┌─────────┴──────────┐
                    │   Analysis Engine   │
                    │  ─────────────────  │
                    │  • SHA-256 hashing  │
                    │  • Duplicate check  │
                    │  • Sharp blur scan  │
                    │  • Brightness calc  │
                    │  • Tesseract OCR    │
                    │  • MobileNet scene  │
                    │  • Verdict engine   │
                    └─────────┬──────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
         COMPLETED                         FAILED
              │                               │
    Persist AnalysisResult          Persist FailureReason
              │                               │
              └───────────────┬───────────────┘
                              │
                         MySQL (status: COMPLETED | FAILED)
                              │
                              ▼
                    Frontend polls /api/status/:id
                    Fetches /api/result/:id on completion
```

---

## Queue Architecture Reasoning

### Why BullMQ + Redis?

The core constraint is that image analysis is compute-intensive and non-deterministic in duration. Running inference inside an Express request handler would block the Node.js event loop, killing throughput under concurrent load and triggering client-side timeouts.

BullMQ was selected over alternatives for specific reasons:

**vs. plain async queues (p-queue, bottleneck):** In-process queues die when the Node process restarts. BullMQ persists all job state in Redis — jobs survive crashes, restarts, and deploys without loss.

**vs. RabbitMQ / SQS:** BullMQ requires zero infrastructure beyond Redis. Upstash provides a serverless Redis instance with a free tier and TLS support, making it trivially deployable without managing a message broker cluster.

**vs. Kafka:** Massively over-engineered for this problem space. Kafka's value is at 100k+ events/sec with replay requirements. BullMQ handles this workload with far less operational burden.

### Worker Isolation

Each `Worker` instance gets its **own dedicated ioredis connection**. This is a hard BullMQ requirement — sharing a single connection across the Queue, Worker, and internal BullMQ event listeners causes `ECONNRESET` under Upstash's connection limits. The factory pattern in `config/redis.js` ensures every consumer gets a fresh, independent socket.

```js
// redis.js — factory pattern
function createRedisConnection() {
    return new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        tls: { rejectUnauthorized: false }
    });
}
```

### Retry Handling

BullMQ's default retry behaviour was intentionally left at zero retries for this pipeline. Analysis failures are almost always deterministic (bad format, unsupported codec, corrupted buffer) — retrying would waste compute and pollute the failure log with duplicate `FailureReason` entries. The `throw error` inside the worker handler signals BullMQ to mark the job `failed` cleanly.

### Scalability Path

The current single-worker deployment can scale horizontally without any code changes:

1. Add more Render worker services pointing at the same Redis instance
2. BullMQ's distributed locking ensures each job is consumed by exactly one worker
3. The `concurrency: 5` setting per worker allows 5 parallel jobs per process

For GPU-bound inference at scale, the MobileNet/Tesseract logic would be extracted into a Python FastAPI sidecar communicating over gRPC, with the Node worker acting only as an orchestrator.

### Operational Resilience

- **Job persistence:** All queue state lives in Redis. If the worker crashes mid-job, BullMQ marks it `stalled` and re-queues automatically.
- **Graceful degradation:** If Redis is temporarily unavailable, the API still serves reads from MySQL. New uploads fail fast with a clear error rather than hanging indefinitely.
- **Isolated failure accounting:** Every exception inside the worker creates a `FailureReason` record linked to the Upload ID before re-throwing, ensuring the frontend always has a failure narrative to display.

---

## Production Observability

The `/api/health` endpoint provides real infrastructure telemetry, not synthetic status flags.

```http
GET /api/health
```

```json
{
  "api": "online",
  "db": "online",
  "redis": "online",
  "worker": "online",
  "queue": "ready",
  "metrics": {
    "queueSize": 0,
    "activeJobs": 0
  }
}
```

Each check is fully isolated with independent timeouts:

| Check | Method | Timeout |
|---|---|---|
| **Redis** | `PING` round-trip via dedicated `healthConnection` | 2s |
| **Database** | `prisma.$queryRaw\`SELECT 1\`` | 3s |
| **Worker** | `imageQueue.getWaitingCount()` + `getActiveCount()` | 2s |

A failure in any single check returns `"offline"` for that service only — it does not cascade or return a 500. The frontend polls this endpoint every 5 seconds and updates each indicator independently, so a transient Redis hiccup shows as `REDIS: offline` without affecting the DB or Worker indicators.

The `healthConnection` is a permanently allocated ioredis client kept separate from the BullMQ pool, ensuring health checks are never blocked by worker-pool activity.

---

## API Reference

### `POST /api/upload`
Ingest a file payload.

```
Content-Type: multipart/form-data
Body: image (binary)
```

```json
{ "status": "success", "data": { "id": "abc-123", "status": "QUEUED" } }
```

### `POST /api/upload-url`
Ingest a remote image URL. Fetches, validates content-type, and saves locally.

```json
{ "url": "https://example.com/photo.jpg" }
```

### `GET /api/status/:id`
Poll job status. Frontend polls this at 2s intervals until `COMPLETED` or `FAILED`.

```json
{ "status": "success", "data": { "status": "PROCESSING" } }
```

### `GET /api/result/:id`
Fetch full analysis telemetry after completion.

```json
{
  "status": "success",
  "data": {
    "blurScore": 12.4,
    "blurDescription": "Fine details and structural boundaries are sharply preserved.",
    "brightnessValue": 130.5,
    "brightnessDescription": "Exposure levels appear stable with no major dark-region clipping.",
    "ocrText": "MH12 DE 1433",
    "ocrConfidence": 0.92,
    "systemConfidence": 0.94,
    "isDuplicate": false,
    "overallVerdict": "HIGH_CONFIDENCE_READABLE",
    "detectedCategory": "Vehicle / Transportation"
  }
}
```

### `GET /api/analytics`
Aggregate counts and average confidence across all uploads.

### `GET /api/recent`
Last 10 uploads with analysis results and failure reasons, ordered by `createdAt DESC`.

### `DELETE /api/result/:id`
Delete an upload record and its associated physical file. Cascades to `AnalysisResult` and `FailureReason`.

---

## Failure Handling

Worker validation is strict and intentional. Unsupported payloads fail fast inside the isolated worker process — never inside the API controller.

| Trigger | Error Code | Mechanism |
|---|---|---|
| `.txt` / `.zip` uploads | `INVALID_IMAGE_FORMAT` | MIME type + extension check |
| Filename contains `corrupt` | `OCR_PIPELINE_ERROR` | Simulated Tesseract engine crash |
| Remote URL timeout / 4xx | `REMOTE_FETCH_TIMEOUT` | `AbortSignal.timeout(8000)` |
| Stalled BullMQ jobs | Auto re-queue or `FAILED` | BullMQ stall detection |

All failures write a `FailureReason` record before re-throwing, ensuring the dashboard always surfaces the specific failure message rather than a generic error state.

---

## Engineering Trade-offs

**Local filesystem storage (`/uploads`):** Chosen to avoid S3 setup overhead for this deployment. The implication is that uploaded files are ephemeral on Render's free tier (ephemeral disk). A production build would use S3 or GCS with pre-signed URLs.

**SHA-256 vs. perceptual hashing:** Exact hash matching detects bitwise duplicates only. Near-duplicate or visually similar images with different compression artifacts would not be flagged. A production system would use pHash or a vector similarity search (pgvector) for fuzzy matching.

**In-process ML inference:** Running MobileNet inside the Node.js worker is adequate for low-throughput validation but does not scale to high concurrency. A dedicated Python inference service (FastAPI + PyTorch) behind an internal gRPC endpoint is the correct architecture beyond ~50 req/min.

**2-second frontend polling:** The status polling interval is aggressive for a free-tier backend but acceptable for a demonstration. SSE or WebSockets would eliminate polling overhead in a production build.

---

## Future Improvements

1. **WebSocket / SSE:** Replace polling with push-based status updates for instant UI mutations without network overhead.
2. **GPU Inference Sidecar:** Extract TensorFlow.js logic into a Python/FastAPI microservice with CUDA support for 10-100× throughput improvement.
3. **Distributed Workers:** Horizontally scale the worker pool by deploying additional Render background services — no code changes required, BullMQ handles distributed locking.
4. **Observability Stack:** Integrate Prometheus metrics + Grafana dashboards for deep queue-depth, job-duration, and worker-saturation visibility.
5. **EXIF Tampering Detection:** Implement Error Level Analysis (ELA) and EXIF anomaly validation to flag manipulated or AI-generated documents.
6. **Cloud Storage:** Migrate `/uploads` to S3 with pre-signed URLs for persistent, stateless object storage across horizontal deployments.

---

## Local Setup

### Requirements
- Node.js v18+
- Redis (local or [Upstash free tier](https://upstash.com))
- MySQL

### Environment Variables

**`/backend/.env`**
```env
DATABASE_URL="mysql://user:pass@localhost:3306/mediapipeline"
REDIS_URL="redis://localhost:6379"
FRONTEND_URL="http://localhost:5173"
PORT=3000
```

**`/frontend/.env.local`**
```env
VITE_API_URL=http://localhost:3000
```

### Start

```bash
# Backend
cd backend
npm install
npx prisma db push
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Backend runs at `http://localhost:3000`, frontend at `http://localhost:5173`.

---

*Built with Node.js, BullMQ, Prisma, TensorFlow.js, Tesseract.js, React, and Vite.*
