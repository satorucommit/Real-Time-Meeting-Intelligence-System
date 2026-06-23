// ============================================
// Shared Type Definitions
// ============================================

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

export interface AnalysisRecord extends AnalysisResult {
  id: number;
  sessionId: string;
  createdAt: string;
}

export interface SpeakingMetric {
  speaker: string;
  totalDurationSeconds: number;
  wordCount: number;
}

// SSE Event Types
export type SSEEventType = 
  | 'transcription'
  | 'analysis'
  | 'session_update'
  | 'heartbeat'
  | 'error'
  | 'notification';

export interface SSEEvent {
  type: SSEEventType;
  sessionId: string;
  data: unknown;
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Ollama Types
export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    top_p?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

export interface TranscriptionRequest {
  sessionId: string;
  audioData: Buffer;
  chunkIndex: number;
}

export interface AnalyzeRequest {
  sessionId: string;
}

// Export markdown types
export interface ExportData {
  session: MeetingSession;
  transcripts: TranscriptChunk[];
  analysis: AnalysisResult | null;
  speakingMetrics: SpeakingMetric[];
}
