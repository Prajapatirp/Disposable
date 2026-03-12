"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal, Input } from "@/components/ui";
import { Printer, Download, ArrowLeft, Pencil, Trash2, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/badge";

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
  replacedByBillId?: { _id: string; billNumber: string } | null;
}

function calculatedTotal(orderIds: PopulatedOrder[]): number {
  return (orderIds || []).reduce((sum, order) => {
    return sum + order.items.reduce((s, i) => s + i.quantity * i.price, 0);
  }, 0);
}

export default function BillViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [generateNewConfirmOpen, setGenerateNewConfirmOpen] = useState(false);
  const [editBillDate, setEditBillDate] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchBill = () => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/bills/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load bill");
        return res.json();
      })
      .then((data) => {
        setBill(data);
        setEditBillDate(data.billDate ? new Date(data.billDate).toISOString().slice(0, 10) : "");
        setEditTotalAmount(String(data.totalAmount ?? ""));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBill();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  const openEdit = () => {
    if (bill) {
      setEditBillDate(bill.billDate ? new Date(bill.billDate).toISOString().slice(0, 10) : "");
      setEditTotalAmount(String(bill.totalAmount ?? ""));
      setEditOpen(true);
    }
  };

  const recalculateTotal = () => {
    if (bill?.orderIds) {
      const total = calculatedTotal(bill.orderIds);
      setEditTotalAmount(String(total));
    }
  };

  const saveEdit = async () => {
    if (!bill) return;
    const total = parseFloat(editTotalAmount);
    if (isNaN(total) || total < 0) {
      toast.error("Enter a valid total amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billDate: editBillDate || undefined,
          totalAmount: total,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      toast.success("Bill updated");
      setEditOpen(false);
      fetchBill();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update bill");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteConfirmOpen(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Bill deleted");
      router.push("/admin/billing");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete bill");
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateNew = async () => {
    setGenerateNewConfirmOpen(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      const clientId = bill?.clientId && typeof bill.clientId === "object" ? bill.clientId._id : "";
      toast.success("Bill deleted. You can create a new bill below.");
      router.push(`/admin/billing?createForClient=${clientId}&previousBillId=${id}&openCreate=1`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete bill");
    } finally {
      setDeleting(false);
    }
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
  const isPending = bill.status === "Pending";
  const isSuperseded = bill.status === "Superseded";
  const replacedBy = bill.replacedByBillId && typeof bill.replacedByBillId === "object" ? bill.replacedByBillId : null;

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
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download (PDF)
          </Button>
          <span className="text-muted-foreground">|</span>
          <Button type="button" variant="outline" size="sm" onClick={() => window.open(`/admin/billing/bill/${id}`, "_blank")} className="gap-2">
            <FileText className="h-4 w-4" />
            Preview
          </Button>
          {isPending && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={openEdit} className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit bill
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGenerateNewConfirmOpen(true)}
                className="gap-2 text-amber-600 hover:bg-amber-500/10"
                disabled={deleting}
              >
                <FileText className="h-4 w-4" />
                Delete & generate new
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                className="gap-2 text-destructive hover:bg-destructive/10"
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete bill
              </Button>
            </>
          )}
        </div>
      </div>

      {isSuperseded && replacedBy && (
        <div className="mx-auto mt-4 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 print:hidden">
          <p className="font-medium">This bill has been superseded.</p>
          <p className="mt-1 text-muted-foreground">
            Replaced by{" "}
            <Link href={`/admin/billing/bill/${replacedBy._id}`} className="font-medium text-primary hover:underline">
              {replacedBy.billNumber}
            </Link>
          </p>
        </div>
      )}

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
            <StatusBadge status={bill.status} type="bill" />
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

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit bill" size="md">
        <div className="space-y-4">
          <Input
            label="Bill date"
            type="date"
            value={editBillDate}
            onChange={(e) => setEditBillDate(e.target.value)}
          />
          <div>
            <Input
              label="Total amount (₹)"
              type="number"
              min={0}
              step="0.01"
              value={editTotalAmount}
              onChange={(e) => setEditTotalAmount(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={recalculateTotal}
            >
              Recalculate from orders
            </Button>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete bill" size="sm">
        <p className="text-sm text-muted-foreground">
          This will delete the bill and put all its orders back to Dispatch Stage. Stock will be restored. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete bill"}
          </Button>
        </div>
      </Modal>

      {/* Generate new confirm */}
      <Modal open={generateNewConfirmOpen} onClose={() => setGenerateNewConfirmOpen(false)} title="Delete and generate new bill" size="sm">
        <p className="text-sm text-muted-foreground">
          This will delete the current bill and return its orders to Dispatch Stage. You can then create a new bill with the same or different orders.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setGenerateNewConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerateNew} disabled={deleting}>
            {deleting ? "Deleting..." : "Continue"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
