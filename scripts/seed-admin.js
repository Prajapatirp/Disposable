/**
 * Seed admin user. Loads .env.local and creates/updates admin in MongoDB.
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

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/disposable-admin";

const ADMIN_EMAIL = "admin123@yopmail.com";
const ADMIN_PASSWORD = "Admin@123";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const now = new Date();
  await mongoose.connection.collection("admins").updateOne(
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
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
