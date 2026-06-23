import { Router, type Request, type Response } from 'express';
import { store } from '../services/store';
import type { SSEEvent } from '../utils/types';

const router = Router();

router.get('/:sessionId', (req: Request, res: Response): void => {
  const { sessionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  console.log(`📡 SSE client connected for session ${sessionId}`);

  const sendEvent = (event: string, data: unknown): void => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch { /* client disconnected */ }
  };

  sendEvent('connected', { sessionId, message: 'Stream connected' });

  const session = store.getSession(sessionId);
  if (session && session.transcripts.length > 0) {
    sendEvent('initial_state', {
      transcripts: session.transcripts,
      analysis: session.latestAnalysis,
      speakingMetrics: Array.from(session.speakingMetrics.values()),
    });
  }

  const unsubscribe = store.subscribe(sessionId, (event: SSEEvent) => {
    sendEvent(event.type, event.data);
  });

  const heartbeat = setInterval(() => {
    try { sendEvent('heartbeat', { ts: new Date().toISOString() }); }
    catch { clearInterval(heartbeat); }
  }, 15000);

  req.on('close', () => {
    console.log(`📡 SSE client disconnected from session ${sessionId}`);
    clearInterval(heartbeat);
    unsubscribe();
  });

  req.on('error', () => { clearInterval(heartbeat); unsubscribe(); });
});

export default router;
