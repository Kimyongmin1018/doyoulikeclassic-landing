import fs from "node:fs";
import { createApp } from "./src/app.js";
import { loadConfig } from "./src/config.js";
import { createDatabase } from "./src/db/database.js";
import { seedDatabase } from "./src/db/seed.js";

const config = loadConfig();
const shouldSeed = !fs.existsSync(config.dbPath);

if (shouldSeed) {
  const db = createDatabase(config.dbPath);
  seedDatabase(db);
  db.close();
}

const app = createApp(config);

app.listen(config.port, () => {
  console.log(`Classic rotation landing running at ${config.publicBaseUrl}`);
});
