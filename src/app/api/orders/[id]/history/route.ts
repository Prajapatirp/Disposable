import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { OrderHistoryService } from "@/lib/services/orderHistoryService";
import mongoose from "mongoose";

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
    const history = await OrderHistoryService.getByOrderId(id);
    return NextResponse.json(history);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch order history" }, { status: 500 });
  }
}
