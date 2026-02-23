"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/badge";

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  businessName?: string;
  gstNumber?: string;
  companyAddress?: string;
}

function formatAddress(client: Client): string {
  if (client.addressLine1 || client.city || client.state) {
    const parts = [
      client.addressLine1,
      client.addressLine2,
      [client.city, client.state].filter(Boolean).join(", "),
      client.pincode,
      client.country,
    ].filter(Boolean);
    return parts.join(", ");
  }
  return client.address ?? "—";
}

interface Order {
  _id: string;
  status: string;
  createdDate: string;
  items: { quantity: number; price: number }[];
}

export default function ClientProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/clients/${id}`).then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
    ])
      .then(([clientData, ordersData]) => {
        if (clientData.error) throw new Error(clientData.error);
        setClient(clientData);
        const clientOrders = (ordersData as Order[]).filter(
          (o: Order & { clientId?: { _id: string } | string }) =>
            (typeof o.clientId === "object" ? o.clientId?._id : o.clientId) === id
        );
        setOrders(clientOrders);
      })
      .catch(() => toast.error("Failed to load client"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !client) return <PageLoading />;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/clients">
            <Button variant="ghost" size="icon" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {client.firstName} {client.lastName}
            </h1>
            <p className="text-muted-foreground">Client profile & order history</p>
          </div>
        </div>
        <Link
          href={`/admin/clients/${client._id}/edit`}
          className={buttonVariants({ variant: "secondary" }) + " inline-flex gap-2"}
        >
          <Pencil className="h-4 w-4" />
          Edit client
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Phone:</strong> {client.phoneNumber}</p>
            <p><strong>Address:</strong> {formatAddress(client)}</p>
            {client.businessName && (
              <p><strong>Business:</strong> {client.businessName}</p>
            )}
            {client.gstNumber && (
              <p><strong>GST:</strong> {client.gstNumber}</p>
            )}
            {client.companyAddress && (
              <p><strong>Company address:</strong> {client.companyAddress}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order history</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="space-y-2">
                {orders
                  .sort(
                    (a, b) =>
                      new Date(b.createdDate).getTime() -
                      new Date(a.createdDate).getTime()
                  )
                  .map((order) => {
                    const total = order.items.reduce(
                      (s, i) => s + i.quantity * i.price,
                      0
                    );
                    return (
                      <li
                        key={order._id}
                        className="flex items-center justify-between rounded border p-2 text-sm"
                      >
                        <Link
                          href={`/admin/orders/${order._id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          Order #{order._id.slice(-6)}
                        </Link>
                        <span className="text-muted-foreground">
                          {new Date(order.createdDate).toLocaleDateString()} — ₹
                          {total.toLocaleString()}
                        </span>
                        <StatusBadge status={order.status} type="order" />
                      </li>
                    );
                  })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
