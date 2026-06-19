import { NextRequest, NextResponse } from "next/server";
import type { PipelineStage } from "mongoose";
import { connectDB } from "@/lib/db";
import Product from "@/lib/models/Product";
import { buildProductFilterFromSearchParams } from "@/lib/store/productFilter";

function parseOptionalPrice(s: string | null): number | null {
  if (s == null || s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseOptionalQuantity(s: string | null): number | null {
  if (s == null || s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/**
 * Public catalog: filters from productFilter + optional min/max price (lowest variant price)
 * and min/max quantity (sum of variant quantityAvailable). Optional limit, skip.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter = buildProductFilterFromSearchParams(searchParams);

    const limitRaw = searchParams.get("limit");
    const skipRaw = searchParams.get("skip");
    const limit = limitRaw ? Math.min(Math.max(Number(limitRaw), 1), 500) : undefined;
    const skip = skipRaw ? Math.max(Number(skipRaw), 0) : 0;

    const minP = parseOptionalPrice(searchParams.get("minPrice"));
    const maxP = parseOptionalPrice(searchParams.get("maxPrice"));
    const hasPriceFilter = minP != null || maxP != null;

    const minQ = parseOptionalQuantity(searchParams.get("minQuantity"));
    const maxQ = parseOptionalQuantity(searchParams.get("maxQuantity"));
    const hasQtyFilter = minQ != null || maxQ != null;

    if (!hasPriceFilter && !hasQtyFilter) {
      let query = Product.find(filter).sort({ createdAt: -1 }).lean();
      if (skip > 0) query = query.skip(skip);
      if (typeof limit === "number") query = query.limit(limit);
      const products = await query.exec();
      return NextResponse.json(products);
    }

    const addFields: Record<string, unknown> = {};
    if (hasPriceFilter) {
      addFields.fromPrice = { $min: "$variants.pricePerUnit" };
    }
    if (hasQtyFilter) {
      addFields.totalQty = { $sum: "$variants.quantityAvailable" };
    }

    const postMatch: Record<string, Record<string, number>> = {};
    if (hasPriceFilter) {
      postMatch.fromPrice = {};
      if (minP != null) postMatch.fromPrice.$gte = minP;
      if (maxP != null) postMatch.fromPrice.$lte = maxP;
    }
    if (hasQtyFilter) {
      postMatch.totalQty = {};
      if (minQ != null) postMatch.totalQty.$gte = minQ;
      if (maxQ != null) postMatch.totalQty.$lte = maxQ;
    }

    const pipeline: PipelineStage[] = [
      { $match: filter },
      { $addFields: addFields },
      { $match: postMatch },
      { $sort: { createdAt: -1 } },
    ];
    if (skip > 0) pipeline.push({ $skip: skip });
    if (typeof limit === "number") pipeline.push({ $limit: limit });

    const project: Record<string, 0> = {};
    if (hasPriceFilter) project.fromPrice = 0;
    if (hasQtyFilter) project.totalQty = 0;
    pipeline.push({ $project: project });

    const products = await Product.aggregate(pipeline);
    return NextResponse.json(products);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
