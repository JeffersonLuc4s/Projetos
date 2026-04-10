// server/routes/authRoutes.js
'use strict';

const express = require('express');
const { query, queryOne, insertReturningId, migrate } = require('../db');
const { hashPassword, verifyPassword, signToken, requireAuth } = require('../auth');

const router = express.Router();

// Run migrations on first request (idempotent — safe to call multiple times)
let migrated = false;
async function ensureMigrated() {
  if (!migrated) { await migrate(); migrated = true; }
}

/* ── Validators ── */
function validateUsername(u) {
  if (!u || typeof u !== 'string') return 'Username obrigatório.';
  const s = u.trim();
  if (s.length < 3)  return 'Username deve ter ao menos 3 caracteres.';
  if (s.length > 30) return 'Username deve ter no máximo 30 caracteres.';
  if (!/^[a-zA-Z0-9_.\-]+$/.test(s)) return 'Username: apenas letras, números, _ . -';
  return null;
}

function validatePassword(p) {
  if (!p || typeof p !== 'string') return 'Senha obrigatória.';
  if (p.length < 6)  return 'Senha deve ter ao menos 6 caracteres.';
  if (p.length > 72) return 'Senha muito longa (máx 72 caracteres).';
  return null;
}

/* ─────────────────────────────────────────
   POST /api/auth/register
───────────────────────────────────────── */
router.post('/register', async (req, res) => {
  try {
    await ensureMigrated();
    const { username, password } = req.body || {};

    const uErr = validateUsername(username);
    if (uErr) return res.status(400).json({ error: uErr });

    const pErr = validatePassword(password);
    if (pErr) return res.status(400).json({ error: pErr });

    const clean = username.trim().toLowerCase();

    // Check for duplicate (case-insensitive via LOWER)
    const existing = await queryOne(
      'SELECT id FROM users WHERE LOWER(username) = $1',
      [clean]
    );
    if (existing) return res.status(409).json({ error: 'Username já em uso. Escolha outro.' });

    const hashed = await hashPassword(password);
    const id = await insertReturningId(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
      [username.trim(), hashed]
    );

    const token = signToken({ userId: id, username: username.trim() });
    return res.status(201).json({ token, username: username.trim(), userId: id });

  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

/* ─────────────────────────────────────────
   POST /api/auth/login
───────────────────────────────────────── */
router.post('/login', async (req, res) => {
  try {
    await ensureMigrated();
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e senha obrigatórios.' });
    }

    // Case-insensitive lookup
    const user = await queryOne(
      'SELECT * FROM users WHERE LOWER(username) = $1',
      [username.trim().toLowerCase()]
    );

    if (!user) {
      await hashPassword('dummy_timing_prevention');
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const token = signToken({ userId: user.id, username: user.username });
    return res.json({ token, username: user.username, userId: user.id });

  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

/* ─────────────────────────────────────────
   GET /api/auth/me   (protected)
───────────────────────────────────────── */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, username, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    return res.json(user);
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
