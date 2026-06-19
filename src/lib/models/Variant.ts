import mongoose from "mongoose";

export interface IVariant {
  _id: mongoose.Types.ObjectId;
  variantName: string;
  quantityAvailable: number;
  pricePerUnit: number;
  /** Public URL path under `/uploads/...` or absolute URL (first image; kept for backward compatibility) */
  imageUrl?: string;
  /** All variant images (order preserved). */
  imageUrls?: string[];
}

export const VariantSchema = new mongoose.Schema<IVariant>(
  {
    variantName: { type: String, required: true },
    quantityAvailable: { type: Number, required: true, default: 0 },
    pricePerUnit: { type: Number, required: true },
    imageUrl: { type: String },
    imageUrls: [{ type: String }],
  },
  { _id: true }
);
