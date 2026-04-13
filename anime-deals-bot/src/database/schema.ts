import { createClient, type Client } from "@libsql/client";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "anime-deals.db");

export let db: Client;

export function getDb(): Client {
  if (!db) {
    db = createClient({ url: `file:${DB_PATH}` });
  }
  return db;
}

export async function migrate() {
  const client = getDb();

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS products (
      id             TEXT PRIMARY KEY,
      source         TEXT NOT NULL,
      source_id      TEXT NOT NULL,
      name           TEXT NOT NULL,
      category       TEXT NOT NULL DEFAULT 'unknown',
      image_url      TEXT,
      product_url    TEXT NOT NULL,
      aff_url        TEXT,
      short_url      TEXT,
      current_price  REAL NOT NULL,
      original_price REAL,
      discount_pct   REAL NOT NULL DEFAULT 0,
      rating         REAL NOT NULL DEFAULT 0,
      reviews        INTEGER NOT NULL DEFAULT 0,
      score          REAL NOT NULL DEFAULT 0,
      score_label    TEXT NOT NULL DEFAULT 'normal',
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source, source_id)
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id  TEXT NOT NULL,
      price       REAL NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id  TEXT NOT NULL,
      channel_id  TEXT NOT NULL,
      message_id  INTEGER,
      copy_text   TEXT NOT NULL,
      score_label TEXT NOT NULL,
      posted_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id     INTEGER NOT NULL,
      event       TEXT NOT NULL,
      user_id     TEXT,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_posts_product_channel ON posts(product_id, channel_id, posted_at);
    CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, recorded_at);
    CREATE INDEX IF NOT EXISTS idx_products_score ON products(score DESC);
  `);

  console.log("[DB] Migrations executadas com sucesso.");
}
