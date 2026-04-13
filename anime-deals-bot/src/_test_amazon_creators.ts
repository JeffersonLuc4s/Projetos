import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const clientId = process.env.AMAZON_CLIENT_ID!;
  const clientSecret = process.env.AMAZON_CLIENT_SECRET!;
  const tag = process.env.AMAZON_AFFILIATE_TAG!;

  console.log("1. Obtendo token...");
  let token: string;
  try {
    const res = await axios.post(
      "https://api.amazon.com/auth/o2/token",
      {
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "creatorsapi::default",
      },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    token = res.data.access_token;
    console.log("✅ Token obtido:", token.slice(0, 30) + "...");
  } catch (err: any) {
    console.error("❌ Falha no token:", JSON.stringify(err?.response?.data ?? err?.message));
    return;
  }

  console.log("\n2. Buscando produtos...");
  try {
    const res = await axios.post(
      "https://creatorsapi.amazon/catalog/v1/searchItems",
      {
        partnerTag: tag,
        partnerType: "Associates",
        keywords: "figure anime",
        searchIndex: "All",
        resources: [
          "itemInfo.title",
          "offersV2.listings.price",
          "offersV2.listings.dealDetails",
          "images.primary.large",
          "customerReviews.count",
          "customerReviews.starRating",
        ],
        itemCount: 5,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-marketplace": "www.amazon.com.br",
        },
        timeout: 10000,
      }
    );
    const items = res.data?.itemsResult?.items ?? [];
    console.log(`✅ ${items.length} itens encontrados`);
    items.forEach((item: any) => {
      const name = item.itemInfo?.title?.displayValue ?? "(sem nome)";
      const price = item.offersV2?.listings?.[0]?.price?.amount ?? 0;
      const url = item.detailPageURL ?? "";
      console.log(`  - ${name.slice(0, 55)} | R$${price}`);
      console.log(`    URL: ${url.slice(0, 80)}`);
    });
  } catch (err: any) {
    console.error("❌ Falha na busca:", JSON.stringify(err?.response?.data ?? err?.message));
  }
}

main();
