import { PrismaClient } from "../../src/generated/prisma/client.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve the database path relative to the project root
const dbPath = resolve(__dirname, "../../prisma/dev.db");

const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
export const prisma = new PrismaClient({ adapter });
