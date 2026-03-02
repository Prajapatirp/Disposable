"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Printer, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BillClient {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  businessName?: string;
  companyAddress?: string;
}

interface OrderItem {
  productId: unknown;
  variantId: unknown;
  quantity: number;
  price: number;
}

interface PopulatedOrder {
  _id: string;
  orderNumber?: string;
  createdDate: string;
  items: OrderItem[];
}

interface Bill {
  _id: string;
  billNumber: string;
  clientId: BillClient | string;
  orderIds: PopulatedOrder[];
  totalAmount: number;
  status: string;
  billDate: string;
  paidDate?: string;
}

export default function BillViewPage() {
  const params = useParams();
  const id = params.id as string;
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/bills/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load bill");
        return res.json();
      })
      .then(setBill)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-muted-foreground">Loading bill...</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="p-8">
        <p className="text-destructive">{error || "Bill not found"}</p>
        <Link href="/admin/billing" className="mt-4 inline-block text-primary hover:underline">
          ← Back to Billing
        </Link>
      </div>
    );
  }

  const client = typeof bill.clientId === "object" ? bill.clientId : null;
  const clientName = client ? `${client.firstName} ${client.lastName}` : "—";
  const clientAddress = client?.address || client?.companyAddress || "—";

  return (
    <div className="bill-view p-6 print:p-0">
      {/* Non-print header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href="/admin/billing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Link>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download (PDF)
          </Button>
        </div>
      </div>

      {/* Bill content - print-friendly */}
      <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm print:max-w-none print:border-0 print:shadow-none">
        <div className="mb-8 flex justify-between border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">INVOICE</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{bill.billNumber}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">Bill date</p>
            <p className="text-muted-foreground">{new Date(bill.billDate).toLocaleDateString()}</p>
            <p className="mt-2 font-medium">Status</p>
            <p className="text-muted-foreground">{bill.status}</p>
          </div>
        </div>

        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bill to</p>
            <p className="mt-1 font-medium">{clientName}</p>
            {client?.businessName && <p className="text-sm text-muted-foreground">{client.businessName}</p>}
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{clientAddress}</p>
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="pb-2 text-left font-semibold">Order #</th>
              <th className="pb-2 text-left font-semibold">Date</th>
              <th className="pb-2 text-right font-semibold">Qty</th>
              <th className="pb-2 text-right font-semibold">Unit price</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(bill.orderIds || []).map((order) => {
              const orderTotal = order.items.reduce((s, i) => s + i.quantity * i.price, 0);
              const orderLabel = order.orderNumber ?? order._id.slice(-6);
              return (
                <tr key={order._id} className="border-b border-gray-100">
                  <td className="py-2 font-medium">{orderLabel}</td>
                  <td className="py-2 text-muted-foreground">
                    {new Date(order.createdDate).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-right">
                    {order.items.reduce((s, i) => s + i.quantity, 0)}
                  </td>
                  <td className="py-2 text-right text-muted-foreground">—</td>
                  <td className="py-2 text-right font-medium">₹{orderTotal.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-8 flex justify-end border-t border-gray-200 pt-6">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total amount</p>
            <p className="text-2xl font-bold">₹{bill.totalAmount.toLocaleString()}</p>
          </div>
        </div>

        {bill.paidDate && (
          <p className="mt-6 text-sm text-muted-foreground">
            Paid on {new Date(bill.paidDate).toLocaleDateString()}
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground print:hidden">
        For PDF: click &quot;Download (PDF)&quot; then choose &quot;Save as PDF&quot; in the print dialog.
      </p>
    </div>
  );
}
