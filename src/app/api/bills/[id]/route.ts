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

const UpdateBillSchema = z.object({
  status: z.literal("Paid").optional(),
  paidDate: z.union([z.string(), z.date()]).optional(),
  billDate: z.union([z.string(), z.date()]).optional(),
  totalAmount: z.number().min(0).optional(),
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
    const bill = await Bill.findById(id)
      .populate("clientId", "firstName lastName phoneNumber address businessName gstNumber companyAddress")
      .populate("orderIds")
      .lean();
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    const rawBill = bill as { replacedByBillId?: mongoose.Types.ObjectId };
    if (rawBill.replacedByBillId) {
      const replacement = await Bill.findById(rawBill.replacedByBillId)
        .select("_id billNumber")
        .lean();
      if (replacement) {
        (bill as Record<string, unknown>).replacedByBillId = {
          _id: String(replacement._id),
          billNumber: replacement.billNumber,
        };
      }
    }
    return NextResponse.json(bill);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch bill" }, { status: 500 });
  }
}

export async function PATCH(
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
    const parsed = UpdateBillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await connectDB();

    const update: Record<string, unknown> = {};
    if (parsed.data.status === "Paid") {
      update.status = "Paid";
      update.paidDate = parsed.data.paidDate ? new Date(parsed.data.paidDate) : new Date();
    }
    if (parsed.data.billDate !== undefined) {
      update.billDate = new Date(parsed.data.billDate);
    }
    if (parsed.data.totalAmount !== undefined) {
      update.totalAmount = parsed.data.totalAmount;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const existingBill = await Bill.findById(id).select("totalAmount status").lean();
    const previousAmount = existingBill?.totalAmount;
    if (existingBill && (existingBill as { status?: string }).status === "Superseded") {
      return NextResponse.json(
        { error: "Cannot update a superseded bill. It is kept for history only." },
        { status: 400 }
      );
    }

    const bill = await Bill.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate("clientId", "firstName lastName phoneNumber address businessName gstNumber companyAddress")
      .populate("orderIds")
      .lean();
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

    const performedBy = auth.session.email ?? "Admin";
    if (parsed.data.status === "Paid") {
      await BillHistoryService.add(String(bill._id), "Bill marked paid", undefined, performedBy);
      const orderIds = (bill.orderIds ?? []) as { _id?: unknown }[];
      for (const o of orderIds) {
        const oid = o && typeof o === "object" && o._id != null ? String(o._id) : null;
        if (oid) {
          await OrderHistoryService.add(oid, "Bill Updated", "Bill updated", performedBy);
          await OrderHistoryService.add(oid, "Order Completed", "Order completed", performedBy);
        }
      }
    } else {
      const details: string[] = [];
      if (parsed.data.billDate !== undefined) details.push("date updated");
      if (parsed.data.totalAmount !== undefined) {
        const newAmount = (bill as { totalAmount?: number }).totalAmount;
        if (previousAmount !== undefined && previousAmount !== newAmount) {
          details.push(`Amount: ₹${Number(previousAmount).toLocaleString()} → ₹${Number(newAmount).toLocaleString()}`);
        } else {
          details.push(`Amount: ₹${Number(newAmount).toLocaleString()}`);
        }
      }
      await BillHistoryService.add(
        String(bill._id),
        "Bill updated",
        details.length ? details.join(". ") : undefined,
        performedBy
      );
    }
    return NextResponse.json(bill);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update bill" }, { status: 500 });
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

    const bill = await Bill.findById(id).select("orderIds status billNumber").lean();
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    if (bill.status !== "Pending") {
      return NextResponse.json(
        { error: "Only Pending bills can be deleted. Paid bills cannot be deleted." },
        { status: 400 }
      );
    }

    const billNumber = (bill as { billNumber?: string }).billNumber ?? `BILL-${String(bill._id).slice(-6)}`;
    const orderIds = (bill.orderIds ?? []).map((oid) => new mongoose.Types.ObjectId(oid));
    const orders = await Order.find({ _id: { $in: orderIds } }).lean();
    const performedBy = auth.session.email ?? "Admin";

    for (const order of orders) {
      await Order.updateOne(
        { _id: order._id },
        { $set: { status: "Dispatch Stage" } }
      );
      await OrderHistoryService.add(
        String(order._id),
        "Removed from bill",
        `Removed from bill ${billNumber}`,
        performedBy
      );
      for (const item of order.items ?? []) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { "variants.$[v].quantityAvailable": item.quantity } },
          { arrayFilters: [{ "v._id": item.variantId }] }
        );
      }
    }

    // Do not remove the bill record: mark as Superseded and clear orderIds so history is preserved
    await Bill.findByIdAndUpdate(id, {
      $set: {
        status: "Superseded",
        orderIds: [],
        totalAmount: 0,
      },
    });
    await BillHistoryService.add(
      id,
      "Bill superseded",
      "Orders removed for new bill. Previous billing record kept for history.",
      performedBy
    );
    return NextResponse.json({ success: true, message: "Bill superseded; orders available for new bill" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete bill" }, { status: 500 });
  }
}
