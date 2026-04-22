import "dotenv/config";
import { getDb } from "../src/database/schema";

(async () => {
  const db = getDb();
  const r = await db.execute("DELETE FROM posts WHERE date(posted_at) = date('now')");
  console.log("Posts deletados:", r.rowsAffected);
  process.exit(0);
})();
