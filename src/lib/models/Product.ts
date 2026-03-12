import mongoose from "mongoose";
import { IVariant, VariantSchema } from "./Variant";
import { PRODUCT_CATEGORIES, type ProductCategory } from "../constants";

export { PRODUCT_CATEGORIES };
export type { ProductCategory };

export interface IProduct {
  _id: mongoose.Types.ObjectId;
  name: string;
  category: ProductCategory;
  description?: string;
  variants: IVariant[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new mongoose.Schema<IProduct>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, enum: PRODUCT_CATEGORIES },
    description: { type: String },
    variants: [VariantSchema],
  },
  { timestamps: true }
);

export default (mongoose.models?.Product as mongoose.Model<IProduct>) || mongoose.model<IProduct>("Product", ProductSchema);
