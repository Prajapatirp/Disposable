"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { ReturnOrderModal, type ReturnOrderItem } from "@/components/forms/ReturnOrderModal";
import { ArrowLeft, RotateCcw, FileText } from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  productId: { _id: string; name: string };
  variantId: string;
  variantName?: string | null;
  quantity: number;
  price: number;
  returnedQuantity?: number;
}

interface Order {
  _id: string;
  orderNumber?: string;
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

interface Bill {
  _id: string;
  billNumber?: string;
  status: string;
  paidDate?: string;
}

interface OrderHistoryEntry {
  _id: string;
  statusName: string;
  action: string;
  performedBy: string;
  performedAt: string;
}

function formatHistoryDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Extract bill number from action e.g. "Added to bill BILL-2026-0014" or "Removed from bill BILL-2026-0014" */
function getBillNumberFromAction(action: string): string | null {
  const match = action.match(/bill\s+(BILL-[^\s]+)/i);
  return match ? match[1] : null;
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [history, setHistory] = useState<OrderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/orders/${id}`).then((r) => r.json()),
      fetch(`/api/orders/${id}/bill`).then((r) => r.json()),
      fetch(`/api/orders/${id}/history`).then((r) => r.json()),
    ])
      .then(([orderData, billData, historyData]) => {
        if (orderData.error) throw new Error(orderData.error);
        setOrder(orderData);
        setBill(billData && typeof billData === "object" && billData._id ? billData : null);
        setHistory(Array.isArray(historyData) ? historyData : []);
      })
      .catch(() => toast.error("Failed to load order"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("openReturn") === "1" && order) {
      const canShowReturn =
        order.status === "Dispatch Stage" ||
        (order.status === "Completed" && order.items.some((item) => (item.returnedQuantity ?? 0) < item.quantity));
      if (canShowReturn) setReturnModalOpen(true);
    }
  }, [searchParams, order]);

  const billStatus = bill?.status ?? null;
  const billPaid = billStatus === "Paid";
  const showReturnOrder =
    order &&
    (order.status === "Dispatch Stage" ||
      (order.status === "Completed" &&
        order.items.some((item) => (item.returnedQuantity ?? 0) < item.quantity))) &&
    !billPaid;
  const showUpdateBill =
    order?.status === "Returned" && bill && bill.status === "Pending";

  if (loading || !order) return <PageLoading />;

  const totalOriginal = order.items.reduce((s, i) => s + i.quantity * i.price, 0);
  const totalRemaining = order.items.reduce(
    (s, i) => s + (i.quantity - (i.returnedQuantity ?? 0)) * i.price,
    0
  );
  const hasReturns = totalRemaining < totalOriginal;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            Order #{order.orderNumber ?? order._id.slice(-6)}
          </h1>
          <p className="text-muted-foreground">
            {order.clientId.firstName} {order.clientId.lastName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showReturnOrder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReturnModalOpen(true)}
              className="gap-2 text-blue-600 hover:bg-blue-500/10 hover:text-blue-600"
            >
              <RotateCcw className="h-4 w-4" />
              Return order
            </Button>
          )}
          {showUpdateBill && bill && (
            <Link href={`/admin/billing/bill/${bill._id}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                Update bill
              </Button>
            </Link>
          )}
          <StatusBadge status={order.status} type="order" />
          {billStatus != null && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Bill: <StatusBadge status={billStatus} type="bill" />
            </span>
          )}
          {!billStatus && (
            <span className="text-sm text-muted-foreground">No bill</span>
          )}
        </div>
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
                  <th className="pb-2 text-left">Variant</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Returned</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => {
                  const ret = item.returnedQuantity ?? 0;
                  const remainingQty = item.quantity - ret;
                  const subtotalOriginal = item.quantity * item.price;
                  const subtotalRemaining = remainingQty * item.price;
                  const itemHasReturn = ret > 0;
                  return (
                    <tr key={i} className="border-b">
                      <td className="py-2">
                        {typeof item.productId === "object"
                          ? item.productId.name
                          : item.productId}
                      </td>
                      <td className="py-2">{item.variantName ?? item.variantId}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">{ret}</td>
                      <td className="text-right">₹{item.price}</td>
                      <td className="text-right">
                        <div>
                          {itemHasReturn && (
                            <span className="block text-muted-foreground">
                              ₹{subtotalOriginal.toLocaleString()} for {item.quantity} qty
                            </span>
                          )}
                          <span className={itemHasReturn ? "font-medium" : ""}>
                            ₹{subtotalRemaining.toLocaleString()}
                            {itemHasReturn && (
                              <span className="text-muted-foreground font-normal">
                                {" "}({remainingQty} remaining)
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-3 text-right">
              {hasReturns && (
                <p className="text-sm text-muted-foreground">
                  Original order: ₹{totalOriginal.toLocaleString()}
                </p>
              )}
              <p className="font-semibold">
                Total{hasReturns ? " (after returns)" : ""}: ₹{totalRemaining.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {history.some((e) => e.statusName === "Added to bill" || e.statusName === "Removed from bill") && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Bills for this order</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              All bills this order has been part of (from order history):
            </p>
            <div className="relative flex flex-col gap-0">
              {history
                .filter((e) => e.statusName === "Added to bill" || e.statusName === "Removed from bill")
                .map((entry, index, arr) => {
                  const billNum = getBillNumberFromAction(entry.action);
                  const isAdded = entry.statusName === "Added to bill";
                  return (
                    <div key={entry._id} className="flex gap-4 pb-4 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-background" />
                        {index < arr.length - 1 && (
                          <div className="mt-0.5 h-full w-px shrink-0 bg-border" style={{ minHeight: 24 }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="font-medium">
                          {isAdded ? "Added to bill" : "Removed from bill"}
                          {billNum ? ` — ${billNum}` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.performedBy ? `by ${entry.performedBy}` : ""}
                          {" — "}
                          {formatHistoryDate(entry.performedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Order history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative flex flex-col gap-0">
              {history.map((entry, index) => (
                <div key={entry._id} className="flex gap-4 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-background" />
                    {index < history.length - 1 && (
                      <div className="mt-0.5 h-full w-px shrink-0 bg-border" style={{ minHeight: 24 }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="font-medium">{entry.statusName}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.action}
                      {entry.performedBy ? ` by ${entry.performedBy}` : ""} — {formatHistoryDate(entry.performedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ReturnOrderModal
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        orderId={id}
        items={order.items as ReturnOrderItem[]}
        orderStatus={order.status}
        onSuccess={fetchAll}
      />
    </div>
  );
}
