import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Category from "@/lib/models/Category";
import { requireAuth } from "@/lib/api-auth";
import { slugifyCategoryName } from "@/lib/categorySlug";
import { z } from "zod";

const CreateCategorySchema = z.object({
  name: z.string().min(1, "Name required").max(120),
  description: z.string().max(500).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    await connectDB();
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
    return NextResponse.json(categories);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const parsed = CreateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await connectDB();
    const name = parsed.data.name.trim();
    const slug = slugifyCategoryName(name);
    if (!slug) {
      return NextResponse.json({ error: "Invalid category name" }, { status: 400 });
    }
    const existing = await Category.findOne({ $or: [{ name }, { slug }] }).lean();
    if (existing) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }
    const category = await Category.create({
      name,
      slug,
      description: parsed.data.description?.trim() || undefined,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
