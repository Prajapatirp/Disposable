import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Bill from "@/lib/models/Bill";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import { requireAuth } from "@/lib/api-auth";
import { OrderHistoryService } from "@/lib/services/orderHistoryService";
import { BillHistoryService } from "@/lib/services/billHistoryService";
import { z } from "zod";
import mongoose from "mongoose";

const CreateBillSchema = z.object({
  clientId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id)),
  orderIds: z.array(z.string().refine((id) => mongoose.Types.ObjectId.isValid(id))).min(1),
  /** When regenerating a bill (e.g. after Delete & generate new), pass the previous bill id to copy its history. */
  previousBillId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id)).optional(),
});

async function getNextBillNumber(): Promise<string> {
  const last = await Bill.findOne()
    .sort({ billNumber: -1 })
    .select("billNumber")
    .lean() as { billNumber: string } | null;
  const prefix = "BILL-";
  const year = new Date().getFullYear();
  if (!last || !last.billNumber.startsWith(`${prefix}${year}`)) {
    return `${prefix}${year}-0001`;
  }
  const num = parseInt(last.billNumber.split("-")[2] || "0", 10);
  return `${prefix}${year}-${String(num + 1).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const billNumber = searchParams.get("billNumber")?.trim();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const filter: Record<string, unknown> = {};
    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      filter.clientId = new mongoose.Types.ObjectId(clientId);
    }
    if (status) filter.status = status;
    if (billNumber) {
      filter.billNumber = new RegExp(billNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }
    if (startDate || endDate) {
      filter.billDate = {};
      if (startDate) {
        (filter.billDate as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (filter.billDate as Record<string, Date>).$lte = end;
      }
    }

    const bills = await Bill.find(filter)
      .populate("clientId", "firstName lastName phoneNumber address businessName gstNumber companyAddress")
      .populate("orderIds")
      .sort({ createdAt: -1 })
      .lean();
    const replacementIds = Array.from(new Set(
      (bills as { replacedByBillId?: unknown }[])
        .map((b) => b.replacedByBillId)
        .filter((id): id is mongoose.Types.ObjectId => id != null && mongoose.Types.ObjectId.isValid(String(id)))
    ));
    const replacements =
      replacementIds.length === 0
        ? []
        : await Bill.find({ _id: { $in: replacementIds } })
            .select("_id billNumber")
            .lean();
    const replacementMap = Object.fromEntries(
      (replacements as { _id: mongoose.Types.ObjectId; billNumber: string }[]).map((r) => [
        String(r._id),
        { _id: String(r._id), billNumber: r.billNumber },
      ])
    );
    const billsWithReplacement = (bills as Record<string, unknown>[]).map((b) => {
      const rid = b.replacedByBillId;
      if (rid != null) {
        const key = typeof rid === "object" && rid && "_id" in rid ? String((rid as { _id: unknown })._id) : String(rid);
        if (replacementMap[key]) b.replacedByBillId = replacementMap[key];
      }
      return b;
    });
    return NextResponse.json(billsWithReplacement);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const parsed = CreateBillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { clientId, orderIds, previousBillId } = parsed.data;
    await connectDB();

    const orders = await Order.find({
      _id: { $in: orderIds },
      clientId,
      status: "Dispatch Stage",
    });
    if (orders.length !== orderIds.length) {
      return NextResponse.json(
        { error: "Some orders not found or not in Dispatch Stage" },
        { status: 400 }
      );
    }

    let totalAmount = 0;
    for (const order of orders) {
      for (const item of order.items) {
        const netQty = item.quantity - (item.returnedQuantity ?? 0);
        totalAmount += netQty * item.price;
      }
    }

    const billNumber = await getNextBillNumber();
    const bill = await Bill.create({
      billNumber,
      clientId,
      orderIds,
      totalAmount,
      status: "Pending",
      billDate: new Date(),
    });
    if (previousBillId) {
      await BillHistoryService.copyHistoryFromBill(previousBillId, bill._id);
      await Bill.findByIdAndUpdate(previousBillId, {
        $set: { replacedByBillId: bill._id },
      });
    }
    await BillHistoryService.add(
      bill._id,
      "Bill created",
      `Amount: ₹${totalAmount.toLocaleString()}, ${orderIds.length} order(s)`,
      auth.session.email ?? "Admin"
    );
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { status: "Completed" } }
    );
    for (const oid of orderIds) {
      await OrderHistoryService.add(
        oid,
        "Order Dispatched",
        "Order dispatched",
        auth.session.email ?? "Admin"
      );
      await OrderHistoryService.add(
        oid,
        "Added to bill",
        `Added to bill ${bill.billNumber}`,
        auth.session.email ?? "Admin"
      );
    }
    

    // Decrement product variant quantities for each completed order (only net/remaining qty; returned qty already restored)
    for (const order of orders) {
      for (const item of order.items) {
        const netQty = item.quantity - (item.returnedQuantity ?? 0);
        if (netQty <= 0) continue;
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { "variants.$[v].quantityAvailable": -netQty } },
          { arrayFilters: [{ "v._id": item.variantId }] }
        );
      }
    }

    const populated = await Bill.findById(bill._id)
      .populate("clientId", "firstName lastName phoneNumber address businessName gstNumber companyAddress")
      .populate("orderIds")
      .lean();
    return NextResponse.json(populated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create bill" }, { status: 500 });
  }
}
