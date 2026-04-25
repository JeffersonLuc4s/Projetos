/**
 * Estatísticas de desconto por marca na Beleza na Web (Rakuten Product Search).
 *
 * Para cada marca da lista BRANDS:
 *   - Pagina até esgotar os resultados (máx MAX_PAGES × PAGE_SIZE)
 *   - Filtra produtos de beleza (isMakeupProduct)
 *   - Conta quantos estão acima dos limiares ≥40, ≥50, ≥60, ≥70
 *
 * Saída: tabela no console ordenada por ≥50% + CSV em scripts/brand-stats.csv.
 *
 * Uso: npx tsx scripts/brand-stats.ts
 */

import "dotenv/config";
import { writeFileSync } from "fs";
import { BRANDS } from "../src/collectors/brands";
import { searchRakutenProducts, getAdvertiserId } from "../src/collectors/rakuten";
import { isMakeupProduct } from "../src/collectors/types";

const THRESHOLDS = [40, 50, 60, 70] as const;
const MAX_PAGES = 10;
const PAGE_SIZE = 100;

interface BrandStats {
  brand: string;
  total: number;                     // total considerado beleza (pós-isMakeupProduct)
  inSale: number;                    // desconto > 0
  buckets: Record<number, number>;   // { 40: n, 50: n, 60: n, 70: n }
}

async function collectBrandStats(brand: string, mid: string): Promise<BrandStats> {
  const stats: BrandStats = {
    brand,
    total: 0,
    inSale: 0,
    buckets: { 40: 0, 50: 0, 60: 0, 70: 0 },
  };

  const seen = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const items = await searchRakutenProducts({
      keyword: brand,
      mid,
      max: PAGE_SIZE,
      pagenumber: page,
    });
    if (items.length === 0) break;

    for (const item of items) {
      if (!item.productname || !isMakeupProduct(item.productname)) continue;

      const id = item.sku ?? item.linkurl;
      if (seen.has(id)) continue;
      seen.add(id);
      stats.total++;

      const hasSale = item.saleprice > 0 && item.saleprice < item.price;
      if (!hasSale) continue;

      const pct = Math.round(((item.price - item.saleprice) / item.price) * 100);
      stats.inSale++;
      for (const t of THRESHOLDS) {
        if (pct >= t) stats.buckets[t]++;
      }
    }

    if (items.length < PAGE_SIZE) break;
  }

  return stats;
}

async function main() {
  const mid = getAdvertiserId("belezanaweb");
  if (!mid) {
    console.error("❌ MID da Beleza na Web não configurado no .env (RAKUTEN_ADVERTISER_BELEZA).");
    process.exit(1);
  }

  console.log(`Analisando ${BRANDS.length} marcas na Beleza na Web (MID ${mid})...\n`);
  const started = Date.now();

  const all: BrandStats[] = [];
  for (let i = 0; i < BRANDS.length; i++) {
    const brand = BRANDS[i];
    const prefix = `[${String(i + 1).padStart(3)}/${BRANDS.length}] ${brand.padEnd(24)}`;
    try {
      const s = await collectBrandStats(brand, mid);
      all.push(s);
      console.log(`${prefix} total=${String(s.total).padStart(4)}  promo=${String(s.inSale).padStart(4)}  ≥50%=${String(s.buckets[50]).padStart(4)}`);
    } catch (err: any) {
      console.log(`${prefix} ERRO: ${err.message}`);
      all.push({ brand, total: 0, inSale: 0, buckets: { 40: 0, 50: 0, 60: 0, 70: 0 } });
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  // Ordena por ≥50% desc
  all.sort((a, b) => b.buckets[50] - a.buckets[50]);

  // Tabela console
  console.log("\n" + "=".repeat(80));
  console.log("TABELA (ordenada por ≥50%)");
  console.log("=".repeat(80));
  const header = ["Marca".padEnd(26), "Total", "Promo", " ≥40%", " ≥50%", " ≥60%", " ≥70%"].join(" ");
  console.log(header);
  console.log("-".repeat(80));
  for (const s of all) {
    console.log(
      [
        s.brand.padEnd(26),
        String(s.total).padStart(5),
        String(s.inSale).padStart(5),
        String(s.buckets[40]).padStart(5),
        String(s.buckets[50]).padStart(5),
        String(s.buckets[60]).padStart(5),
        String(s.buckets[70]).padStart(5),
      ].join(" "),
    );
  }

  // Totais
  const sum = (k: keyof BrandStats["buckets"] | "total" | "inSale") =>
    all.reduce((acc, s) => acc + (typeof s[k as "total"] === "number" ? (s[k as "total"] as number) : s.buckets[k as number]), 0);
  console.log("-".repeat(80));
  console.log(
    [
      "TOTAL".padEnd(26),
      String(sum("total")).padStart(5),
      String(sum("inSale")).padStart(5),
      String(sum(40)).padStart(5),
      String(sum(50)).padStart(5),
      String(sum(60)).padStart(5),
      String(sum(70)).padStart(5),
    ].join(" "),
  );

  // CSV
  const csvLines = ["Marca,Total,Em promo,>=40%,>=50%,>=60%,>=70%"];
  for (const s of all) {
    csvLines.push(
      `"${s.brand}",${s.total},${s.inSale},${s.buckets[40]},${s.buckets[50]},${s.buckets[60]},${s.buckets[70]}`,
    );
  }
  const csvPath = "scripts/brand-stats.csv";
  // BOM UTF-8 para o Excel reconhecer os acentos no duplo-clique
  writeFileSync(csvPath, "﻿" + csvLines.join("\n"), "utf-8");

  console.log(`\n⏱  Tempo total: ${elapsed}s`);
  console.log(`📄 CSV salvo em: ${csvPath}`);
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});