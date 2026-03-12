/**
 * Seed admin user. Loads .env.local and creates/updates admin in MongoDB.
 * Uses native mongodb driver (no mongoose) to avoid debug module dependency.
 * Usage: node scripts/seed-admin.js
 * Or: npm run seed
 */
const path = require("path");
const fs = require("fs");

// Load .env.local into process.env
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb+srv://ravipraeclarum:jt0dX6gXMiCICDgU@cluster0.4dtn8.mongodb.net/disposable-admin?retryWrites=true&w=majority";

const ADMIN_EMAIL = "admin123@yopmail.com";
const ADMIN_PASSWORD = "Admin@123";

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  try {
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const now = new Date();
    await client.db().collection("admins").updateOne(
      { email: ADMIN_EMAIL },
      {
        $set: {
          email: ADMIN_EMAIL,
          password: hashed,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
    console.log("Admin seeded successfully.");
    console.log("  Email:", ADMIN_EMAIL);
    console.log("  Password:", ADMIN_PASSWORD);
  } finally {
    await client.close();
  }
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
