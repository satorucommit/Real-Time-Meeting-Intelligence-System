# Development Guide

This guide covers local development, debugging, and common issues for the Meeting Intelligence System.

## Local Setup Workflow

1. **Start Ollama**
   Ensure Ollama is running in the background. By default, it runs on `http://localhost:11434`.
   If you want to view Ollama logs to debug AI generation:
   ```bash
   OLLAMA_DEBUG=1 ollama serve
   ```

2. **Start Backend (Terminal 1)**
   ```bash
   cd backend
   npm run dev
   ```
   The backend uses `ts-node-dev` for fast restarts on file changes.

3. **Start Frontend (Terminal 2)**
   ```bash
   cd frontend
   npm run dev
   ```
   Vite handles HMR for the Qwik frontend.

## 🐞 Debugging Guide

### SSE (Server-Sent Events) Connection Issues
- **Symptoms:** UI doesn't update, terminal shows "SSE client disconnected" frequently.
- **Fix:** Check your network tab. Ensure no proxy (like nginx or Vite's dev server proxy) is buffering the connection. The backend sets `X-Accel-Buffering: no` specifically to prevent nginx from buffering SSE streams.

### Microphone Access Denied
- **Symptoms:** Clicking "Start Meeting" does nothing or throws an error.
- **Fix:** Browsers require HTTPS or `localhost` to access `navigator.mediaDevices`. Ensure you are accessing the app via `http://localhost:5173`, not an IP address (unless using HTTPS).

### Audio Transcription is Empty
- **Symptoms:** Audio is recorded, API returns 200, but text is empty.
- **Fix:** 
  1. Ensure you speak clearly.
  2. The chunk size might be too small. Currently set to 10s in `AudioRecorder.tsx`.
  3. Note: Ollama's `whisper` model support via `/api/generate` is currently experimental. If the multimodal API fails, the backend falls back to a simulated transcription mode for development purposes. Check backend logs for "Using simulated transcription".

### LLM Analysis Fails
- **Symptoms:** Clicking "Generate Insights" fails or returns empty objects.
- **Fix:** 
  1. Check if `llama3.2` is pulled (`ollama list`).
  2. The backend enforces JSON formatting, but small models sometimes hallucinate markdown. The `extractJSON` utility in `backend/src/services/ollama.ts` handles markdown wrapping, but if the model completely fails to return JSON, it will error out. Consider switching to a larger model if you have the RAM.

## 🏗 Project Structure Notes

### Backend In-Memory Store vs SQLite
During an **active meeting**, transcripts and analysis are held in memory (`services/store.ts`) for ultra-low latency reads and SSE broadcasts. 

When a meeting ends (`DELETE /api/session/:id`), the data is flushed from memory and permanently stored in SQLite (`database/schema.sql`). If the server crashes during a meeting, only the active session data is lost (unless you implement periodic autosaves).

### Qwik Resumability
The frontend uses Qwik's `$` syntax extensively. 
- `useSignal` handles reactive state.
- `useVisibleTask$` runs code purely on the client (like microphone access and SSE connections).
- `$` closures serialize the logic so Qwik can lazy-load it.

## 📝 Common Commands

**Backend:**
- Reset Database: `rm backend/database/db.sqlite`

**Frontend:**
- Run Linting: `npm run lint`
- Build for Production: `npm run build`
