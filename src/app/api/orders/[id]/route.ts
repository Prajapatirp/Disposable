import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import Bill from "@/lib/models/Bill";
import { requireAuth } from "@/lib/api-auth";
import { ORDER_STATUSES } from "@/lib/models";
import mongoose from "mongoose";
import { z } from "zod";

const UpdateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES as unknown as [string, ...string[]]),
});

const OrderItemSchema = z.object({
  productId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id)),
  variantId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id)),
  quantity: z.number().min(1),
  price: z.number().min(0),
});

const PutOrderSchema = z.object({
  clientId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id)),
  items: z.array(OrderItemSchema).min(1),
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
    const order = await Order.findById(id)
      .populate("clientId", "firstName lastName phoneNumber address businessName gstNumber companyAddress")
      .populate("items.productId", "name category variants")
      .lean();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const items = (order.items || []).map((item: { productId: { _id: string; name: string; variants?: { _id: unknown; variantName: string }[] }; variantId: unknown; quantity: number; price: number; returnedQuantity?: number }) => {
      const product = item.productId as { _id: string; name: string; variants?: { _id: unknown; variantName: string }[] };
      const variant = product?.variants?.find((v) => String(v._id) === String(item.variantId));
      return {
        ...item,
        variantName: variant?.variantName ?? null,
        returnedQuantity: item.returnedQuantity ?? 0,
      };
    });
    return NextResponse.json({ ...order, items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
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
    const parsed = UpdateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await connectDB();
    const newStatus = parsed.data.status;

    if (newStatus === "Returned") {
      return NextResponse.json(
        { error: "Use the Return order form to process returns (partial or full)" },
        { status: 400 }
      );
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: { status: newStatus } },
      { new: true }
    )
      .populate("clientId", "firstName lastName phoneNumber address businessName")
      .lean();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function PUT(
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
    const parsed = PutOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await connectDB();
    const existingOrder = await Order.findById(id);
    if (!existingOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const billWithOrder = await Bill.findOne({ orderIds: id });
    if (billWithOrder) {
      return NextResponse.json(
        { error: "Cannot edit order: a bill has already been generated for it" },
        { status: 400 }
      );
    }
    const { clientId, items } = parsed.data;
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
    const order = await Order.findByIdAndUpdate(
      id,
      {
        $set: {
          clientId,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
            price: i.price,
          })),
        },
      },
      { new: true }
    )
      .populate("clientId", "firstName lastName phoneNumber address businessName")
      .lean();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
