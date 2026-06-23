import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { transcribeAudio } from '../services/ollama';
import { store } from '../services/store';
import type { TranscriptChunk, ApiResponse } from '../utils/types';

const router = Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

/**
 * POST /api/transcribe - Accept audio chunk and transcribe
 * 
 * Expects multipart/form-data with:
 * - audio: audio file (webm, wav, mp3, ogg)
 * - sessionId: string
 * - chunkIndex: number (optional)
 */
router.post('/', upload.single('audio'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, chunkIndex } = req.body as { sessionId: string; chunkIndex?: string };

    if (!sessionId) {
      res.status(400).json({ success: false, error: 'sessionId is required' });
      return;
    }

    const session = store.getSession(sessionId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found. Create a session first.' });
      return;
    }

    // Get audio buffer from uploaded file or raw body
    let audioBuffer: Buffer;

    if (req.file) {
      audioBuffer = req.file.buffer;
    } else if (req.body.audioData) {
      // Handle base64 encoded audio in JSON body
      audioBuffer = Buffer.from(req.body.audioData as string, 'base64');
    } else {
      res.status(400).json({ success: false, error: 'No audio data provided' });
      return;
    }

    console.log(`🎙️ Received audio chunk (${audioBuffer.length} bytes) for session ${sessionId}`);

    // Transcribe using Ollama Whisper
    const transcribedText = await transcribeAudio(audioBuffer);

    if (!transcribedText || transcribedText.trim().length === 0) {
      res.json({
        success: true,
        data: { text: '', chunkIndex: parseInt(chunkIndex || '0', 10) },
        message: 'No speech detected in audio chunk',
      });
      return;
    }

    // Create transcript chunk
    const chunk: TranscriptChunk = {
      id: Date.now(),
      sessionId,
      content: transcribedText,
      speaker: 'Speaker 1', // In production, implement speaker diarization
      timestamp: new Date().toISOString(),
      chunkIndex: chunkIndex ? parseInt(chunkIndex, 10) : store.getChunkCounter(sessionId),
      confidence: 0.85 + Math.random() * 0.15, // Simulated confidence
    };

    // Store in memory and emit SSE event
    store.appendTranscript(sessionId, chunk);

    console.log(`📝 Transcribed: "${transcribedText.substring(0, 80)}..."`);

    const response: ApiResponse<TranscriptChunk> = {
      success: true,
      data: chunk,
      message: 'Audio transcribed successfully',
    };

    res.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Transcription error: ${msg}`);
    res.status(500).json({ success: false, error: `Transcription failed: ${msg}` });
  }
});

/**
 * POST /api/transcribe/text - Direct text input (for testing / manual entry)
 */
router.post('/text', (req: Request, res: Response): void => {
  try {
    const { sessionId, text, speaker } = req.body as {
      sessionId: string;
      text: string;
      speaker?: string;
    };

    if (!sessionId || !text) {
      res.status(400).json({ success: false, error: 'sessionId and text are required' });
      return;
    }

    const session = store.getSession(sessionId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const chunk: TranscriptChunk = {
      id: Date.now(),
      sessionId,
      content: text,
      speaker: speaker || 'Speaker 1',
      timestamp: new Date().toISOString(),
      chunkIndex: store.getChunkCounter(sessionId),
      confidence: 1.0,
    };

    store.appendTranscript(sessionId, chunk);

    res.json({ success: true, data: chunk });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;
