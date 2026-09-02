import {
  checkDatabase,
  disconnectDatabase,
} from "../src/infrastructure/database/prisma.js";

async function main(): Promise<void> {
  try {
    await checkDatabase();
    console.log("Database connection check passed.");
  } catch {
    console.error("Database connection check failed.");
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

void main().catch(() => {
  console.error("Database connection check failed.");
  process.exitCode = 1;
});
