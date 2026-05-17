# Intelligent Media Processing Pipeline

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Architecture](https://img.shields.io/badge/architecture-Microservices--Ready-green)
![Queue](https://img.shields.io/badge/queue-BullMQ-red)

A state-of-the-art asynchronous media processing engine designed for scale and reliability. Built with a modular, "clean" architecture, this project demonstrates professional-grade backend engineering principles.

## 📂 Project Structure
```text
intelligent-media-processing-pipeline/
├── frontend/             # Vanilla JS Dashboard (Independent)
├── backend/              # Node.js API & Workers (Independent)
├── docs/                 # Engineering documentation & Flowcharts
└── README.md             # Project Root Overview
```

## 🚀 Key Engineering Features
- **Decoupled Architecture**: Frontend and Backend are strictly independent, allowing for separate scaling and deployment.
- **Asynchronous Processing**: Uses Redis-backed BullMQ for robust job management.
- **Deep Media Intelligence**: Parallel execution of OCR, Blur detection, Brightness analysis, and Duplicate detection.
- **Production-Ready**: Includes Docker orchestration, centralized logging, and exhaustive error handling.

## 🛠️ Quick Start (Docker)
The entire stack can be launched using Docker Compose. Ensure you have Docker installed.

```bash
cd backend
docker-compose up --build
```
- **Dashboard**: Open `frontend/src/index.html`
- **API Documentation**: `http://localhost:3000/api-docs`

## 📖 Documentation
- [Architecture Details](./docs/architecture.md)
- [API Design & Flow](./docs/api-flow.md)
- [Backend Deep Dive](./backend/README.md)
- [Frontend Modularization](./frontend/README.md)

## ⚖️ AI Usage Disclosure
This project utilized AI tools (Claude 3.5 Sonnet / Gemini) for scaffolding boilerplate code and researching specific image analysis algorithms (Laplacian variance). However, all architectural decisions, service separation, and async flow orchestration were manually designed and validated to meet production standards.

---
*This repository is part of a Backend + AI Engineering Take-Home Assignment.*
