import "dotenv/config";
const { ApiClient, DefaultApi, SearchItemsRequestContent } = require("@amzn/creatorsapi-nodejs-sdk");

(async () => {
  const apiClient = new ApiClient();
  apiClient.credentialId = process.env.AMAZON_CLIENT_ID;
  apiClient.credentialSecret = process.env.AMAZON_CLIENT_SECRET;
  apiClient.version = process.env.AMAZON_API_VERSION || "3.1";
  const api = new DefaultApi(apiClient);

  const req = new SearchItemsRequestContent();
  req.partnerTag = process.env.AMAZON_AFFILIATE_TAG!;
  req.keywords = "George Orwell";
  req.searchIndex = "Books";
  req.itemCount = 10;
  req.resources = [
    "itemInfo.title",
    "itemInfo.byLineInfo",
    "offersV2.listings.price",
  ];

  const res = await api.searchItems("www.amazon.com.br", { searchItemsRequestContent: req });
  const items = res?.searchResult?.items ?? [];
  for (const item of items) {
    const name = item?.itemInfo?.title?.displayValue ?? "";
    const contribs = (item?.itemInfo?.byLineInfo?.contributors ?? [])
      .map((c: any) => `${c?.name}[${c?.role ?? c?.roleType ?? "?"}]`)
      .join(", ");
    const disc = item?.offersV2?.listings?.[0]?.price?.savings?.percentage ?? 0;
    console.log(`- ${name.slice(0, 55)} disc=${disc}%`);
    console.log(`    autores: ${contribs}`);
  }
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});