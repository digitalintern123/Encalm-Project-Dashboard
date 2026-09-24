import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initDatabase } from './db/database.js';
import { seedDatabase } from './db/seed.js';

import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import phasesRouter from './routes/phases.js';
import milestonesRouter from './routes/milestones.js';
import issuesRouter from './routes/issues.js';
import { projectUpdatesRouter, globalUpdatesRouter } from './routes/updates.js';
import notificationsRouter from './routes/notifications.js';
import systemRouter from './routes/system.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || process.env.API_PORT || process.env.BACKEND_PORT || 5000);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request logger for API development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projects/:id/phases', phasesRouter);
app.use('/api/projects/:id/milestones', milestonesRouter);
app.use('/api/projects/:id/issues', issuesRouter);
app.use('/api/projects/:id/updates', projectUpdatesRouter);
app.use('/api/updates', globalUpdatesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/system', systemRouter);

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Serve frontend static build if available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Client-side SPA routing fallback for Express 5
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
} else {
  app.get('/', (req, res) => {
    res.redirect('http://localhost:5173');
  });
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Initialize database and start server
async function startServer() {
  try {
    initDatabase();
    seedDatabase(false);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(` Encalm Projects Backend Server running!`);
      console.log(` Port:    http://localhost:${PORT}`);
      console.log(` Health:  http://localhost:${PORT}/api/system/health`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
