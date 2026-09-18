require("dotenv").config();

const { createClient } = require("@libsql/client");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  try {
    await db.execute(`
      ALTER TABLE products
      ADD COLUMN image_url TEXT
    `);

    console.log("✅ image_url column added successfully!");
  } catch (error) {
    console.error("❌ Migration error:", error);
  }
}

migrate();