import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './models/db';
import { checkOllamaHealth, listModels } from './services/ollama';
import sessionRoutes from './routes/session';
import transcribeRoutes from './routes/transcribe';
import analyzeRoutes from './routes/analyze';
import streamRoutes from './routes/stream';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// --- Middleware ---
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, _res, next) => {
  if (req.path !== '/api/stream' && !req.path.includes('/stream/')) {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// --- Routes ---
app.use('/api/session', sessionRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/transcribe', transcribeRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/stream', streamRoutes);

// Health check
app.get('/api/health', async (_req, res) => {
  const ollamaOk = await checkOllamaHealth();
  const models = ollamaOk ? await listModels() : [];
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ollama: { connected: ollamaOk, models },
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// --- Startup ---
async function start(): Promise<void> {
  initializeDatabase();

  const ollamaOk = await checkOllamaHealth();
  if (ollamaOk) {
    const models = await listModels();
    console.log(`🤖 Ollama connected. Models: ${models.join(', ') || 'none'}`);
  } else {
    console.warn('⚠️  Ollama not reachable. AI features will use fallback mode.');
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Meeting Intelligence Server running on http://localhost:${PORT}`);
    console.log(`📡 SSE endpoint: http://localhost:${PORT}/api/stream/:sessionId`);
    console.log(`❤️  Health check: http://localhost:${PORT}/api/health\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
