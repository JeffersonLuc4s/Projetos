import cron from "node-cron";
import { addCollectJob } from "../queue/queues";
import { logger } from "../utils/logger";

const SCHEDULES: Array<{ name: string; cron: string; source: "belezanaweb" | "ocean" | "sallve" | "mercadolivre" | "all" }> = [
  { name: "Coleta das 10h", cron: "0 10 * * *", source: "all" },
  { name: "Coleta das 16h", cron: "0 16 * * *", source: "all" },
  { name: "Coleta das 22h", cron: "0 22 * * *", source: "all" },
];

export function startScheduler() {
  for (const schedule of SCHEDULES) {
    cron.schedule(schedule.cron, async () => {
      logger.info(`[Cron] Iniciando coleta: ${schedule.name}`);
      try {
        const job = await addCollectJob({ source: schedule.source });
        logger.info(`[Cron] Job enfileirado: ${job.id}`);
      } catch (err) {
        logger.error(`[Cron] Erro:`, err);
      }
    }, { timezone: "America/Sao_Paulo" });

    logger.info(`[Cron] Agendado: "${schedule.name}" — ${schedule.cron}`);
  }

  // Limpeza diária
  cron.schedule("30 0 * * *", async () => {
    logger.info("[Cron] Limpeza diária...");
    try {
      const { getDb } = await import("../database/schema");
      const db = getDb();
      await db.execute("DELETE FROM price_history WHERE recorded_at < datetime('now', '-120 days')");
      await db.execute("DELETE FROM metrics WHERE recorded_at < datetime('now', '-90 days')");
      logger.info("[Cron] Limpeza concluída.");
    } catch (err) {
      logger.error("[Cron] Erro na limpeza:", err);
    }
  }, { timezone: "America/Sao_Paulo" });

  logger.info("[Cron] Scheduler iniciado.");
}

export async function triggerImmediateCollect(source: "belezanaweb" | "ocean" | "sallve" | "mercadolivre" | "all" = "all") {
  logger.info(`[Cron] Coleta imediata disparada (source=${source})`);
  return addCollectJob({ source });
}
