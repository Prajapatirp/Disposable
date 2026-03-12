import mongoose from "mongoose";
import { BILL_STATUSES, type BillStatus } from "../constants";

export { BILL_STATUSES };
export type { BillStatus };

export interface IBill {
  _id: mongoose.Types.ObjectId;
  billNumber: string;
  clientId: mongoose.Types.ObjectId;
  orderIds: mongoose.Types.ObjectId[];
  totalAmount: number;
  status: BillStatus;
  billDate: Date;
  paidDate?: Date;
  /** Set when this bill is replaced by a new one (status becomes Superseded). */
  replacedByBillId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}


const BillSchema = new mongoose.Schema<IBill>(
  {
    billNumber: { type: String, required: true, unique: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    totalAmount: { type: Number, required: true },
    status: { type: String, required: true, enum: BILL_STATUSES, default: "Pending" },
    billDate: { type: Date, default: Date.now },
    paidDate: { type: Date },
    replacedByBillId: { type: mongoose.Schema.Types.ObjectId, ref: "Bill" },
  },
  { timestamps: true }
);

export default (mongoose.models?.Bill as mongoose.Model<IBill>) || mongoose.model<IBill>("Bill", BillSchema);
