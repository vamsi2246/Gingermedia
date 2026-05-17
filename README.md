# Intelligent Media Processing Pipeline

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Architecture](https://img.shields.io/badge/architecture-Microservices--Ready-green)
![React](https://img.shields.io/badge/frontend-React%20%7C%20Vite-61DAFB)
![Backend](https://img.shields.io/badge/backend-Express%20%7C%20BullMQ-339933)

A state-of-the-art asynchronous media processing engine designed for scale and reliability. Rebuilt from the ground up to showcase a complete decoupling of React frontend and Node.js backend. This project demonstrates professional-grade engineering principles including job queues, asynchronous workers, and comprehensive status polling.

---

## 🏛️ System Architecture

This application employs a strict separation of concerns, ensuring maximum scalability.

### Frontend Architecture
The frontend is a **React Single Page Application (SPA)** built with **Vite** and styled using **Tailwind CSS**. 
- **Premium Dashboard Interface**: Uses glassmorphism and modern dark themes typical of observability platforms like Vercel and Stripe.
- **Component-Driven**: Modular structure with `UploadZone`, `PipelineVisualizer`, `MetricCard`, and `SystemHealth`.
- **Status Polling**: The frontend implements intelligent long-polling to track BullMQ job progress in real-time without overwhelming the server.

### Backend Architecture
The backend is an **Express.js API** relying on **Prisma ORM (MySQL)** for state persistence and **BullMQ (Redis)** for queueing.
- **Decoupled Workers**: High-intensity tasks (OCR, Sharp image analysis) are pushed to an independent BullMQ worker thread, ensuring the Express event loop remains completely unblocked.
- **Microservice Ready**: The worker and the API could easily be deployed into separate Docker containers pointing to the same Redis instance.

---

## ⚙️ Asynchronous Processing & Queues

When an image is uploaded via `POST /api/upload`:
1. **Ingestion**: Express accepts the multi-part form data via `multer` and saves the file locally.
2. **Database Record**: Prisma inserts an `Upload` record marked as `QUEUED`.
3. **Queueing**: A job containing the file path and database ID is dispatched to `BullMQ`. Express immediately returns a `202 Accepted` response.
4. **Worker Execution**: The BullMQ worker picks up the job. It utilizes **Tesseract.js** for OCR and **Sharp** for brightness/blur detection.
5. **Finalization**: Results are appended into the MySQL `AnalysisResult` table, and the status flips to `COMPLETED` or `FAILED`.

---

## 🛠️ Setup Instructions

### 1. Docker Setup (Recommended)
You can run the required databases easily using Docker.
```bash
docker-compose up -d
```
*This spins up MySQL 8 and Redis 7 on ports 3306 and 6379 respectively.*

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npx prisma generate
npm run dev
```
*The backend will start on `http://localhost:3000`.*

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The React dashboard will start on `http://localhost:5173`.*

---

## 📖 API Documentation

### `POST /api/upload`
Uploads an image for processing.
- **Body**: `multipart/form-data` with `image` field.
- **Returns**: `{ "status": "success", "data": { "id": "uuid", "status": "QUEUED" } }`

### `GET /api/status/:id`
Polls the processing status of a job.
- **Returns**: `{ "status": "success", "data": { "status": "PROCESSING" } }`

### `GET /api/result/:id`
Retrieves the completed analysis data.
- **Returns**: `{ "status": "success", "data": { "blurScore": 45.2, "ocrText": "...", "overallVerdict": "ACCEPTABLE" } }`

---

## 🧠 Trade-Offs & Decisions

1. **Multer Disk Storage vs Cloud (S3)**: For demonstration purposes, images are saved to the local disk. In a production environment, `multer-s3` would be used to stream buffers directly to an AWS bucket to ensure horizontal scalability across multiple backend pods.
2. **Long Polling vs WebSockets**: The React app currently polls `GET /api/status` every 1.5 seconds. For higher efficiency at scale, this should be upgraded to `Socket.io` or Server-Sent Events (SSE) to push status updates from the BullMQ event listeners to the client.

## 🚀 Scalability & Future Enhancements

- **Containerization of Workers**: The `imageWorker.js` currently boots alongside the Express server. It should be extracted to its own `Dockerfile` so worker nodes can be scaled horizontally independent of the API layer.
- **Cloud Database Migrations**: Move MySQL and Redis to managed instances (e.g., AWS RDS & ElastiCache) to prevent single points of failure.
- **Perceptual Hashing (pHash)**: Replace the simplistic `sha256` exact-match duplicate detection with perceptual hashing to find visually similar but not byte-identical images.

---

## ⚖️ AI Usage Disclosure

This project was rebuilt using AI assistance to rapidly scaffold boilerplate (Vite/React configurations, Prisma schema generation) and implement the Tailwind UI components. However, all core architectural decisions—such as the decoupling of the frontend and backend, the strict usage of BullMQ for async offloading, and the schema relational designs—were meticulously engineered to meet production-ready backend standards.
