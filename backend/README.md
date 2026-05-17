# Intelligent Media Processing Backend

A scalable, production-grade Node.js backend for asynchronous media analysis. This system is designed to ingest large volumes of media and process them using a distributed worker architecture.

## 🏗️ Architecture Design
The backend follows a strict **Clean Architecture** pattern, ensuring a total separation of concerns:

- **Controllers**: Handle HTTP-specific logic (requests, responses, and status codes).
- **Services**: The heart of the application. Each processing concern (Blur, OCR, Brightness, Duplicates) is isolated into its own service for easy testing and horizontal scalability.
- **Workers**: Independent threads that consume jobs from the Redis queue.
- **Queues**: Powered by **BullMQ** to ensure job persistence, retries, and concurrency management.
- **Middleware**: Standardized layers for security (Helmet, Rate Limiting), validation, and centralized error handling.

## 🛠️ Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL with Prisma ORM
- **Async Queue**: BullMQ (Redis-backed)
- **Image Intelligence**: Sharp (High-performance C++ bindings)
- **OCR Engine**: Tesseract.js
- **Documentation**: Swagger/OpenAPI 3.0

## 🚦 Processing Pipeline Flow
1. **Ingestion**: `POST /api/upload` accepts the image, saves it to `uploads/`, and creates a `PENDING` DB record.
2. **Queuing**: The job is enqueued in Redis with an exponential backoff retry strategy.
3. **Execution**: A background worker picks up the job and executes the parallel analysis suite (Blur detection, OCR, etc.).
4. **Finalization**: Results are committed to MySQL in a single transaction, and the upload is marked as `COMPLETED`.

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8.0
- Redis

### Installation
```bash
npm install
npx prisma generate
npx prisma db push
```

### Running the App
- **API Server**: `npm run dev`
- **Background Worker**: `npm run worker`

## 🛡️ Engineering Decisions
- **Async over Sync**: Media processing is CPU-bound. Offloading to workers prevents the event loop from blocking.
- **Perceptual Hashing**: Chosen over cryptographic hashes (MD5) to allow for "fuzzy" duplicate detection (e.g., same image with different compression).
- **Prisma Transactions**: Ensures data integrity by committing analysis results and status updates atomically.

---
*Developed as a high-quality engineering assignment submission.*
