import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Category from "@/lib/models/Category";
import Product from "@/lib/models/Product";
import { requireAuth } from "@/lib/api-auth";
import { slugifyCategoryName } from "@/lib/categorySlug";
import { syncProductCategoryNames } from "@/lib/productCategory";
import { z } from "zod";
import mongoose from "mongoose";

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    await connectDB();
    const category = await Category.findById(id).lean();
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const body = await req.json();
    const parsed = UpdateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await connectDB();
    const update: Record<string, unknown> = {};
    if (parsed.data.description !== undefined) {
      update.description = parsed.data.description.trim();
    }
    if (parsed.data.sortOrder !== undefined) update.sortOrder = parsed.data.sortOrder;
    if (parsed.data.isActive !== undefined) update.isActive = parsed.data.isActive;
    if (parsed.data.name !== undefined) {
      const name = parsed.data.name.trim();
      const slug = slugifyCategoryName(name);
      if (!slug) {
        return NextResponse.json({ error: "Invalid category name" }, { status: 400 });
      }
      const dup = await Category.findOne({
        _id: { $ne: id },
        $or: [{ name }, { slug }],
      }).lean();
      if (dup) {
        return NextResponse.json({ error: "Category name already in use" }, { status: 409 });
      }
      update.name = name;
      update.slug = slug;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    const category = await Category.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    if (parsed.data.name !== undefined) {
      await syncProductCategoryNames(category._id as mongoose.Types.ObjectId, category.name);
    }
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    await connectDB();
    const inUse = await Product.countDocuments({ categoryId: id });
    if (inUse > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${inUse} product(s) use this category` },
        { status: 409 }
      );
    }
    const category = await Category.findByIdAndDelete(id);
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
