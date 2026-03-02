import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import { requireAuth } from "@/lib/api-auth";
import mongoose from "mongoose";
import { z } from "zod";

const ReturnItemSchema = z.object({
  itemIndex: z.number().int().min(0),
  quantityToReturn: z.number().int().min(1),
});

const PostReturnSchema = z.object({
  returns: z.array(ReturnItemSchema).min(1),
});

export async function POST(
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
    const parsed = PostReturnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await connectDB();

    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "Completed") {
      return NextResponse.json(
        { error: "Only completed orders can have returns processed" },
        { status: 400 }
      );
    }

    const items = order.items;
    const returns = parsed.data.returns;

    for (const r of returns) {
      if (r.itemIndex >= items.length) {
        return NextResponse.json(
          { error: `Invalid item index: ${r.itemIndex}` },
          { status: 400 }
        );
      }
      const item = items[r.itemIndex];
      const alreadyReturned = item.returnedQuantity ?? 0;
      const maxReturn = item.quantity - alreadyReturned;
      if (r.quantityToReturn > maxReturn) {
        return NextResponse.json(
          {
            error: `Item ${r.itemIndex}: cannot return ${r.quantityToReturn} (max ${maxReturn} remaining)`,
          },
          { status: 400 }
        );
      }
    }

    for (const r of returns) {
      const item = items[r.itemIndex];
      const newReturned = (item.returnedQuantity ?? 0) + r.quantityToReturn;
      await Order.updateOne(
        { _id: id },
        { $set: { [`items.${r.itemIndex}.returnedQuantity`]: newReturned } }
      );
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { "variants.$[v].quantityAvailable": r.quantityToReturn } },
        { arrayFilters: [{ "v._id": item.variantId }] }
      );
    }

    const updated = await Order.findById(id);
    if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const allReturned = updated.items.every(
      (item) => (item.returnedQuantity ?? 0) >= item.quantity
    );
    if (allReturned) {
      await Order.updateOne({ _id: id }, { $set: { status: "Returned" } });
    }

    const result = await Order.findById(id)
      .populate("clientId", "firstName lastName phoneNumber address businessName")
      .populate("items.productId", "name category variants")
      .lean();
    if (!result) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const resultItems = (result.items || []).map(
      (item: { productId: { _id: string; name: string; variants?: { _id: unknown; variantName: string }[] }; variantId: unknown; quantity: number; price: number; returnedQuantity?: number }) => {
        const product = item.productId as { _id: string; name: string; variants?: { _id: unknown; variantName: string }[] };
        const variant = product?.variants?.find((v) => String(v._id) === String(item.variantId));
        return {
          ...item,
          variantName: variant?.variantName ?? null,
          returnedQuantity: item.returnedQuantity ?? 0,
        };
      }
    );
    return NextResponse.json({ ...result, items: resultItems });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to process return" }, { status: 500 });
  }
}
