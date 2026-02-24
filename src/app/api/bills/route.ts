import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Bill from "@/lib/models/Bill";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";
import mongoose from "mongoose";

const CreateBillSchema = z.object({
  clientId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id)),
  orderIds: z.array(z.string().refine((id) => mongoose.Types.ObjectId.isValid(id))).min(1),
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
      .sort({ billDate: -1 })
      .lean();
    return NextResponse.json(bills);
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
    const { clientId, orderIds } = parsed.data;
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
        totalAmount += item.quantity * item.price;
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
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { status: "Completed" } }
    );

    // Decrement product variant quantities for each completed order
    for (const order of orders) {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { "variants.$[v].quantityAvailable": -item.quantity } },
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
