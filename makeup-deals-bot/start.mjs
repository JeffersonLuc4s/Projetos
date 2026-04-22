// Wrapper para PM2 no Windows — carrega tsx e inicia o bot
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("tsx/esm", pathToFileURL("./"));

await import("./src/index.ts");
