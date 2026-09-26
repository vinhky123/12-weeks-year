import { createDb } from "../src/server/db";

const target = process.env.TWY_DB_PATH ?? "data/app.db";
const { sqlite } = createDb(target);
console.log(`Migrations applied to ${target}`);
sqlite.close();
