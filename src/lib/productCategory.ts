import mongoose from "mongoose";
import Category from "@/lib/models/Category";
import Product from "@/lib/models/Product";

export async function resolveCategoryForProduct(categoryId: string): Promise<{
  categoryId: mongoose.Types.ObjectId;
  category: string;
}> {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new Error("Invalid category");
  }
  const cat = await Category.findById(categoryId).lean();
  if (!cat) throw new Error("Category not found");
  if (!cat.isActive) throw new Error("Category is inactive");
  return {
    categoryId: cat._id as mongoose.Types.ObjectId,
    category: cat.name,
  };
}

/** When a category name changes, keep product.category in sync for storefront filters. */
export async function syncProductCategoryNames(
  categoryId: mongoose.Types.ObjectId,
  name: string
): Promise<void> {
  await Product.updateMany({ categoryId }, { $set: { category: name } });
}
