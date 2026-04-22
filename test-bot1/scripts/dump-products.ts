import "dotenv/config";
import { getDb } from "../src/database/schema";

(async () => {
  const db = getDb();
  const r = await db.execute(
    `SELECT name, current_price, original_price, discount_pct, category, updated_at
     FROM products
     ORDER BY updated_at DESC LIMIT 20`
  );
  for (const row of r.rows) {
    const name = String(row.name).slice(0, 48);
    console.log(
      `[${row.category}] ${name.padEnd(50)} R$${row.current_price}/${row.original_price} -${row.discount_pct}%  ${row.updated_at}`
    );
  }
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});