/**
 * Fila em memória simples — sem necessidade de Redis.
 * Suporta retry automático e delay entre jobs.
 */

import { logger } from "../utils/logger";

export interface CollectJobData {
  source: "belezanaweb" | "ocean" | "sallve" | "mercadolivre" | "all";
}

export interface PublishJobData {
  productId: string;
  channelId: string;
  copyText: string;
  affiliateUrl: string;
  product: {
    name: string;
    image_url?: string;
    score_label: string;
    score: number;
  };
}

type JobHandler<T> = (data: T) => Promise<any>;

class SimpleQueue<T> {
  private queue: Array<{ data: T; delayMs: number; addedAt: number }> = [];
  private handler: JobHandler<T> | null = null;
  private running = false;
  private maxRetries = 3;

  onProcess(handler: JobHandler<T>) {
    this.handler = handler;
  }

  async add(data: T, delayMs = 0) {
    this.queue.push({ data, delayMs, addedAt: Date.now() });
    if (!this.running) this.processNext();
  }

  private async processNext() {
    if (!this.handler || this.queue.length === 0) {
      this.running = false;
      return;
    }

    this.running = true;
    const job = this.queue.shift()!;

    const elapsed = Date.now() - job.addedAt;
    const remaining = job.delayMs - elapsed;
    if (remaining > 0) {
      await sleep(remaining);
    }

    const JOB_TIMEOUT_MS = 55 * 60 * 1000; // 55 minutos

    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Job timeout após ${JOB_TIMEOUT_MS / 60000} min`)), JOB_TIMEOUT_MS)
        );
        await Promise.race([this.handler(job.data), timeout]);
        break;
      } catch (err) {
        attempt++;
        logger.error(`[Queue] Job falhou (tentativa ${attempt}/${this.maxRetries}):`, err);
        if (attempt < this.maxRetries) await sleep(5000 * attempt);
      }
    }

    // Processa próximo após pequena pausa
    await sleep(200);
    this.processNext();
  }

  size() {
    return this.queue.length;
  }
}

export const collectQueue = new SimpleQueue<CollectJobData>();
export const publishQueue = new SimpleQueue<PublishJobData>();

export async function addCollectJob(data: CollectJobData, delayMs = 0) {
  await collectQueue.add(data, delayMs);
  return { id: `collect-${Date.now()}` };
}

export async function addPublishJob(data: PublishJobData, delayMs = 0) {
  await publishQueue.add(data, delayMs);
  return { id: `publish-${Date.now()}` };
}

export async function getQueueStats() {
  return {
    collect: { waiting: collectQueue.size() },
    publish: { waiting: publishQueue.size() },
  };
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
