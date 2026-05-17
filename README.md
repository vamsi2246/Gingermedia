# Intelligent Media Processing Pipeline

A production-grade, highly scalable asynchronous media ingestion and analysis system built with Node.js, React, and BullMQ. This system leverages local AI models (MobileNet) and image heuristics (Sharp, Tesseract) to perform context-aware quality validation and semantic analysis on uploaded media.

## Key Features

- **Asynchronous Worker Pool**: Non-blocking ingestion using Redis-backed BullMQ workers to process heavy OCR and machine learning tasks in isolation.
- **Hybrid "Verdict Engine"**: Context-aware quality scoring that dynamically adjusts thresholds based on semantic scene detection (e.g., ignoring OCR failures for portraits, prioritizing them for documents).
- **Intelligent Telemetry Dashboard**: A real-time React dashboard visualizing pipeline progression, confidence scores, and system health without blocking the UI thread.
- **Chaos-Tested Failure Simulation**: Native, organic failure handling for corrupted buffers, unsupported archives, and remote ingestion timeouts.
- **Duplicate Signaturing**: Cryptographic hashing (SHA-256) to detect and flag identical media payloads.
- **Dynamic NLP Output Generation**: Synthesizes human-readable optical degradation descriptions based on composite scoring logic.

## System Architecture

The platform uses a strict, decoupled architecture to guarantee responsiveness even during compute-heavy deep-learning inference tasks.

```mermaid
graph TD
    A[Client Upload] -->|POST /api/upload| B(API Gateway)
    B -->|Persist PENDING| C[(PostgreSQL/MySQL)]
    B -->|Enqueue Job| D[Redis BullMQ]
    D -->|Consume| E[Worker Pool]
    E -->|MobileNet/OCR/Sharp| F{Analysis Engine}
    F -->|Success| G[Persist COMPLETED]
    F -->|Failure| H[Persist FAILED + Reason]
    G --> C
    H --> C
    C -->|Long Polling / Fetch| I[Telemetry Dashboard]
```

## API Documentation

### 1. Ingest Media Payload
`POST /api/upload`

**Request:**
```text
// FormData
// image: (Binary File)
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "abc-123",
    "status": "QUEUED"
  }
}
```

### 2. Ingest Remote URL
`POST /api/upload-url`

**Request:**
```json
{
  "url": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "def-456",
    "status": "QUEUED"
  }
}
```

### 3. Check Job Status
`GET /api/status/:id`

**Response:**
```json
{
  "status": "success",
  "data": {
    "status": "PROCESSING" // or PENDING, QUEUED, COMPLETED, FAILED
  }
}
```

