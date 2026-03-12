import mongoose from "mongoose";
import { ORDER_STATUSES, type OrderStatus } from "../constants";

export { ORDER_STATUSES };
export type { OrderStatus };

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  variantId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
}

export interface IOrder {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  status: OrderStatus;
  createdDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new mongoose.Schema<IOrderItem>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { _id: true }
);

const OrderSchema = new mongoose.Schema<IOrder>(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    items: [OrderItemSchema],
    status: { type: String, required: true, enum: ORDER_STATUSES, default: "Dispatch Stage" },
    createdDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default (mongoose.models?.Order as mongoose.Model<IOrder>) || mongoose.model<IOrder>("Order", OrderSchema);
