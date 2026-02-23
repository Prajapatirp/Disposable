import mongoose from "mongoose";

export interface IVariant {
  _id: mongoose.Types.ObjectId;
  variantName: string;
  quantityAvailable: number;
  pricePerUnit: number;
}

export const VariantSchema = new mongoose.Schema<IVariant>(
  {
    variantName: { type: String, required: true },
    quantityAvailable: { type: Number, required: true, default: 0 },
    pricePerUnit: { type: Number, required: true },
  },
  { _id: true }
);
