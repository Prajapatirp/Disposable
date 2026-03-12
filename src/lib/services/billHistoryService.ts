import mongoose from "mongoose";
import BillHistory from "@/lib/models/BillHistory";
import { connectDB } from "@/lib/db";

export const BillHistoryService = {
  async add(
    billId: string | mongoose.Types.ObjectId,
    action: string,
    details: string | undefined,
    performedBy: string
  ) {
    const id = typeof billId === "string" ? billId : billId.toString();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    await connectDB();
    const doc = await BillHistory.create({
      billId: new mongoose.Types.ObjectId(id),
      action,
      details,
      performedBy: performedBy?.trim() ? performedBy.trim() : "System",
      performedAt: new Date(),
    });
    return doc.toObject();
  },

  async getByBillId(billId: string | mongoose.Types.ObjectId) {
    const id = typeof billId === "string" ? billId : billId.toString();
    if (!mongoose.Types.ObjectId.isValid(id)) return [];
    await connectDB();
    const list = await BillHistory.find({ billId: new mongoose.Types.ObjectId(id) })
      .sort({ performedAt: -1 })
      .lean();
    return list;
  },

  /** Copy all history entries from previousBillId to newBillId (e.g. when regenerating a bill). */
  async copyHistoryFromBill(
    previousBillId: string | mongoose.Types.ObjectId,
    newBillId: string | mongoose.Types.ObjectId
  ): Promise<number> {
    const prevId = typeof previousBillId === "string" ? previousBillId : previousBillId.toString();
    const newId = typeof newBillId === "string" ? newBillId : newBillId.toString();
    if (!mongoose.Types.ObjectId.isValid(prevId) || !mongoose.Types.ObjectId.isValid(newId))
      return 0;
    await connectDB();
    const entries = await BillHistory.find({ billId: new mongoose.Types.ObjectId(prevId) })
      .sort({ performedAt: 1 })
      .lean();
    const newBillObjId = new mongoose.Types.ObjectId(newId);
    for (const e of entries) {
      await BillHistory.create({
        billId: newBillObjId,
        action: e.action,
        details: e.details,
        performedBy: e.performedBy,
        performedAt: e.performedAt,
      });
    }
    return entries.length;
  },
};
