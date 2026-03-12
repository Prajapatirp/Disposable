import mongoose from "mongoose";

export type OrderHistoryStatus =
  | "Order Created"
  | "Order Dispatched"
  | "Order Returned"
  | "Bill Updated"
  | "Order Completed"
  | "Added to bill"
  | "Removed from bill";

export interface IOrderHistory {
  _id: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  statusName: OrderHistoryStatus;
  action: string;
  performedBy: string;
  performedAt: Date;
}

const OrderHistorySchema = new mongoose.Schema<IOrderHistory>(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    statusName: { type: String, required: true },
    action: { type: String, required: true },
    performedBy: { type: String, required: true },
    performedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default (mongoose.models?.OrderHistory as mongoose.Model<IOrderHistory>) ||
  mongoose.model<IOrderHistory>("OrderHistory", OrderHistorySchema);
