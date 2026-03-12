"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderForm } from "@/components/forms/OrderForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { toast } from "sonner";

interface OrderItem {
  productId: { _id: string; name: string } | string;
  variantId: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  clientId: string | { _id: string };
  items: OrderItem[];
  status: string;
}

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setOrder(data);
      })
      .catch(() => {
        toast.error("Failed to load order");
        router.push("/admin/orders");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !order) return <PageLoading />;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/admin/orders/${id}`}>
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Order</h1>
          <p className="text-muted-foreground">
            Update order #{id.slice(-6)}
          </p>
        </div>
      </div>
      <Card className="w-full max-w-none">
        <CardHeader>
          <CardTitle>Order details</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderForm
            initial={{
              _id: order._id,
              clientId: order.clientId,
              items: order.items.map((i) => ({
                productId: typeof i.productId === "object" ? i.productId._id : i.productId,
                variantId: i.variantId,
                quantity: i.quantity,
                price: i.price,
              })),
            }}
            onSuccess={() => router.push("/admin/orders")}
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
