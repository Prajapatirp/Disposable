"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  productId: { _id: string; name: string };
  variantId: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  clientId: {
    _id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    businessName?: string;
  };
  items: OrderItem[];
  status: string;
  createdDate: string;
}

export default function OrderDetailPage() {
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
      .catch(() => toast.error("Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  async function markCompleted() {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Order marked as completed");
      setOrder((o) => (o ? { ...o, status: "Completed" } : null));
    } catch {
      toast.error("Failed to update");
    }
  }

  if (loading || !order) return <PageLoading />;

  const total = order.items.reduce((s, i) => s + i.quantity * i.price, 0);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Order #{order._id.slice(-6)}</h1>
          <p className="text-muted-foreground">
            {order.clientId.firstName} {order.clientId.lastName}
          </p>
        </div>
        <StatusBadge status={order.status} type="order" />
        {order.status === "Dispatch Stage" && (
          <Button onClick={markCompleted}>Mark completed</Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              {order.clientId.firstName} {order.clientId.lastName}
            </p>
            {order.clientId.phoneNumber && <p>{order.clientId.phoneNumber}</p>}
            {(order.clientId.addressLine1 || order.clientId.address) && (
              <p>
                {order.clientId.addressLine1
                  ? [
                      order.clientId.addressLine1,
                      order.clientId.addressLine2,
                      [order.clientId.city, order.clientId.state].filter(Boolean).join(", "),
                      order.clientId.pincode,
                      order.clientId.country,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : order.clientId.address}
              </p>
            )}
            {order.clientId.businessName && (
              <p className="text-muted-foreground">{order.clientId.businessName}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left">Product</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">
                      {typeof item.productId === "object"
                        ? item.productId.name
                        : item.productId}
                    </td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">₹{item.price}</td>
                    <td className="text-right">
                      ₹{(item.quantity * item.price).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-right font-semibold">Total: ₹{total.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
