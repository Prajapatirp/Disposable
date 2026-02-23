"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Product {
  _id: string;
  name: string;
  category: string;
  description?: string;
  variants: {
    _id: string;
    variantName: string;
    quantityAvailable: number;
    pricePerUnit: number;
  }[];
}

export default function ProductDetailPage() {
  const params = useParams();
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button variant="ghost" size="icon" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#7C3AED]">
              {product.name}
            </h1>
            <p className="text-muted-foreground">Product details</p>
          </div>
        </div>
        <Link href={`/admin/products/${product._id}/edit`}>
          <Button variant="secondary" className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit product
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="font-medium text-muted-foreground">Category</span>
              <br />
              <span className="text-foreground">{product.category}</span>
            </p>
            {product.description ? (
              <p>
                <span className="font-medium text-muted-foreground">
                  Description
                </span>
                <br />
                <span className="text-foreground whitespace-pre-wrap">
                  {product.description}
                </span>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variants ({product.variants?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!product.variants?.length ? (
              <p className="text-sm text-muted-foreground">No variants.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Variant name</th>
                      <th className="pb-2 pr-4 font-medium">Qty available</th>
                      <th className="pb-2 font-medium">Price per unit (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((v) => (
                      <tr
                        key={v._id}
                        className="border-b last:border-0"
                      >
                        <td className="py-2.5 pr-4 font-medium">
                          {v.variantName}
                        </td>
                        <td className="py-2.5 pr-4">{v.quantityAvailable}</td>
                        <td className="py-2.5">
                          ₹{Number(v.pricePerUnit).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
