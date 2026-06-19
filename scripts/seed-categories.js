/**
 * Seed default categories and link existing products by category name.
 * Usage: node scripts/seed-categories.js
 * Or: npm run seed:categories
 */
const path = require("path");
const fs = require("fs");

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

const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://ravipraeclarum:jt0dX6gXMiCICDgU@cluster0.4dtn8.mongodb.net/disposable-admin?retryWrites=true&w=majority";

const DEFAULT_CATEGORIES = [
  { name: "Foodservice & Catering", sortOrder: 0 },
  { name: "Medical & Healthcare", sortOrder: 1 },
  { name: "Household & Personal Care", sortOrder: 2 },
  { name: "Retail & Packaging", sortOrder: 3 },
];

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  try {
    const db = client.db();
    const categories = db.collection("categories");
    const products = db.collection("products");
    const now = new Date();

    for (const item of DEFAULT_CATEGORIES) {
      const slug = slugify(item.name);
      await categories.updateOne(
        { name: item.name },
        {
          $set: {
            name: item.name,
            slug,
            sortOrder: item.sortOrder,
            isActive: true,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
    }

    const allCats = await categories.find({}).toArray();
    const byName = new Map(allCats.map((c) => [c.name, c]));

    const productList = await products.find({}).toArray();
    let linked = 0;
    for (const p of productList) {
      if (!p.category) continue;
      const cat = byName.get(p.category);
      if (!cat) continue;
      if (p.categoryId && String(p.categoryId) === String(cat._id)) continue;
      await products.updateOne(
        { _id: p._id },
        { $set: { categoryId: cat._id, category: cat.name, updatedAt: now } }
      );
      linked++;
    }

    console.log("Categories seeded:", allCats.length);
    console.log("Products linked to categories:", linked);
  } finally {
    await client.close();
  }
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
