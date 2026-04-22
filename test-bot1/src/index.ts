import "dotenv/config";
import { migrate } from "./database/schema";
import { startScheduler, triggerImmediateCollect } from "./scheduler/cron";
import { startCollectWorker } from "./queue/workers/collect.worker";
import { startPublishWorker } from "./queue/workers/publish.worker";
import { setupBotCommands } from "./telegram/publisher";
import { printDashboard } from "./metrics/tracker";
import { logger } from "./utils/logger";

async function bootstrap() {
  logger.info("🚀 Iniciando Anime Deals Bot...");
  logger.info(`   Ambiente: ${process.env.NODE_ENV ?? "development"}`);
  logger.info(`   Canais: ${process.env.TELEGRAM_CHANNEL_IDS ?? "(não configurado)"}`);

  // 1. Banco de dados
  await migrate();

  // 2. Workers de fila
  startCollectWorker();
  startPublishWorker();

  // 3. Scheduler
  startScheduler();

  // 4. Comandos do bot
  try {
    setupBotCommands();
  } catch (err) {
    logger.warn("[Boot] Comandos do bot não iniciados:", err);
  }

  // 5. Dashboard
  await printDashboard();

  // 6. Coleta imediata se configurado
  if (process.env.COLLECT_ON_START === "true") {
    logger.info("[Boot] Disparando coleta imediata...");
    await triggerImmediateCollect("all");
  }

  logger.info("✅ Bot rodando! Aguardando jobs...");

  process.on("SIGINT", () => { logger.info("🛑 Encerrando..."); process.exit(0); });
  process.on("SIGTERM", () => { logger.info("🛑 Encerrando..."); process.exit(0); });
  process.on("uncaughtException", (err) => logger.error("UNCAUGHT:", err));
  process.on("unhandledRejection", (r) => logger.error("UNHANDLED:", r));
}

bootstrap().catch((err) => {
  console.error("Falha fatal:", err);
  process.exit(1);
});
