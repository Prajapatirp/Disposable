import mongoose from "mongoose";

export interface IBillHistory {
  _id: mongoose.Types.ObjectId;
  billId: mongoose.Types.ObjectId;
  action: string;
  details?: string;
  performedBy: string;
  performedAt: Date;
}

const BillHistorySchema = new mongoose.Schema<IBillHistory>(
  {
    billId: { type: mongoose.Schema.Types.ObjectId, ref: "Bill", required: true, index: true },
    action: { type: String, required: true },
    details: { type: String },
    performedBy: { type: String, required: true },
    performedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default (mongoose.models?.BillHistory as mongoose.Model<IBillHistory>) ||
  mongoose.model<IBillHistory>("BillHistory", BillHistorySchema);
