# Intelligent Media Processing Dashboard

A high-performance, modularized Vanilla JavaScript frontend for the Media Processing Pipeline. This dashboard provides a professional interface for uploading media and monitoring asynchronous processing results in real-time.

## 🎨 Design Philosophy
- **Minimalist Engineering Aesthetic**: Clean lines, professional color palette, and high information density without clutter.
- **Responsive Layout**: Fully functional across desktop, tablet, and mobile devices.
- **Zero Framework Dependency**: Built with pure Vanilla JS to demonstrate core web API mastery (Fetch, FileReader, Drag & Drop).

## 📂 Modular Architecture
The frontend is decoupled into distinct modules for maximum maintainability:

- **`js/api.js`**: Centralized API communication layer. Handles all `fetch` requests to the backend.
- **`js/upload.js`**: Logic for managing the file upload lifecycle and state transitions.
- **`js/status.js`**: Implementation of the polling strategy for real-time status updates from the async pipeline.
- **`js/ui.js`**: Main DOM orchestration layer that connects the logic to the visual components.

## 🚀 Key Features
- **Smart Drag & Drop**: Visual feedback during drag events and immediate image preview.
- **Async Polling**: Long-polling mechanism that monitors the job state (`PENDING` -> `PROCESSING` -> `COMPLETED`).
- **Rich Results Visualization**: Detailed breakdown of blur scores, OCR confidence, and duplicate detection.
- **Operational Error Handling**: Clear visual feedback for network failures or processing errors.

## 🛠️ Setup & Usage
1. Ensure the Backend is running on `http://localhost:3000`.
2. Open `src/index.html` in any modern browser.
3. Drag an image into the upload zone or click to browse.
4. Click **"Start Analysis"** and watch the real-time processing updates.

---
*Part of the Intelligent Media Processing Pipeline Engineering Assignment.*
