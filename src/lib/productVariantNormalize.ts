/** Merge legacy single imageUrl with imageUrls for DB storage. */
export function normalizeVariantForDb(v: {
  _id?: string;
  variantName: string;
  quantityAvailable: number;
  pricePerUnit: number;
  imageUrl?: string;
  imageUrls?: string[];
}): {
  _id?: string;
  variantName: string;
  quantityAvailable: number;
  pricePerUnit: number;
  imageUrls: string[];
  imageUrl?: string;
} {
  const trimmedUrls = (v.imageUrls ?? [])
    .map((s) => String(s).trim())
    .filter(Boolean);
  const legacy = v.imageUrl?.trim();
  const urls =
    trimmedUrls.length > 0 ? trimmedUrls : legacy ? [legacy] : [];
  const base = {
    variantName: v.variantName,
    quantityAvailable: v.quantityAvailable,
    pricePerUnit: v.pricePerUnit,
  };
  const withId = v._id ? { _id: v._id, ...base } : base;
  if (urls.length === 0) {
    return { ...withId, imageUrls: [] };
  }
  return { ...withId, imageUrls: urls, imageUrl: urls[0] };
}
