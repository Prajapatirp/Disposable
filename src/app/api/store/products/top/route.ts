import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/lib/models/Product";
import Order from "@/lib/models/Order";
import mongoose from "mongoose";

/**
 * Best sellers by net units sold from orders in Completed or Dispatch Stage.
 * Excludes Cancelled and Returned orders entirely.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 8, 1), 50);

    const rows = await Order.aggregate<{ _id: mongoose.Types.ObjectId; units: number }>([
      {
        $match: {
          status: { $in: ["Completed", "Dispatch Stage"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          units: {
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    "$items.quantity",
                    { $ifNull: ["$items.returnedQuantity", 0] },
                  ],
                },
              ],
            },
          },
        },
      },
      { $match: { units: { $gt: 0 } } },
      { $sort: { units: -1 } },
      { $limit: limit },
    ]);

    const ids = rows.map((r) => r._id);
    if (ids.length === 0) {
      return NextResponse.json({ products: [], salesByProductId: {} });
    }

    const products = await Product.find({ _id: { $in: ids } }).lean();
    const byId = new Map(products.map((p) => [String(p._id), p]));
    const ordered = ids.map((id) => byId.get(String(id))).filter(Boolean);

    const salesByProductId: Record<string, number> = {};
    for (const r of rows) {
      salesByProductId[String(r._id)] = r.units;
    }

    return NextResponse.json({
      products: ordered,
      salesByProductId,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch top products" }, { status: 500 });
  }
}
