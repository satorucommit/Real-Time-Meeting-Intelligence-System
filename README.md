# Real-Time Meeting Intelligence System

An ultra-low latency, edge-AI powered web application that records meetings, transcribes audio in real-time, and generates intelligent insights (summaries, action items, key decisions, topics) live during the meeting.

![Meeting Intelligence](https://via.placeholder.com/1200x600/0f172a/6366f1?text=Meeting+Intelligence+System)

## 🏗 Architecture

The system uses a highly decoupled, real-time architecture:

```mermaid
graph TD
    Client[Qwik Frontend] -->|1. Audio Chunks (WebM)| API(/api/transcribe)
    API -->|2. Buffer| Ollama[Ollama Local AI]
    Ollama -->|3. Whisper Transcript| API
    API -->|4. Store| DB[(SQLite / In-Memory)]
    API -->|5. SSE Event| SSEStream(/api/stream)
    SSEStream -.->|6. Live Transcript| Client
    
    Client -->|7. Trigger Analysis| Analyze(/api/analyze)
    Analyze -->|8. Full Text| Ollama
    Ollama -->|9. Llama 3.2 JSON| Analyze
    Analyze -->|10. Store| DB
    Analyze -->|11. SSE Event| SSEStream
    SSEStream -.->|12. Live Insights| Client
```

## ✨ Key Features

- **Live Audio Capture:** Uses browser MediaRecorder API with chunked uploads.
- **Local AI Transcription:** Transcribes audio via self-hosted Ollama (Whisper model).
- **Real-Time LLM Insights:** Analyzes transcripts on-the-fly using Llama 3.2 or Mistral.
- **Server-Sent Events (SSE):** Streams updates to the UI instantly without WebSocket overhead.
- **High-Performance Frontend:** Built with Qwik for zero-hydration, instant-load performance.
- **Premium Glassmorphic UI:** Custom Tailwind CSS v4 design system.
- **Offline/Local First:** No cloud vendor lock-in. Can run entirely offline.

## 🛠 Tech Stack

- **Frontend:** Qwik, QwikCity, Tailwind CSS v4, TypeScript
- **Backend:** Node.js, Express, better-sqlite3, multer
- **AI Engine:** Ollama (Whisper, Llama 3.2 / Mistral)
- **Real-Time:** Server-Sent Events (SSE)

## 🚀 Setup Instructions

### Prerequisites
1. Node.js 18+ installed
2. [Ollama](https://ollama.ai) installed and running locally

### 1. Install AI Models
```bash
# Start Ollama service first, then:
ollama pull whisper
ollama pull llama3.2
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 4. Open the App
Visit `http://localhost:5173` in your browser.

## 📚 API Documentation

### Sessions
- `POST /api/session`: Create a new meeting session
- `GET /api/session/:id`: Get full session details
- `GET /api/sessions`: List all sessions
- `DELETE /api/session/:id`: End and persist a session
- `GET /api/session/:id/export?format=markdown`: Export meeting notes

### Real-Time Flow
- `POST /api/transcribe` (multipart/form-data): Send audio chunk for transcription
- `POST /api/analyze`: Trigger LLM analysis on current transcript
- `GET /api/stream/:sessionId`: Connect to Server-Sent Events stream

## 🌍 Deployment Steps

This system is designed to run anywhere. 

### Backend Deployment (Render / Railway / DigitalOcean)
1. Set `NODE_ENV=production`
2. Ensure the disk path for `DB_PATH` is a persistent volume if using SQLite.
3. Point `OLLAMA_BASE_URL` to your hosted Ollama instance (e.g., RunPod, AWS EC2, or local tunnel).
4. Run `npm run build && npm start`

### Frontend Deployment (Vercel / Cloudflare Pages)
1. Ensure `VITE_API_BASE_URL` points to your deployed backend URL.
2. Run `npm run build`
3. Deploy the `dist` folder.

> **Note:** For Cloudflare Pages, use `npm run qwik add cloudflare-pages` to add the adapter before building.
