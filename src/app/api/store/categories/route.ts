import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Category from "@/lib/models/Category";

/** Public list of active categories for storefront catalog filters. */
export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select("_id name slug description sortOrder")
      .lean();
    return NextResponse.json(categories);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
