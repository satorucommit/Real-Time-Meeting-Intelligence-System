import { EventEmitter } from 'events';
import type { TranscriptChunk, AnalysisResult, SSEEvent, SSEEventType, SpeakingMetric } from '../utils/types';

// ============================================
// In-Memory Session Store
// ============================================

interface ActiveSession {
  id: string;
  title: string;
  transcripts: TranscriptChunk[];
  latestAnalysis: AnalysisResult | null;
  speakingMetrics: Map<string, SpeakingMetric>;
  chunkCounter: number;
  startedAt: Date;
  isRecording: boolean;
}

class SessionStore {
  private sessions: Map<string, ActiveSession> = new Map();
  private emitter: EventEmitter = new EventEmitter();

  constructor() {
    // Increase max listeners for many concurrent SSE clients
    this.emitter.setMaxListeners(100);
  }

  // --- Session Management ---

  createSession(id: string, title: string = 'Untitled Meeting'): ActiveSession {
    const session: ActiveSession = {
      id,
      title,
      transcripts: [],
      latestAnalysis: null,
      speakingMetrics: new Map(),
      chunkCounter: 0,
      startedAt: new Date(),
      isRecording: false,
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): ActiveSession | undefined {
    return this.sessions.get(id);
  }

  getAllSessions(): ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  setRecording(id: string, recording: boolean): void {
    const session = this.sessions.get(id);
    if (session) {
      session.isRecording = recording;
    }
  }

  // --- Transcript Management ---

  appendTranscript(sessionId: string, chunk: TranscriptChunk): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.transcripts.push(chunk);
    session.chunkCounter++;

    // Update speaking metrics
    const words = chunk.content.split(/\s+/).filter(Boolean).length;
    const existing = session.speakingMetrics.get(chunk.speaker);
    if (existing) {
      existing.wordCount += words;
      existing.totalDurationSeconds += chunk.content.length / 15; // rough estimate
    } else {
      session.speakingMetrics.set(chunk.speaker, {
        speaker: chunk.speaker,
        wordCount: words,
        totalDurationSeconds: chunk.content.length / 15,
      });
    }

    // Emit SSE event
    this.emit(sessionId, 'transcription', chunk);
  }

  getTranscripts(sessionId: string): TranscriptChunk[] {
    return this.sessions.get(sessionId)?.transcripts ?? [];
  }

  getFullTranscript(sessionId: string): string {
    const transcripts = this.getTranscripts(sessionId);
    return transcripts.map(t => t.content).join(' ');
  }

  getChunkCounter(sessionId: string): number {
    return this.sessions.get(sessionId)?.chunkCounter ?? 0;
  }

  // --- Analysis Management ---

  storeAnalysis(sessionId: string, analysis: AnalysisResult): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.latestAnalysis = analysis;

    // Emit SSE event
    this.emit(sessionId, 'analysis', analysis);
  }

  getAnalysis(sessionId: string): AnalysisResult | null {
    return this.sessions.get(sessionId)?.latestAnalysis ?? null;
  }

  // --- Speaking Metrics ---

  getSpeakingMetrics(sessionId: string): SpeakingMetric[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return Array.from(session.speakingMetrics.values());
  }

  // --- SSE Event System ---

  emit(sessionId: string, type: SSEEventType, data: unknown): void {
    const event: SSEEvent = {
      type,
      sessionId,
      data,
      timestamp: new Date().toISOString(),
    };
    this.emitter.emit(`session:${sessionId}`, event);
  }

  subscribe(sessionId: string, listener: (event: SSEEvent) => void): () => void {
    const eventName = `session:${sessionId}`;
    this.emitter.on(eventName, listener);

    // Return unsubscribe function
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  emitNotification(sessionId: string, message: string): void {
    this.emit(sessionId, 'notification', { message });
  }
}

// Singleton export
export const store = new SessionStore();
