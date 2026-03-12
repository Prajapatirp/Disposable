"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button, PrimaryButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface ReturnOrderItem {
  productId: { _id: string; name: string };
  variantId: string;
  variantName?: string | null;
  quantity: number;
  price: number;
  returnedQuantity?: number;
}

interface ReturnOrderModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  items: ReturnOrderItem[];
  /** When "Dispatch Stage", full order return is allowed (no item qty). When "Completed", item-level return. */
  orderStatus?: string;
  onSuccess: () => void;
}

export function ReturnOrderModal({
  open,
  onClose,
  orderId,
  items,
  orderStatus = "Completed",
  onSuccess,
}: ReturnOrderModalProps) {
  const isDispatchStage = orderStatus === "Dispatch Stage";
  const [returnQtys, setReturnQtys] = useState<number[]>(() =>
    items.map(() => 0)
  );
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setReturnQtys(items.map(() => 0));
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const maxReturn = (i: number) => {
    const item = items[i];
    const ret = item.returnedQuantity ?? 0;
    return Math.max(0, item.quantity - ret);
  };

  const handleQtyChange = (index: number, value: string) => {
    const v = value === "" ? 0 : parseInt(value, 10);
    const max = maxReturn(index);
    const clamped = isNaN(v) ? 0 : Math.max(0, Math.min(max, v));
    setReturnQtys((prev) => {
      const next = [...prev];
      next[index] = clamped;
      return next;
    });
  };

  const returnsPayload = isDispatchStage
    ? []
    : returnQtys
        .map((qty, itemIndex) => (qty > 0 ? { itemIndex, quantityToReturn: qty } : null))
        .filter(Boolean) as { itemIndex: number; quantityToReturn: number }[];

  const handleSubmit = async () => {
    if (isDispatchStage) {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/orders/${orderId}/return`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returns: [] }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to process return");
        }
        toast.success("Order returned");
        resetForm();
        onSuccess();
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to process return");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (returnsPayload.length === 0) {
      toast.error("Enter quantity to return for at least one item");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returns: returnsPayload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to process return");
      }
      toast.success("Return processed; quantities restored to stock");
      resetForm();
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to process return");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Return order" size="lg">
      <p className="mb-4 text-sm text-muted-foreground">
        {isDispatchStage
          ? "This order is in Dispatch Stage. Click below to mark the entire order as returned."
          : "Enter the quantity to return for each product. Stock will be updated accordingly."}
      </p>
      {!isDispatchStage && (
      <div className="max-h-[50vh] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left font-medium">Product</th>
              <th className="pb-2 text-left font-medium">Variant</th>
              <th className="pb-2 text-right font-medium">Ordered</th>
              <th className="pb-2 text-right font-medium">Already returned</th>
              <th className="pb-2 text-right font-medium">Qty to return</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const max = maxReturn(i);
              const productName =
                typeof item.productId === "object" ? item.productId.name : String(item.productId);
              return (
                <tr key={i} className="border-b">
                  <td className="py-2">{productName}</td>
                  <td className="py-2">{item.variantName ?? item.variantId}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{item.returnedQuantity ?? 0}</td>
                  <td className="py-2 text-right">
                    {max === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        max={max}
                        value={returnQtys[i] === 0 ? "" : returnQtys[i]}
                        onChange={(e) => handleQtyChange(i, e.target.value)}
                        className="w-20 text-right"
                        placeholder="0"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
      <div className="mt-4 flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <PrimaryButton
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (!isDispatchStage && returnsPayload.length === 0)}
        >
          {submitting ? "Processing..." : isDispatchStage ? "Return entire order" : "Process return"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
