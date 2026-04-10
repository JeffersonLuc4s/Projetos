// server/db.js — PostgreSQL via pg (Neon-compatible)
'use strict';

const { Pool } = require('pg');

/* ── Connection pool ── */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL required for Neon (and most hosted Postgres)
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
  max: 10,              // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[pg pool error]', err.message);
});

/* ─────────────────────────────────────────────
   Query helpers — keep route code clean
───────────────────────────────────────────── */

/** Run a query, return all rows */
async function query(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows;
}

/** Run a query, return first row or null */
async function queryOne(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}

/** Run INSERT/UPDATE/DELETE, return rowCount */
async function execute(text, params = []) {
  const result = await pool.query(text, params);
  return result.rowCount;
}

/** Run INSERT … RETURNING id, return the new id */
async function insertReturningId(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows[0]?.id ?? null;
}

/* ─────────────────────────────────────────────
   Migrations — CREATE TABLE IF NOT EXISTS
   Run once on server start (idempotent)
───────────────────────────────────────────── */
async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        username   TEXT   NOT NULL UNIQUE,
        password   TEXT   NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nome          TEXT    NOT NULL DEFAULT '',
        raca          TEXT    NOT NULL DEFAULT '',
        classe        TEXT    NOT NULL DEFAULT '',
        raca_id       TEXT    NOT NULL DEFAULT '',
        subraca_id    TEXT    NOT NULL DEFAULT '',
        classe_id     TEXT    NOT NULL DEFAULT '',
        background_id TEXT    NOT NULL DEFAULT '',
        tendencia     TEXT    NOT NULL DEFAULT '',
        nivel         INTEGER NOT NULL DEFAULT 1,
        xp            INTEGER NOT NULL DEFAULT 0,
        velocidade    INTEGER NOT NULL DEFAULT 30,
        armadura      TEXT    NOT NULL DEFAULT 'sem_armadura',
        escudo        BOOLEAN NOT NULL DEFAULT FALSE,
        hp_atual      INTEGER NOT NULL DEFAULT 0,
        hp_max        INTEGER NOT NULL DEFAULT 0,
        hp_temp       INTEGER NOT NULL DEFAULT 0,
        hd_total      INTEGER NOT NULL DEFAULT 1,
        hd_usados     INTEGER NOT NULL DEFAULT 0,
        exaustao      INTEGER NOT NULL DEFAULT 0,
        inspiracao    BOOLEAN NOT NULL DEFAULT FALSE,
        observacoes   TEXT    NOT NULL DEFAULT '',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attributes (
        id                   SERIAL PRIMARY KEY,
        character_id         INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
        forca                INTEGER NOT NULL DEFAULT 10,
        destreza             INTEGER NOT NULL DEFAULT 10,
        constituicao         INTEGER NOT NULL DEFAULT 10,
        inteligencia         INTEGER NOT NULL DEFAULT 10,
        sabedoria            INTEGER NOT NULL DEFAULT 10,
        carisma              INTEGER NOT NULL DEFAULT 10,
        forca_base           INTEGER NOT NULL DEFAULT 10,
        destreza_base        INTEGER NOT NULL DEFAULT 10,
        constituicao_base    INTEGER NOT NULL DEFAULT 10,
        inteligencia_base    INTEGER NOT NULL DEFAULT 10,
        sabedoria_base       INTEGER NOT NULL DEFAULT 10,
        carisma_base         INTEGER NOT NULL DEFAULT 10
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS saving_throw_profs (
        id           SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        atributo     TEXT    NOT NULL,
        UNIQUE(character_id, atributo)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS skill_profs (
        id           SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        skill_id     TEXT    NOT NULL,
        UNIQUE(character_id, skill_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id           SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        item_key     TEXT    NOT NULL DEFAULT '',
        nome         TEXT    NOT NULL DEFAULT '',
        quantidade   INTEGER NOT NULL DEFAULT 1,
        descricao    TEXT    NOT NULL DEFAULT ''
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS weapons (
        id           SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        weapon_key   TEXT    NOT NULL DEFAULT '',
        nome         TEXT    NOT NULL DEFAULT '',
        dano         TEXT    NOT NULL DEFAULT '',
        atributo     TEXT    NOT NULL DEFAULT 'forca',
        proficiente  BOOLEAN NOT NULL DEFAULT TRUE,
        bonus_extra  INTEGER NOT NULL DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS spells (
        id           SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        spell_key    TEXT    NOT NULL DEFAULT '',
        nome         TEXT    NOT NULL DEFAULT '',
        nivel        INTEGER NOT NULL DEFAULT 0,
        preparada    BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS conditions (
        id           SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        condition_id TEXT    NOT NULL,
        UNIQUE(character_id, condition_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS resistances (
        id           SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        descricao    TEXT    NOT NULL DEFAULT ''
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS magic_config (
        id           SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
        atributo     TEXT    NOT NULL DEFAULT '',
        slots_usados TEXT    NOT NULL DEFAULT '[]'
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS personality (
        id           SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
        tracos       TEXT    NOT NULL DEFAULT '',
        ideais       TEXT    NOT NULL DEFAULT '',
        vinculos     TEXT    NOT NULL DEFAULT '',
        defeitos     TEXT    NOT NULL DEFAULT ''
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS appearance (
        id           SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
        idade        TEXT    NOT NULL DEFAULT '',
        altura       TEXT    NOT NULL DEFAULT '',
        peso         TEXT    NOT NULL DEFAULT '',
        olhos        TEXT    NOT NULL DEFAULT '',
        cabelo       TEXT    NOT NULL DEFAULT '',
        pele         TEXT    NOT NULL DEFAULT ''
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS languages (
        id           SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        idioma       TEXT    NOT NULL DEFAULT ''
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS coins (
        id           SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
        pp           INTEGER NOT NULL DEFAULT 0,
        po           INTEGER NOT NULL DEFAULT 0,
        pe           INTEGER NOT NULL DEFAULT 0,
        pc           INTEGER NOT NULL DEFAULT 0
      )
    `);

    await client.query('COMMIT');
    console.log('✅ Migrations aplicadas com sucesso.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro nas migrations:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, queryOne, execute, insertReturningId, migrate };
