"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SelectDropdown } from "@/components/ui/select";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { toast } from "sonner";

const billSchema = z.object({
  clientId: z.string().min(1, "Select client"),
  orderIds: z.array(z.string()).min(1, "Select at least one order"),
});

type BillFormValues = z.infer<typeof billSchema>;

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Order {
  _id: string;
  orderNumber?: string;
  createdDate: string;
  items: { quantity: number; price: number; returnedQuantity?: number }[];
}

interface BillFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  /** Pre-select this client when opening the form (e.g. after "Delete & generate new"). */
  initialClientId?: string;
  /** When regenerating a bill, pass the previous bill id so its history is copied to the new bill. */
  previousBillId?: string;
}

export function BillForm({ onSuccess, onCancel, initialClientId, previousBillId }: BillFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [dispatchedOrders, setDispatchedOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: { clientId: initialClientId ?? "", orderIds: [] },
  });

  const clientId = watch("clientId");

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialClientId && clients.some((c) => c._id === initialClientId)) {
      setValue("clientId", initialClientId);
    }
  }, [initialClientId, clients, setValue]);

  useEffect(() => {
    if (!clientId) {
      setDispatchedOrders([]);
      setValue("orderIds", []);
      return;
    }
    setLoadingOrders(true);
    fetch(`/api/bills/dispatched-orders?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((data) => {
        setDispatchedOrders(Array.isArray(data) ? data : []);
        setValue("orderIds", []);
      })
      .catch(() => setDispatchedOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [clientId, setValue]);

  const orderIds = watch("orderIds") || [];
  const toggleOrder = (orderId: string) => {
    const next = orderIds.includes(orderId)
      ? orderIds.filter((id) => id !== orderId)
      : [...orderIds, orderId];
    setValue("orderIds", next, { shouldValidate: true });
  };

  const clientOptions = clients.map((c) => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName}`,
  }));

  const totalFromSelected = dispatchedOrders
    .filter((o) => orderIds.includes(o._id))
    .reduce((sum, o) => {
      const orderTotal = o.items.reduce(
        (s, i) => s + (i.quantity - (i.returnedQuantity ?? 0)) * i.price,
        0
      );
      return sum + orderTotal;
    }, 0);

  function orderRemainingTotal(order: Order): number {
    return order.items.reduce(
      (s, i) => s + (i.quantity - (i.returnedQuantity ?? 0)) * i.price,
      0
    );
  }

  async function onSubmit(data: BillFormValues) {
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: data.clientId,
          orderIds: data.orderIds,
          ...(previousBillId ? { previousBillId } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Request failed");
      }
      toast.success("Bill generated");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <SelectDropdown
        label="Client"
        options={clientOptions}
        placeholder="Select client"
        value={clientId}
        onChange={(v) => setValue("clientId", v)}
        error={errors.clientId?.message}
      />

      {clientId && (
        <div>
          <label className="mb-2 block text-sm font-medium">
            Dispatched orders (select to include in bill)
          </label>
          {loadingOrders ? (
            <p className="text-sm text-muted-foreground">Loading orders...</p>
          ) : dispatchedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No dispatched orders for this client.
            </p>
          ) : (
            <div className="max-h-60 space-y-2 overflow-y-auto rounded border p-3">
              {dispatchedOrders.map((order) => {
                const orderTotal = orderRemainingTotal(order);
                const selected = orderIds.includes(order._id);
                return (
                  <label
                    key={order._id}
                    className={`flex cursor-pointer items-center justify-between rounded border p-2 ${
                      selected ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleOrder(order._id)}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      Order #{order.orderNumber ?? order._id.slice(-6)} —{" "}
                      {new Date(order.createdDate).toLocaleDateString()} — ₹
                      {orderTotal.toLocaleString()}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {orderIds.length > 0 && (
            <p className="mt-2 text-sm font-medium">
              Total amount: ₹{totalFromSelected.toLocaleString()}
            </p>
          )}
          {errors.orderIds?.message && (
            <p className="mt-1 text-sm text-destructive">
              {errors.orderIds.message}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          type="submit"
          disabled={isSubmitting || orderIds.length === 0}
        >
          {isSubmitting ? "Generating..." : "Generate bill"}
        </PrimaryButton>
      </div>
    </form>
  );
}
