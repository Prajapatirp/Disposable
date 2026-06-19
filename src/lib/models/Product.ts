import mongoose from "mongoose";
import { IVariant, VariantSchema } from "./Variant";

export interface IProduct {
  _id: mongoose.Types.ObjectId;
  name: string;
  /** Denormalized category name for display and catalog filters. */
  category: string;
  categoryId?: mongoose.Types.ObjectId;
  description?: string;
  /** List/card hero image on the storefront (optional). */
  thumbnailUrl?: string;
  variants: IVariant[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new mongoose.Schema<IProduct>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    description: { type: String },
    thumbnailUrl: { type: String },
    variants: [VariantSchema],
  },
  { timestamps: true }
);

ProductSchema.index({ categoryId: 1 });

export default (mongoose.models?.Product as mongoose.Model<IProduct>) || mongoose.model<IProduct>("Product", ProductSchema);
