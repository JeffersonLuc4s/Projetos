// server/db.js — SQLite via sql.js (pure JS/WASM, sem compilação nativa)
'use strict';

const initSqlJs = require('sql.js');
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'grimorio.db');

let _wrapper = null;     // cached wrapped DB
let _raw     = null;     // raw sql.js Database
let _inTx    = false;    // suppress file saves inside transactions

/* ── Persist DB to disk ── */
function persist() {
  if (_inTx) return;  // defer until transaction commits
  const data = _raw.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/* ─────────────────────────────────────────────────────────
   Compatibility wrapper — mimics better-sqlite3 sync API
───────────────────────────────────────────────────────── */
function makeWrapper(raw) {
  /* Flatten variadic params: .run(a, b) or .run([a, b]) → [a, b] */
  function flat(args) {
    if (args.length === 1 && Array.isArray(args[0])) return args[0];
    return args.length ? args : [];
  }

  function prepare(sql) {
    return {
      /** Return first matching row or undefined */
      get(...args) {
        const stmt = raw.prepare(sql);
        const params = flat(args);
        if (params.length) stmt.bind(params);
        const row = stmt.step() ? stmt.getAsObject() : undefined;
        stmt.free();
        return row;
      },

      /** Return all matching rows */
      all(...args) {
        const stmt = raw.prepare(sql);
        const params = flat(args);
        if (params.length) stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },

      /** Execute a write statement, return { lastInsertRowid, changes } */
      run(...args) {
        const stmt = raw.prepare(sql);
        const params = flat(args);
        if (params.length) stmt.bind(params);
        stmt.step();
        const changes = raw.getRowsModified();
        stmt.free();

        // last_insert_rowid() must be queried before any other statement
        const res = raw.exec('SELECT last_insert_rowid()');
        const lastInsertRowid = res[0]?.values[0][0] ?? 0;

        persist();
        return { lastInsertRowid, changes };
      },
    };
  }

  return {
    /* Execute one or more SQL statements (used in migrations) */
    exec(sql) {
      raw.exec(sql);   // sql.js exec handles multi-statement strings
      persist();
    },

    /* PRAGMA helper */
    pragma(str) {
      raw.run(`PRAGMA ${str}`);
    },

    prepare,

    /**
     * Wrap fn in a transaction.
     * Returns a function that, when called, runs fn inside BEGIN/COMMIT.
     */
    transaction(fn) {
      return (...args) => {
        _inTx = true;
        raw.run('BEGIN');
        try {
          const result = fn(...args);
          raw.run('COMMIT');
          _inTx = false;
          persist();           // one single write for the whole transaction
          return result;
        } catch (err) {
          _inTx = false;
          try { raw.run('ROLLBACK'); } catch (_) { /* ignore */ }
          throw err;
        }
      };
    },
  };
}

/* ─────────────────────────────────────────────────────────
   Database migrations — creates all tables on first run
───────────────────────────────────────────────────────── */
function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password   TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS characters (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
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
      escudo        INTEGER NOT NULL DEFAULT 0,
      hp_atual      INTEGER NOT NULL DEFAULT 0,
      hp_max        INTEGER NOT NULL DEFAULT 0,
      hp_temp       INTEGER NOT NULL DEFAULT 0,
      hd_total      INTEGER NOT NULL DEFAULT 1,
      hd_usados     INTEGER NOT NULL DEFAULT 0,
      exaustao      INTEGER NOT NULL DEFAULT 0,
      inspiracao    INTEGER NOT NULL DEFAULT 0,
      observacoes   TEXT    NOT NULL DEFAULT '',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attributes (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
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
    );

    CREATE TABLE IF NOT EXISTS saving_throw_profs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      atributo     TEXT    NOT NULL,
      UNIQUE(character_id, atributo)
    );

    CREATE TABLE IF NOT EXISTS skill_profs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      skill_id     TEXT    NOT NULL,
      UNIQUE(character_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      item_key     TEXT    NOT NULL DEFAULT '',
      nome         TEXT    NOT NULL DEFAULT '',
      quantidade   INTEGER NOT NULL DEFAULT 1,
      descricao    TEXT    NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS weapons (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      weapon_key   TEXT    NOT NULL DEFAULT '',
      nome         TEXT    NOT NULL DEFAULT '',
      dano         TEXT    NOT NULL DEFAULT '',
      atributo     TEXT    NOT NULL DEFAULT 'forca',
      proficiente  INTEGER NOT NULL DEFAULT 1,
      bonus_extra  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS spells (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      spell_key    TEXT    NOT NULL DEFAULT '',
      nome         TEXT    NOT NULL DEFAULT '',
      nivel        INTEGER NOT NULL DEFAULT 0,
      preparada    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS conditions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      condition_id TEXT    NOT NULL,
      UNIQUE(character_id, condition_id)
    );

    CREATE TABLE IF NOT EXISTS resistances (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      descricao    TEXT    NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS magic_config (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
      atributo     TEXT    NOT NULL DEFAULT '',
      slots_usados TEXT    NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS personality (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
      tracos       TEXT    NOT NULL DEFAULT '',
      ideais       TEXT    NOT NULL DEFAULT '',
      vinculos     TEXT    NOT NULL DEFAULT '',
      defeitos     TEXT    NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS appearance (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
      idade        TEXT    NOT NULL DEFAULT '',
      altura       TEXT    NOT NULL DEFAULT '',
      peso         TEXT    NOT NULL DEFAULT '',
      olhos        TEXT    NOT NULL DEFAULT '',
      cabelo       TEXT    NOT NULL DEFAULT '',
      pele         TEXT    NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS languages (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      idioma       TEXT    NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS coins (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
      pp           INTEGER NOT NULL DEFAULT 0,
      po           INTEGER NOT NULL DEFAULT 0,
      pe           INTEGER NOT NULL DEFAULT 0,
      pc           INTEGER NOT NULL DEFAULT 0
    );
  `);
}

/* ─────────────────────────────────────────────────────────
   Public: async getDb() — call this in every route
───────────────────────────────────────────────────────── */
async function getDb() {
  if (_wrapper) return _wrapper;

  const SQL = await initSqlJs();

  _raw = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  // Enable foreign keys (sql.js ignores PRAGMA journal_mode)
  _raw.run('PRAGMA foreign_keys = ON');

  _wrapper = makeWrapper(_raw);
  migrate(_wrapper);

  return _wrapper;
}

module.exports = { getDb };
