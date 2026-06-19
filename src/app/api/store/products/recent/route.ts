import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/lib/models/Product";

/**
 * Recently added products (newest first).
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 8, 1), 50);

    const products = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(products);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch recent products" }, { status: 500 });
  }
}
