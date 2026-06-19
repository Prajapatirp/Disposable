import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/lib/models/Product";
import { requireAuth } from "@/lib/api-auth";
import { resolveCategoryForProduct } from "@/lib/productCategory";
import { z } from "zod";
import { normalizeVariantForDb } from "@/lib/productVariantNormalize";
import mongoose from "mongoose";

const VariantSchema = z.object({
  _id: z.string().optional(),
  variantName: z.string().min(1),
  quantityAvailable: z.coerce.number().min(0),
  pricePerUnit: z.coerce.number().min(0),
  imageUrl: z.string().max(2048).optional(),
  imageUrls: z.array(z.string().max(2048)).max(20).optional(),
});

const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  description: z.string().optional(),
  thumbnailUrl: z.union([z.string().max(2048), z.literal("")]).optional(),
  variants: z.array(VariantSchema).optional(),
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
    const product = await Product.findById(id).lean();
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
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
    const parsed = UpdateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await connectDB();
    const update: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.categoryId !== undefined) {
      try {
        const cat = await resolveCategoryForProduct(parsed.data.categoryId);
        update.categoryId = cat.categoryId;
        update.category = cat.category;
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Invalid category" },
          { status: 400 }
        );
      }
    }
    if (parsed.data.description !== undefined) update.description = parsed.data.description;
    if (parsed.data.thumbnailUrl !== undefined) {
      const t = parsed.data.thumbnailUrl.trim();
      update.thumbnailUrl = t.length > 0 ? t : null;
    }
    if (parsed.data.variants !== undefined) {
      update.variants = parsed.data.variants.map(normalizeVariantForDb);
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
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
    const product = await Product.findByIdAndDelete(id);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
