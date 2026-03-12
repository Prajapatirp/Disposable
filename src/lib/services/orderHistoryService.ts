import mongoose from "mongoose";
import OrderHistory, { type OrderHistoryStatus } from "@/lib/models/OrderHistory";
import { connectDB } from "@/lib/db";

export const OrderHistoryService = {
  async add(
    orderId: string | mongoose.Types.ObjectId,
    statusName: OrderHistoryStatus,
    action: string,
    performedBy: string
  ) {
    const id = typeof orderId === "string" ? orderId : orderId.toString();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    await connectDB();
    const doc = await OrderHistory.create({
      orderId: new mongoose.Types.ObjectId(id),
      statusName,
      action,
      performedBy: performedBy && performedBy.trim() ? performedBy.trim() : "System",
      performedAt: new Date(),
    });
    return doc.toObject();
  },

  async getByOrderId(orderId: string | mongoose.Types.ObjectId) {
    const id = typeof orderId === "string" ? orderId : orderId.toString();
    if (!mongoose.Types.ObjectId.isValid(id)) return [];
    const list = await OrderHistory.find({ orderId: new mongoose.Types.ObjectId(id) })
      .sort({ performedAt: 1 })
      .lean();
    return list;
  },
};
