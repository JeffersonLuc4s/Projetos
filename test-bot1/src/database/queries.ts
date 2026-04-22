import { getDb } from "./schema";
import crypto from "crypto";

export interface Product {
  id: string;
  source: "amazon" | "mercadolivre";
  source_id: string;
  name: string;
  category: string;
  image_url?: string;
  product_url: string;
  aff_url?: string;
  short_url?: string;
  current_price: number;
  original_price?: number;
  discount_pct: number;
  rating: number;
  reviews: number;
  score: number;
  score_label: "normal" | "boa" | "insana";
}

export function productId(source: string, sourceId: string): string {
  return crypto.createHash("sha1").update(`${source}:${sourceId}`).digest("hex").slice(0, 16);
}

export async function upsertProduct(p: Omit<Product, "id"> & { id?: string }): Promise<string> {
  const db = getDb();
  const id = p.id ?? productId(p.source, p.source_id);

  await db.execute({
    sql: `
      INSERT INTO products (id, source, source_id, name, category, image_url, product_url,
        aff_url, short_url, current_price, original_price, discount_pct, rating, reviews, score, score_label, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(source, source_id) DO UPDATE SET
        name = excluded.name,
        current_price = excluded.current_price,
        original_price = excluded.original_price,
        discount_pct = excluded.discount_pct,
        rating = excluded.rating,
        reviews = excluded.reviews,
        score = excluded.score,
        score_label = excluded.score_label,
        aff_url = excluded.aff_url,
        short_url = excluded.short_url,
        image_url = excluded.image_url,
        updated_at = datetime('now')
    `,
    args: [
      id, p.source, p.source_id, p.name, p.category,
      p.image_url ?? null, p.product_url,
      p.aff_url ?? null, p.short_url ?? null,
      p.current_price, p.original_price ?? null,
      p.discount_pct, p.rating, p.reviews,
      p.score, p.score_label,
    ],
  });

  await db.execute({
    sql: `INSERT INTO price_history (product_id, price) VALUES (?, ?)`,
    args: [id, p.current_price],
  });

  return id;
}

export async function wasPostedRecently(pid: string, channelId: string, days: number): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT 1 FROM posts WHERE product_id = ? AND channel_id = ?
          AND posted_at >= datetime('now', ?) LIMIT 1`,
    args: [pid, channelId, `-${days} days`],
  });
  return result.rows.length > 0;
}

export async function countPostsToday(channelId: string): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT COUNT(*) as cnt FROM posts WHERE channel_id = ? AND date(posted_at) = date('now')`,
    args: [channelId],
  });
  return Number(result.rows[0]?.cnt ?? 0);
}

export async function savePost(data: {
  product_id: string;
  channel_id: string;
  message_id?: number;
  copy_text: string;
  score_label: string;
}): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO posts (product_id, channel_id, message_id, copy_text, score_label)
          VALUES (?, ?, ?, ?, ?)`,
    args: [data.product_id, data.channel_id, data.message_id ?? null, data.copy_text, data.score_label],
  });
  return Number(result.lastInsertRowid);
}

export async function getMinPrice90Days(pid: string): Promise<number | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT MIN(price) as min_price FROM price_history
          WHERE product_id = ? AND recorded_at >= datetime('now', '-90 days')`,
    args: [pid],
  });
  const val = result.rows[0]?.min_price;
  return val != null ? Number(val) : null;
}

export async function getTopProducts(limit = 10): Promise<Product[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM products ORDER BY score DESC LIMIT ?`,
    args: [limit],
  });
  return result.rows as unknown as Product[];
}
