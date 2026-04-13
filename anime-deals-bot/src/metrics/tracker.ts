import { getDb } from "../database/schema";
import { logger } from "../utils/logger";

export interface DashboardStats {
  totalPosts: number;
  postsToday: number;
  topProducts: Array<{ name: string; posts: number; score: number }>;
  postsByDay: Array<{ date: string; count: number }>;
  scoreDistribution: { normal: number; boa: number; insana: number };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = getDb();

  const totalRes = await db.execute("SELECT COUNT(*) as c FROM posts");
  const totalPosts = Number(totalRes.rows[0]?.c ?? 0);

  const todayRes = await db.execute(
    "SELECT COUNT(*) as c FROM posts WHERE date(posted_at) = date('now')"
  );
  const postsToday = Number(todayRes.rows[0]?.c ?? 0);

  const topRes = await db.execute(`
    SELECT p.name, COUNT(posts.id) as posts, p.score
    FROM products p JOIN posts ON posts.product_id = p.id
    GROUP BY p.id ORDER BY posts DESC, p.score DESC LIMIT 10
  `);
  const topProducts = topRes.rows as unknown as Array<{ name: string; posts: number; score: number }>;

  const byDayRes = await db.execute(`
    SELECT date(posted_at) as date, COUNT(*) as count
    FROM posts WHERE posted_at >= datetime('now', '-30 days')
    GROUP BY date(posted_at) ORDER BY date DESC
  `);
  const postsByDay = byDayRes.rows as unknown as Array<{ date: string; count: number }>;

  const distRes = await db.execute(
    "SELECT score_label, COUNT(*) as cnt FROM posts GROUP BY score_label"
  );
  const distribution = { normal: 0, boa: 0, insana: 0 };
  for (const row of distRes.rows as any[]) {
    if (row.score_label in distribution) {
      distribution[row.score_label as keyof typeof distribution] = Number(row.cnt);
    }
  }

  return { totalPosts, postsToday, topProducts, postsByDay, scoreDistribution: distribution };
}

export async function printDashboard() {
  try {
    const stats = await getDashboardStats();
    console.log("\n" + "=".repeat(50));
    console.log("📊 DASHBOARD — ANIME DEALS BOT");
    console.log("=".repeat(50));
    console.log(`📬 Total de posts: ${stats.totalPosts}`);
    console.log(`📅 Posts hoje: ${stats.postsToday}`);
    console.log(`\n🏷️  Distribuição:`);
    console.log(`   🔥 Insanas: ${stats.scoreDistribution.insana}`);
    console.log(`   💥 Boas:    ${stats.scoreDistribution.boa}`);
    console.log(`   🛒 Normais: ${stats.scoreDistribution.normal}`);
    if (stats.topProducts.length > 0) {
      console.log(`\n🏆 Top produtos:`);
      stats.topProducts.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name.slice(0, 45)} (score: ${p.score})`);
      });
    }
    console.log("=".repeat(50) + "\n");
  } catch {
    // Banco vazio no primeiro boot — normal
  }
}
