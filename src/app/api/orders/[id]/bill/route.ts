import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Bill from "@/lib/models/Bill";
import { requireAuth } from "@/lib/api-auth";
import mongoose from "mongoose";

/** GET /api/orders/[id]/bill - returns the bill that contains this order, if any. */
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
    const bill = await Bill.findOne({ orderIds: id })
      .populate("clientId", "firstName lastName phoneNumber address businessName gstNumber companyAddress")
      .lean();
    return NextResponse.json(bill ?? null);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch bill for order" }, { status: 500 });
  }
}
