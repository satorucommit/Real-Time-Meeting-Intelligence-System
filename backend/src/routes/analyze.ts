import { Router, type Request, type Response } from 'express';
import { analyzeTranscript } from '../services/ollama';
import { store } from '../services/store';
import { queries } from '../models/db';
import type { ApiResponse, AnalysisResult } from '../utils/types';

const router = Router();

/**
 * POST /api/analyze - Analyze meeting transcript
 * 
 * Request body: { sessionId: string }
 * 
 * Flow:
 * 1. Fetch accumulated transcript
 * 2. Send to LLM for analysis
 * 3. Store structured output
 * 4. Emit SSE event
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body as { sessionId: string };

    if (!sessionId) {
      res.status(400).json({ success: false, error: 'sessionId is required' });
      return;
    }

    // Get transcript from memory or database
    let transcript = store.getFullTranscript(sessionId);

    if (!transcript || transcript.trim().length === 0) {
      // Try database
      const dbResult = queries.getFullTranscript.get(sessionId);
      transcript = dbResult?.full_text || '';
    }

    if (!transcript || transcript.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'No transcript available for analysis. Record some audio first.',
      });
      return;
    }

    console.log(`🧠 Analyzing transcript for session ${sessionId} (${transcript.length} chars)`);

    // Analyze with LLM
    const analysis: AnalysisResult = await analyzeTranscript(transcript);

    // Store in memory
    store.storeAnalysis(sessionId, analysis);

    // Persist to database
    queries.insertAnalysis.run(
      sessionId,
      analysis.summary,
      JSON.stringify(analysis.actionItems),
      JSON.stringify(analysis.decisions),
      JSON.stringify(analysis.topics),
    );

    // Notify clients
    store.emitNotification(sessionId, '✅ Analysis complete! New insights are available.');

    console.log(`✅ Analysis complete for session ${sessionId}`);

    const response: ApiResponse<AnalysisResult> = {
      success: true,
      data: analysis,
      message: 'Analysis completed successfully',
    };

    res.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Analysis error: ${msg}`);
    res.status(500).json({ success: false, error: `Analysis failed: ${msg}` });
  }
});

/**
 * GET /api/analyze/:sessionId - Get latest analysis for a session
 */
router.get('/:sessionId', (req: Request, res: Response): void => {
  try {
    const { sessionId } = req.params;

    // Try memory first
    const memAnalysis = store.getAnalysis(sessionId);
    if (memAnalysis) {
      res.json({ success: true, data: memAnalysis });
      return;
    }

    // Fall back to database
    const dbAnalysis = queries.getLatestAnalysis.get(sessionId);
    if (!dbAnalysis) {
      res.status(404).json({ success: false, error: 'No analysis found' });
      return;
    }

    const analysis: AnalysisResult = {
      summary: dbAnalysis.summary || '',
      actionItems: JSON.parse(dbAnalysis.action_items || '[]'),
      decisions: JSON.parse(dbAnalysis.decisions || '[]'),
      topics: JSON.parse(dbAnalysis.topics || '[]'),
    };

    res.json({ success: true, data: analysis });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/analyze/:sessionId/history - Get all analyses for a session
 */
router.get('/:sessionId/history', (req: Request, res: Response): void => {
  try {
    const { sessionId } = req.params;
    const analyses = queries.getAllAnalyses.all(sessionId);

    const parsed = analyses.map(a => ({
      id: a.id,
      sessionId: a.session_id,
      summary: a.summary,
      actionItems: JSON.parse(a.action_items || '[]'),
      decisions: JSON.parse(a.decisions || '[]'),
      topics: JSON.parse(a.topics || '[]'),
      createdAt: a.created_at,
    }));

    res.json({ success: true, data: parsed });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;
