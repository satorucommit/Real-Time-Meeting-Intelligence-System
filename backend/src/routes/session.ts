import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../services/store';
import { queries, type SessionRow } from '../models/db';
import type { ApiResponse, MeetingSession, ExportData } from '../utils/types';

const router = Router();

/**
 * POST /api/session - Create a new meeting session
 */
router.post('/', (req: Request, res: Response): void => {
  try {
    const { title } = req.body as { title?: string };
    const id = uuidv4();
    const sessionTitle = title || `Meeting ${new Date().toLocaleString()}`;

    // Create in-memory session
    store.createSession(id, sessionTitle);

    // Persist to database
    queries.createSession.run(id, sessionTitle);

    const response: ApiResponse<{ sessionId: string; title: string }> = {
      success: true,
      data: { sessionId: id, title: sessionTitle },
      message: 'Session created successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/session/:id - Get session details
 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    // Try in-memory first
    const memSession = store.getSession(id);

    if (memSession) {
      const session: MeetingSession = {
        id: memSession.id,
        title: memSession.title,
        createdAt: memSession.startedAt.toISOString(),
        endedAt: null,
        durationSeconds: Math.floor((Date.now() - memSession.startedAt.getTime()) / 1000),
        status: 'active',
      };

      res.json({
        success: true,
        data: {
          session,
          transcripts: memSession.transcripts,
          analysis: memSession.latestAnalysis,
          speakingMetrics: Array.from(memSession.speakingMetrics.values()),
        },
      });
      return;
    }

    // Fall back to database
    const dbSession = queries.getSession.get(id);
    if (!dbSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const transcripts = queries.getTranscripts.all(id);
    const analysis = queries.getLatestAnalysis.get(id);

    res.json({
      success: true,
      data: {
        session: mapDbSession(dbSession),
        transcripts: transcripts.map(t => ({
          id: t.id,
          sessionId: t.session_id,
          content: t.content,
          speaker: t.speaker,
          timestamp: t.timestamp,
          chunkIndex: t.chunk_index,
          confidence: t.confidence,
        })),
        analysis: analysis
          ? {
              summary: analysis.summary,
              actionItems: JSON.parse(analysis.action_items || '[]'),
              decisions: JSON.parse(analysis.decisions || '[]'),
              topics: JSON.parse(analysis.topics || '[]'),
            }
          : null,
        speakingMetrics: [],
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/sessions - List all sessions
 */
router.get('/', (_req: Request, res: Response): void => {
  try {
    // Get active sessions from memory
    const activeSessions = store.getAllSessions().map(s => ({
      id: s.id,
      title: s.title,
      createdAt: s.startedAt.toISOString(),
      endedAt: null,
      durationSeconds: Math.floor((Date.now() - s.startedAt.getTime()) / 1000),
      status: 'active' as const,
    }));

    // Get persisted sessions from database
    const dbSessions = queries.getAllSessions.all().map(mapDbSession);

    // Merge, avoiding duplicates (prefer active sessions)
    const activeIds = new Set(activeSessions.map(s => s.id));
    const allSessions = [
      ...activeSessions,
      ...dbSessions.filter(s => !activeIds.has(s.id)),
    ];

    res.json({ success: true, data: allSessions });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * DELETE /api/session/:id - End and persist a session
 */
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const memSession = store.getSession(id);

    if (memSession) {
      const duration = Math.floor((Date.now() - memSession.startedAt.getTime()) / 1000);

      // Persist transcripts to database
      for (const transcript of memSession.transcripts) {
        queries.insertTranscript.run(
          id,
          transcript.content,
          transcript.speaker,
          transcript.chunkIndex,
          transcript.confidence,
        );
      }

      // Persist analysis if available
      if (memSession.latestAnalysis) {
        queries.insertAnalysis.run(
          id,
          memSession.latestAnalysis.summary,
          JSON.stringify(memSession.latestAnalysis.actionItems),
          JSON.stringify(memSession.latestAnalysis.decisions),
          JSON.stringify(memSession.latestAnalysis.topics),
        );
      }

      // Update session status
      queries.endSession.run(duration, 'ended', id);

      // Notify clients
      store.emitNotification(id, 'Meeting ended. All data has been saved.');

      // Remove from memory
      store.deleteSession(id);
    } else {
      // Just update DB if not in memory
      queries.endSession.run(0, 'ended', id);
    }

    res.json({ success: true, message: 'Session ended and saved' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * PATCH /api/session/:id - Update session title
 */
router.patch('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { title } = req.body as { title?: string };

    if (!title) {
      res.status(400).json({ success: false, error: 'Title is required' });
      return;
    }

    const memSession = store.getSession(id);
    if (memSession) {
      memSession.title = title;
    }

    queries.updateSessionTitle.run(title, id);

    res.json({ success: true, message: 'Title updated' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/session/:id/export - Export session as structured data
 */
router.get('/:id/export', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const memSession = store.getSession(id);

    let exportData: ExportData;

    if (memSession) {
      exportData = {
        session: {
          id: memSession.id,
          title: memSession.title,
          createdAt: memSession.startedAt.toISOString(),
          endedAt: null,
          durationSeconds: Math.floor((Date.now() - memSession.startedAt.getTime()) / 1000),
          status: 'active',
        },
        transcripts: memSession.transcripts,
        analysis: memSession.latestAnalysis,
        speakingMetrics: Array.from(memSession.speakingMetrics.values()),
      };
    } else {
      const dbSession = queries.getSession.get(id);
      if (!dbSession) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      const transcripts = queries.getTranscripts.all(id);
      const analysis = queries.getLatestAnalysis.get(id);

      exportData = {
        session: mapDbSession(dbSession),
        transcripts: transcripts.map(t => ({
          id: t.id,
          sessionId: t.session_id,
          content: t.content,
          speaker: t.speaker,
          timestamp: t.timestamp,
          chunkIndex: t.chunk_index,
          confidence: t.confidence,
        })),
        analysis: analysis
          ? {
              summary: analysis.summary || '',
              actionItems: JSON.parse(analysis.action_items || '[]'),
              decisions: JSON.parse(analysis.decisions || '[]'),
              topics: JSON.parse(analysis.topics || '[]'),
            }
          : null,
        speakingMetrics: [],
      };
    }

    const { format } = req.query;

    if (format === 'markdown') {
      const md = generateMarkdown(exportData);
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.session.title}.md"`);
      res.send(md);
      return;
    }

    res.json({ success: true, data: exportData });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: msg });
  }
});

// --- Helpers ---

function mapDbSession(row: SessionRow): MeetingSession {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    status: row.status as 'active' | 'ended' | 'archived',
  };
}

function generateMarkdown(data: ExportData): string {
  const lines: string[] = [];
  lines.push(`# ${data.session.title}`);
  lines.push('');
  lines.push(`**Date:** ${new Date(data.session.createdAt).toLocaleString()}`);
  lines.push(`**Duration:** ${formatDuration(data.session.durationSeconds)}`);
  lines.push(`**Status:** ${data.session.status}`);
  lines.push('');

  if (data.analysis) {
    lines.push('## Summary');
    lines.push(data.analysis.summary);
    lines.push('');

    if (data.analysis.topics.length > 0) {
      lines.push('## Topics');
      data.analysis.topics.forEach(t => lines.push(`- ${t}`));
      lines.push('');
    }

    if (data.analysis.actionItems.length > 0) {
      lines.push('## Action Items');
      data.analysis.actionItems.forEach(a => lines.push(`- [ ] ${a}`));
      lines.push('');
    }

    if (data.analysis.decisions.length > 0) {
      lines.push('## Key Decisions');
      data.analysis.decisions.forEach(d => lines.push(`- ${d}`));
      lines.push('');
    }
  }

  if (data.transcripts.length > 0) {
    lines.push('## Transcript');
    lines.push('');
    data.transcripts.forEach(t => {
      lines.push(`**[${t.speaker}]** ${t.content}`);
      lines.push('');
    });
  }

  if (data.speakingMetrics.length > 0) {
    lines.push('## Speaking Metrics');
    lines.push('');
    lines.push('| Speaker | Words | Duration |');
    lines.push('|---------|-------|----------|');
    data.speakingMetrics.forEach(m => {
      lines.push(`| ${m.speaker} | ${m.wordCount} | ${formatDuration(m.totalDurationSeconds)} |`);
    });
  }

  return lines.join('\n');
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default router;
