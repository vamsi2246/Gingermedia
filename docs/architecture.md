# Intelligent Media Processing Architecture

## Flow
1. User uploads through Vanilla JS frontend.
2. Express Backend saves file and enqueues BullMQ job.
3. Redis-backed Worker pulls job and runs Sharp/Tesseract.
4. Results stored in MySQL via Prisma.

## Async Design
- Jobs are distributed across workers.
- Redis ensures persistence and visibility.
- Horizontal scaling supported by adding more worker containers.
