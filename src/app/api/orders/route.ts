import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import Bill from "@/lib/models/Bill";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";
import mongoose from "mongoose";

const OrderItemSchema = z.object({
  productId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id)),
  variantId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id)),
  quantity: z.number().min(1),
  price: z.number().min(0),
});

const CreateOrderSchema = z.object({
  clientId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id)),
  items: z.array(OrderItemSchema).min(1),
});

const ORDER_NUMBER_LENGTH = 6;
const ORDER_NUMBER_CHARS = "0123456789abcdef";

function generateOrderNumber(): string {
  let s = "";
  const bytes = new Uint8Array(ORDER_NUMBER_LENGTH);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    for (let i = 0; i < ORDER_NUMBER_LENGTH; i++) {
      s += ORDER_NUMBER_CHARS[bytes[i]! % ORDER_NUMBER_CHARS.length];
    }
  } else {
    for (let i = 0; i < ORDER_NUMBER_LENGTH; i++) {
      s += ORDER_NUMBER_CHARS[Math.floor(Math.random() * ORDER_NUMBER_CHARS.length)];
    }
  }
  return s;
}

async function getUniqueOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const orderNumber = generateOrderNumber();
    const exists = await Order.exists({ orderNumber });
    if (!exists) return orderNumber;
  }
  return generateOrderNumber() + Date.now().toString(36).slice(-4);
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const orderId = searchParams.get("orderId")?.trim();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      filter.clientId = new mongoose.Types.ObjectId(clientId);
    }
    if (orderId) {
      const cleanId = orderId.replace(/^Order\s*#?\s*/i, "").trim();
      if (mongoose.Types.ObjectId.isValid(cleanId) && cleanId.length === 24) {
        filter._id = new mongoose.Types.ObjectId(cleanId);
      } else {
        filter.orderNumber = new RegExp(cleanId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      }
    }
    if (startDate || endDate) {
      filter.createdDate = {};
      if (startDate) {
        (filter.createdDate as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (filter.createdDate as Record<string, Date>).$lte = end;
      }
    }

    const [orders, bills] = await Promise.all([
      Order.find(filter)
        .populate("clientId", "firstName lastName phoneNumber address businessName")
        .sort({ createdDate: -1 })
        .lean(),
      Bill.find({}).select("orderIds").lean(),
    ]);
    const orderIdsInBills = new Set<string>();
    for (const bill of bills) {
      for (const oid of bill.orderIds ?? []) {
        orderIdsInBills.add(String(oid));
      }
    }
    const ordersWithBillFlag = orders.map((o) => ({
      ...o,
      hasBill: orderIdsInBills.has(String(o._id)),
    }));
    return NextResponse.json(ordersWithBillFlag);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { clientId, items } = parsed.data;
    await connectDB();

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 400 }
        );
      }
      const variant = product.variants.find(
        (v) => v._id.toString() === item.variantId
      );
      if (!variant) {
        return NextResponse.json(
          { error: `Variant ${item.variantId} not found in product` },
          { status: 400 }
        );
      }
    }

    const orderNumber = await getUniqueOrderNumber();
    const order = await Order.create({
      orderNumber,
      clientId,
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        price: i.price,
      })),
      status: "Dispatch Stage",
    });
    const populated = await Order.findById(order._id)
      .populate("clientId", "firstName lastName phoneNumber address businessName")
      .lean();
    return NextResponse.json(populated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
