require("dotenv/config");
const { ApiClient, DefaultApi, SearchItemsRequestContent } = require("@amzn/creatorsapi-nodejs-sdk");

const apiClient = new ApiClient();
apiClient.credentialId = process.env.AMAZON_CLIENT_ID;
apiClient.credentialSecret = process.env.AMAZON_CLIENT_SECRET;
apiClient.version = process.env.AMAZON_API_VERSION || "3.1";

const api = new DefaultApi(apiClient);

(async () => {
  const req = new SearchItemsRequestContent();
  req.partnerTag = process.env.AMAZON_AFFILIATE_TAG;
  req.keywords = "Naruto";
  req.searchIndex = "Books";
  req.itemCount = 3;
  req.resources = [
    "images.primary.medium",
    "itemInfo.title",
    "itemInfo.byLineInfo",
    "offersV2.listings.price",
    "offersV2.listings.dealDetails",
    "offersV2.listings.availability",
  ];

  try {
    const res = await api.searchItems("www.amazon.com.br", { searchItemsRequestContent: req });
    console.log("OK. Resposta:\n", JSON.stringify(res, null, 2));
  } catch (err) {
    console.log("ERRO — tipo:", err?.constructor?.name);
    console.log("message:", err?.message);
    console.log("status:", err?.status);
    console.log("response.statusCode:", err?.response?.statusCode);
    console.log("response.body:", err?.response?.body);
    console.log("response.text:", err?.response?.text?.slice?.(0, 500));
    console.log("response.headers:", err?.response?.headers);
    console.log("stack:", err?.stack?.split("\n").slice(0, 5).join("\n"));
  }
})();
