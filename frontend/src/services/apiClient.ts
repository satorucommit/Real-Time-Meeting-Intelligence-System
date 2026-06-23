import axios, { type AxiosInstance, type AxiosError } from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const MAX_RETRIES = 3;

const client: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastErr: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr!;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SessionInfo {
  sessionId: string;
  title: string;
}

export interface MeetingSession {
  id: string;
  title: string;
  createdAt: string;
  endedAt: string | null;
  durationSeconds: number;
  status: 'active' | 'ended' | 'archived';
}

export interface TranscriptChunk {
  id: number;
  sessionId: string;
  content: string;
  speaker: string;
  timestamp: string;
  chunkIndex: number;
  confidence: number;
}

export interface AnalysisResult {
  summary: string;
  actionItems: string[];
  decisions: string[];
  topics: string[];
}

export interface SessionDetail {
  session: MeetingSession;
  transcripts: TranscriptChunk[];
  analysis: AnalysisResult | null;
  speakingMetrics: { speaker: string; wordCount: number; totalDurationSeconds: number }[];
}

// --- API Methods ---

export async function createSession(title?: string): Promise<SessionInfo> {
  return withRetry(async () => {
    const res = await client.post<ApiResponse<SessionInfo>>('/api/session', { title });
    if (!res.data.success || !res.data.data) throw new Error(res.data.error || 'Failed');
    return res.data.data;
  });
}

export async function getSession(id: string): Promise<SessionDetail> {
  return withRetry(async () => {
    const res = await client.get<ApiResponse<SessionDetail>>(`/api/session/${id}`);
    if (!res.data.success || !res.data.data) throw new Error(res.data.error || 'Not found');
    return res.data.data;
  });
}

export async function getAllSessions(): Promise<MeetingSession[]> {
  return withRetry(async () => {
    const res = await client.get<ApiResponse<MeetingSession[]>>('/api/session');
    return res.data.data || [];
  });
}

export async function endSession(id: string): Promise<void> {
  await withRetry(async () => {
    await client.delete(`/api/session/${id}`);
  });
}

export async function transcribeAudio(sessionId: string, audioBlob: Blob, chunkIndex: number): Promise<TranscriptChunk> {
  return withRetry(async () => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    formData.append('sessionId', sessionId);
    formData.append('chunkIndex', String(chunkIndex));
    const res = await client.post<ApiResponse<TranscriptChunk>>('/api/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    if (!res.data.success || !res.data.data) throw new Error(res.data.error || 'Transcription failed');
    return res.data.data;
  });
}

export async function sendTextTranscript(sessionId: string, text: string, speaker?: string): Promise<TranscriptChunk> {
  return withRetry(async () => {
    const res = await client.post<ApiResponse<TranscriptChunk>>('/api/transcribe/text', { sessionId, text, speaker });
    if (!res.data.success || !res.data.data) throw new Error(res.data.error || 'Failed');
    return res.data.data;
  });
}

export async function analyzeSession(sessionId: string): Promise<AnalysisResult> {
  return withRetry(async () => {
    const res = await client.post<ApiResponse<AnalysisResult>>('/api/analyze', { sessionId });
    if (!res.data.success || !res.data.data) throw new Error(res.data.error || 'Analysis failed');
    return res.data.data;
  });
}

export async function getAnalysis(sessionId: string): Promise<AnalysisResult | null> {
  try {
    const res = await client.get<ApiResponse<AnalysisResult>>(`/api/analyze/${sessionId}`);
    return res.data.data || null;
  } catch { return null; }
}

export async function exportSession(sessionId: string, format: 'json' | 'markdown' = 'json'): Promise<string> {
  const res = await client.get(`/api/session/${sessionId}/export`, {
    params: { format },
    responseType: format === 'markdown' ? 'text' : 'json',
  });
  return typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2);
}

export async function checkHealth(): Promise<{ status: string; ollama: { connected: boolean; models: string[] } }> {
  const res = await client.get('/api/health');
  return res.data;
}
