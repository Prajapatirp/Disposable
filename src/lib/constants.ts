/**
 * Shared constants safe to import in client components (no Mongoose).
 */

export const PRODUCT_CATEGORIES = [
  "Foodservice & Catering",
  "Medical & Healthcare",
  "Household & Personal Care",
  "Retail & Packaging",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const ORDER_STATUSES = ["Dispatch Stage", "Completed", "Returned", "Cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const BILL_STATUSES = ["Pending", "Paid"] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];
