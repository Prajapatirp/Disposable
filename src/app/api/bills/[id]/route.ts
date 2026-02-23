import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Bill from "@/lib/models/Bill";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";
import mongoose from "mongoose";

const UpdateBillSchema = z.object({
  status: z.literal("Paid"),
  paidDate: z.union([z.string(), z.date()]).optional(),
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
    const update: { status: "Paid"; paidDate?: Date } = {
      status: "Paid",
      paidDate: parsed.data.paidDate ? new Date(parsed.data.paidDate) : new Date(),
    };
    const bill = await Bill.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate("clientId", "firstName lastName phoneNumber address businessName gstNumber companyAddress")
      .populate("orderIds")
      .lean();
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    return NextResponse.json(bill);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update bill" }, { status: 500 });
  }
}
