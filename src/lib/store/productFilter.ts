import mongoose from "mongoose";

/**
 * Shared catalog filter for admin and public store APIs.
 */
export function buildProductFilterFromSearchParams(searchParams: URLSearchParams): Record<string, unknown> {
  const search = searchParams.get("search")?.trim();
  const category = searchParams.get("category")?.trim();
  const categoryId = searchParams.get("categoryId")?.trim();
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const filter: Record<string, unknown> = {};
  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    filter.categoryId = categoryId;
  } else if (category) {
    filter.category = category;
  }
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchOr = [
      { name: new RegExp(escaped, "i") },
      { category: new RegExp(escaped, "i") },
    ];
    if (filter.category) {
      filter.$and = [{ category: filter.category }, { $or: searchOr }];
      delete filter.category;
    } else {
      filter.$or = searchOr;
    }
  }
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      (filter.createdAt as Record<string, Date>).$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (filter.createdAt as Record<string, Date>).$lte = end;
    }
  }
  return filter;
}
