import { NextRequest } from "next/server";
import { handleProductVariantImageUpload } from "@/lib/server/productVariantImageUpload";

export async function POST(req: NextRequest) {
  return handleProductVariantImageUpload(req);
}
