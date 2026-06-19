"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductForm } from "@/components/forms/ProductForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { toast } from "sonner";

interface Product {
  _id: string;
  name: string;
  category: string;
  categoryId?: string;
  description?: string;
  thumbnailUrl?: string | null;
  variants: {
    _id: string;
    variantName: string;
    quantityAvailable: number;
    pricePerUnit: number;
    imageUrl?: string;
    imageUrls?: string[];
  }[];
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProduct(data);
      })
      .catch(() => toast.error("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !product) return <PageLoading />;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/admin/products/${id}`}>
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-muted-foreground">
            Update {product.name}
          </p>
        </div>
      </div>
      <Card className="w-full max-w-none">
        <CardHeader>
          <CardTitle>Product details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            initial={{
              _id: product._id,
              name: product.name,
              categoryId: product.categoryId ? String(product.categoryId) : undefined,
              category: product.category,
              description: product.description,
              thumbnailUrl: product.thumbnailUrl ?? undefined,
              variants: product.variants?.map((v) => ({
                _id: v._id,
                variantName: v.variantName,
                quantityAvailable: v.quantityAvailable,
                pricePerUnit: v.pricePerUnit,
                imageUrl: v.imageUrl,
                imageUrls: v.imageUrls,
              })) ?? [],
            }}
            onSuccess={() => router.push("/admin/products")}
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
