// server/index.js — Express app
'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes      = require('./routes/authRoutes');
const characterRoutes = require('./routes/characterRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));

// Request logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString().slice(11, 19)} ${req.method} ${req.path}`);
  next();
});

/* ── API routes ── */
app.use('/api/auth',       authRoutes);
app.use('/api/characters', characterRoutes);

/* ── Health check ── */
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, uptime: process.uptime() })
);

/* ── Serve static frontend ── */
const PUBLIC = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC));

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Rota não encontrada.' });
  }
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

/* ── Global error handler ── */
app.use((err, _req, res, _next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

/* ── Start server only when run directly (not on Vercel) ── */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('\n⚔️  Grimório do Aventureiro · D&D 5E');
    console.log(`🌐  http://localhost:${PORT}`);
    console.log('📦  Banco: Neon PostgreSQL (DATABASE_URL)');
    console.log(`✅  Servidor rodando na porta ${PORT}\n`);
  });
}

// Vercel uses this export
module.exports = app;
