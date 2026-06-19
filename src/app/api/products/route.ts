import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/lib/models/Product";
import { requireAuth } from "@/lib/api-auth";
import { buildProductFilterFromSearchParams } from "@/lib/store/productFilter";
import { resolveCategoryForProduct } from "@/lib/productCategory";
import { normalizeVariantForDb } from "@/lib/productVariantNormalize";
import { z } from "zod";

const VariantSchema = z.object({
  variantName: z.string().min(1),
  quantityAvailable: z.coerce.number().min(0),
  pricePerUnit: z.coerce.number().min(0),
  imageUrl: z.string().max(2048).optional(),
  imageUrls: z.array(z.string().max(2048)).max(20).optional(),
});

const CreateProductSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1, "Category required"),
  description: z.string().optional(),
  thumbnailUrl: z.string().max(2048).optional(),
  variants: z.array(VariantSchema).default([]),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter = buildProductFilterFromSearchParams(searchParams);

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json(products);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const parsed = CreateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await connectDB();
    let categoryFields: { categoryId: import("mongoose").Types.ObjectId; category: string };
    try {
      categoryFields = await resolveCategoryForProduct(parsed.data.categoryId);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid category" },
        { status: 400 }
      );
    }
    const { thumbnailUrl, categoryId: _cid, ...rest } = parsed.data;
    const product = await Product.create({
      ...rest,
      ...categoryFields,
      thumbnailUrl: thumbnailUrl?.trim() || undefined,
      variants: parsed.data.variants.map(normalizeVariantForDb),
    });
    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
