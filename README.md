# AI Media Analyzer Pipeline

A production-grade, highly scalable asynchronous media ingestion and analysis system built with Node.js, React, and BullMQ. This system leverages local AI models (MobileNet) and image heuristics (Sharp, Tesseract) to perform context-aware quality validation and semantic analysis on uploaded media.

## Architecture Overview

The platform uses a decoupled worker-pool architecture to guarantee responsiveness even during compute-heavy OCR and deep-learning inference tasks. 

1. **Client / Gateway Layer**: A React dashboard provides real-time asynchronous polling, visualizing the pipeline progression dynamically without blocking the UI thread.
2. **API & Ingestion Service**: An Express server handles binary payloads and remote URL buffers, aggressively validating MIME types before persisting tasks to a Redis-backed queue.
3. **Async Worker Pool**: BullMQ manages background concurrency. Workers process tasks in isolation, persisting intermediate crashes and telemetry gracefully.
4. **Data Persistence**: Prisma ORM manages relational integrity across PostgreSQL/MySQL, capturing complex telemetry models including hash-based duplication signatures and granular heuristic values.

### The "Verdict Engine" (AI + Heuristics)

The system avoids hardcoded, naive thresholds (e.g. `IF blur > 50 THEN fail`). Instead, it uses a **Hybrid Analysis Strategy**:

1. **Semantic Scene Understanding**: TensorFlow.js / MobileNet analyzes the raw buffer to detect the primary subject (e.g., Document, Vehicle, Landscape).
2. **Context-Aware Weighting**: The weighting of Heuristic inputs (OCR confidence vs Edge Sharpness vs Luminance) dynamically shifts based on the Semantic context. For example: OCR readability dominates "Document" scoring, whereas it is ignored for "Portrait" scoring.
3. **Dynamic Natural Language Generation**: Based on the composited scores, the system synthesizes intelligent, human-readable observations outlining exact optical degradations rather than emitting static error constants.

## Failure Simulation & Chaos Engineering

To demonstrate mature backend resilience, the queue deliberately enforces strict validation rules to natively populate failure states (`FAILED`). 
- **Remote Ingestion Handling**: Simulates timeouts or 404s when fetching invalid remote URLs, cleanly recording `REMOTE_FETCH_TIMEOUT`.
- **Corrupted Payloads**: Any `.txt`, `.zip`, or maliciously renamed buffers ingested will immediately throw `INVALID_IMAGE_FORMAT` within the isolated worker process, preventing main thread crashes and marking the DB row appropriately.

This ensures the analytics dashboard reflects **true operational reality**, calculating Success Rates algorithmically rather than relying on an artificial "always 100%" mock.

## AI Usage Disclosure & Engineering Approach

This project heavily utilized AI-assisted engineering (via deep pair-programming paradigms). However, the architecture, trade-offs, and final implementations were strictly guided and manually validated by human engineering intuition.

- **Boilerplate & CSS**: AI was primarily utilized for rapid layout scaffolding, Tailwind composition, and micro-animations, enabling focus on backend architecture.
- **System Design Decisions**: The shift from synchronous Express controllers to a Redis/BullMQ worker queue was an intentional human design decision to guarantee scale. AI was utilized to draft the worker syntax, but the state-machine transitions and error boundaries were manually authored.
- **Heuristic Algorithms**: The mathematical blending of OCR confidence and blur-radius was manually tuned using real-world testing. The idea to pivot from simple `true/false` thresholds to the advanced Semantic "Verdict Engine" was a critical engineering pivot made to solve the "naive rule" problem, guided by human understanding of machine vision limitations.

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

## System Components & Tools

- **Backend**: Node.js, Express, Prisma, BullMQ, ioredis
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, Axios
- **ML / Vision**: `@tensorflow/tfjs-node`, `@tensorflow-models/mobilenet`, `tesseract.js`, `sharp`

---
*Built as a demonstration of scalable async processing and AI-assisted system design.*
