import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import Bill from "@/lib/models/Bill";
import { requireAuth } from "@/lib/api-auth";
import { OrderHistoryService } from "@/lib/services/orderHistoryService";
import { BillHistoryService } from "@/lib/services/billHistoryService";
import mongoose from "mongoose";
import { z } from "zod";

const ReturnItemSchema = z.object({
  itemIndex: z.number().int().min(0),
  quantityToReturn: z.number().int().min(1),
});

const PostReturnSchema = z.object({
  returns: z.array(ReturnItemSchema),
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

    if (order.status !== "Dispatch Stage" && order.status !== "Completed") {
      return NextResponse.json(
        { error: "Only orders in Dispatch Stage or Completed can have returns processed" },
        { status: 400 }
      );
    }

    const billWithOrder = await Bill.findOne({ orderIds: id }).select("status").lean();
    if (billWithOrder?.status === "Paid") {
      return NextResponse.json(
        { error: "Cannot return order: bill is already paid" },
        { status: 400 }
      );
    }

    // Dispatch Stage: full order return (no item quantities; stock was not decremented yet)
    if (order.status === "Dispatch Stage") {
      await OrderHistoryService.add(
        id,
        "Order Returned",
        "Order returned",
        auth.session.email ?? "Admin"
      );
      const result = await Order.findById(id)
        .populate("clientId", "firstName lastName phoneNumber address businessName")
        .populate("items.productId", "name category variants")
        .lean();
      if (!result) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      const resultItems = (result.items || []).map((item) => {
        const product = item.productId as unknown as { _id: string; name: string; variants?: { _id: unknown; variantName: string }[] } | null;
        const variant = product?.variants?.find((v) => String(v._id) === String(item.variantId));
        return {
          ...item,
          variantName: variant?.variantName ?? null,
          returnedQuantity: item.returnedQuantity ?? 0,
        };
      });
      return NextResponse.json({ ...result, items: resultItems });
    }

    // Completed: item-level return (requires at least one return)
    const returns = parsed.data.returns;
    if (!returns.length) {
      return NextResponse.json(
        { error: "Specify at least one item and quantity to return" },
        { status: 400 }
      );
    }

    const items = order.items;

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
    const performedBy = auth.session.email ?? "Admin";

    // On any return (partial or full) from Completed: set status to Dispatch Stage so a new bill can be generated
    await Order.updateOne({ _id: id }, { $set: { status: "Dispatch Stage" } });
    await OrderHistoryService.add(
      id,
      "Order Returned",
      allReturned ? "Order returned" : "Partial return processed",
      performedBy
    );

    // Update bill: remove this order from bill, recalc totalAmount; delete bill if no orders left
    const billDoc = await Bill.findOne({ orderIds: id }).select("_id orderIds status billNumber").lean();
    if (billDoc && billDoc.status === "Pending") {
      const billNumber = (billDoc as { billNumber?: string }).billNumber ?? `BILL-${String(billDoc._id).slice(-6)}`;
      const orderIdsRaw = (billDoc.orderIds ?? []).map((oid) => String(oid)).filter((oid) => oid !== id);
      const orderIds = orderIdsRaw.map((oid) => new mongoose.Types.ObjectId(oid));
      if (orderIds.length === 0) {
        await Bill.deleteOne({ _id: billDoc._id });
        await OrderHistoryService.add(id, "Removed from bill", `Removed from bill ${billNumber}`, performedBy);
      } else {
        const remainingOrders = await Order.find({ _id: { $in: orderIds } }).select("items").lean();
        let newTotal = 0;
        for (const o of remainingOrders) {
          for (const item of o.items ?? []) {
            newTotal += item.quantity * item.price;
          }
        }
        await Bill.updateOne(
          { _id: billDoc._id },
          { $set: { orderIds, totalAmount: newTotal } }
        );
        await BillHistoryService.add(
          String(billDoc._id),
          "Bill updated",
          `Amount recalculated (order returned). New amount: ₹${newTotal.toLocaleString()}`,
          performedBy
        );
        await OrderHistoryService.add(id, "Removed from bill", `Removed from bill ${billNumber}`, performedBy);
      }
    }

    const result = await Order.findById(id)
      .populate("clientId", "firstName lastName phoneNumber address businessName")
      .populate("items.productId", "name category variants")
      .lean();
    if (!result) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const resultItems = (result.items || []).map((item) => {
      const product = item.productId as unknown as { _id: string; name: string; variants?: { _id: unknown; variantName: string }[] } | null;
      const variant = product?.variants?.find((v) => String(v._id) === String(item.variantId));
      return {
        ...item,
        variantName: variant?.variantName ?? null,
        returnedQuantity: item.returnedQuantity ?? 0,
      };
    });
    return NextResponse.json({ ...result, items: resultItems });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to process return" }, { status: 500 });
  }
}