### 4. Fetch Analysis Telemetry
`GET /api/result/:id`

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "result-123",
    "blurScore": 12.4,
    "blurDescription": "Fine details and structural boundaries are sharply preserved with minimal degradation.",
    "brightnessValue": 130.5,
    "brightnessDescription": "Exposure levels appear stable with no major dark-region clipping.",
    "ocrText": "MH12 DE 1433",
    "ocrConfidence": 0.92,
    "systemConfidence": 0.94,
    "isDuplicate": false,
    "patternValid": true,
    "overallVerdict": "VEHICLE_IDENTIFIABLE",
    "detectedCategory": "Vehicle / Transportation"
  }
}
```

## Failure Handling (Chaos Engineering)

To demonstrate mature backend resilience, the queue deliberately enforces strict validation rules to organically populate failure states (`FAILED`). 

- **Corrupted Payloads**: Any `.txt`, `.zip`, or maliciously renamed buffers ingested will immediately throw `INVALID_IMAGE_FORMAT` within the isolated worker process.
- **Remote Ingestion Handling**: Simulates timeouts or HTTP 404s when fetching remote URLs, cleanly recording `REMOTE_FETCH_TIMEOUT`.
- **OCR Pipeline Exceptions**: Catching simulated crashes during text region alignment (`OCR_PIPELINE_ERROR`).
- **Worker Timeouts**: BullMQ elegantly handles stalling jobs and triggers retry/failure hooks.

All failures accurately cascade to the database, populating a dedicated `FailureReason` table mapped to the specific Upload ID.

## AI Validation Workflow & Engineering Approach

This project heavily utilized AI-assisted engineering (via deep pair-programming paradigms). However, the architecture, trade-offs, and final implementations were strictly guided and manually validated by human engineering intuition.

- **Strategic AI Usage**: AI was primarily utilized for rapid layout scaffolding, UI micro-animations, and boilerplate API controllers, enabling intense focus on backend architecture and state-machine transitions.
- **Manual Validation & Rejection**: The heuristic optical algorithms (blending OCR confidence and blur-radius) were manually tuned using real-world testing. Unstable AI-generated logic (e.g., naive numeric thresholding like `if blur > 50 return FAILED`) was specifically rejected and replaced with the advanced Semantic "Verdict Engine" designed entirely via human understanding of machine vision limitations.
- **System Design Decisions**: The shift from synchronous Express controllers to a Redis/BullMQ worker queue was an intentional human design decision to guarantee scale and prevent process blocking.

## Engineering Trade-offs

Building a production-grade pipeline within a localized environment requires specific constraints:

- **Local File System Storage**: Payloads are stored locally (`/uploads`) rather than AWS S3. This simplifies local deployment but severely limits horizontal scaling and stateless containerization.
- **Database Indexing**: Cryptographic SHA-256 signatures are used for duplicate detection. While efficient, a scalable production app would use perceptual hashing (e.g., pHash) combined with vector embeddings (e.g., pgvector) for fuzzy duplicate matching.
- **Local Deep Learning**: Running `@tensorflow-models/mobilenet` directly in the Node.js process is compute-intensive. In a massive scale environment, inference should be separated into dedicated GPU Python microservices (e.g., FastAPI/PyTorch) communicating over gRPC.

## Future Improvements

1. **Distributed Workers**: Splitting the frontend, API gateway, and worker pool into distinct Docker clusters.
2. **GPU Inference Services**: Migrating TensorFlow.js logic to a dedicated Python backend using PyTorch/TensorRT for massive throughput.
3. **Observability**: Integrating Datadog or Prometheus/Grafana for deep worker-pool queue metrics.
4. **WebSocket/SSE Real-time Updates**: Replacing the aggressive 2-second frontend polling interval with Server-Sent Events (SSE) or WebSockets for instant UI mutations.
5. **Advanced Tampering Detection**: Implementing EXIF anomaly validation and error-level analysis (ELA) to detect photoshopped documents.
6. **Cloud Storage Integration**: Migrating from local `/uploads` directory to AWS S3 / Google Cloud Storage for persistent, scalable object storage.

## Production Deployment

This architecture is designed to be easily portable to managed cloud services:

1. **Frontend (React)**: Deployable via Vercel or Netlify.
2. **API Backend (Node.js)**: Deployable via Render Web Services or AWS Elastic Beanstalk.
3. **Worker Pool (Node.js)**: Deployable as Background Workers on Render or AWS ECS.
4. **Database**: Managed PostgreSQL (e.g., Supabase, Neon, AWS RDS).
5. **Message Broker**: Managed Redis (e.g., Upstash, AWS ElastiCache) for BullMQ state.

## Local Setup

### 1. Requirements
- Node.js v18+
- Redis Server (Port 6379)
- MySQL / PostgreSQL

### 2. Environment Variables
Create a `.env` inside `/backend`:
```env
DATABASE_URL="mysql://user:pass@localhost:3306/mediapipeline"
REDIS_URL="redis://localhost:6379"
PORT=3000
```

### 3. Quick Start

**Backend Engine:**
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

**Frontend Dashboard:**
```bash
cd frontend
npm install
npm run dev
```

---
*Built as a demonstration of scalable async processing, realistic telemetry handling, and AI-assisted system design.*
