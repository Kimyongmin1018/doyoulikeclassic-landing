import { createApp } from "./src/app.js";
import { loadConfig } from "./src/config.js";

const config = loadConfig();
const app = createApp(config);

app.listen(config.port, () => {
  console.log(`Classic rotation landing running at ${config.publicBaseUrl}`);
});
