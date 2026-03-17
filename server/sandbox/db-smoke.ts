import { createDb } from "@paperclipai/db";
import { sql } from "drizzle-orm";

const db = createDb(
  process.env.DATABASE_URL ??
    "postgres://paperclip:paperclip@127.0.0.1:54330/paperclip",
);

const result = await db.execute(sql`select 1 as ok`);
console.log(JSON.stringify(result, null, 2));
