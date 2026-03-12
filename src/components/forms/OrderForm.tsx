"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { SelectDropdown } from "@/components/ui/select";
import { Button, PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { toast } from "sonner";

const itemSchema = z.object({
  productId: z.string().min(1, "Select product"),
  variantId: z.string().min(1, "Select variant"),
  quantity: z.coerce.number().min(1),
  price: z.coerce.number().min(0),
});

const orderSchema = z.object({
  clientId: z.string().min(1, "Select client"),
  items: z.array(itemSchema).min(1, "Add at least one item"),
});

type OrderFormValues = z.infer<typeof orderSchema>;

interface Product {
  _id: string;
  name: string;
  category: string;
  variants: { _id: string; variantName: string; quantityAvailable: number; pricePerUnit: number }[];
}

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
}

interface OrderFormProps {
  initial?: {
    _id: string;
    clientId: string | { _id: string };
    items: { productId: string; variantId: string; quantity: number; price: number }[];
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function OrderForm({ initial, onSuccess, onCancel }: OrderFormProps) {
  const isEdit = !!initial;
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const clientIdFromInitial = initial
    ? typeof initial.clientId === "object"
      ? initial.clientId._id
      : initial.clientId
    : "";
  const itemsFromInitial = initial?.items?.length
    ? initial.items.map((i) => ({
        productId: typeof i.productId === "object" ? (i.productId as { _id: string })._id : i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        price: i.price,
      }))
    : [{ productId: "", variantId: "", quantity: 1, price: 0 }];

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      clientId: clientIdFromInitial,
      items: itemsFromInitial,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    Promise.all([fetch("/api/products").then((r) => r.json()), fetch("/api/clients").then((r) => r.json())]).then(
      ([p, c]) => {
        setProducts(p);
        setClients(c);
      }
    );
  }, []);

  const clientId = watch("clientId");
  const selectedProductIds = watch("items").map((i) => i.productId);

  async function onSubmit(data: OrderFormValues) {
    try {
      const payload = {
        clientId: data.clientId,
        items: data.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: Number(i.quantity),
          price: Number(i.price),
        })),
      };
      const url = isEdit ? `/api/orders/${initial!._id}` : "/api/orders";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Request failed");
      }
      toast.success(isEdit ? "Order updated" : "Order created");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const clientOptions = clients.map((c) => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName}`,
  }));

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

      <div>
        <label className="mb-2 block text-sm font-medium">Order items</label>
        {fields.map((field, i) => {
          const productId = watch(`items.${i}.productId`);
          const product = products.find((p) => p._id === productId);
          const variantOptions =
            product?.variants?.map((v) => ({
              value: v._id,
              label: `${v.variantName} - ₹${v.pricePerUnit} (${v.quantityAvailable} in stock)`,
            })) ?? [];
          return (
            <div
              key={field.id}
              className="mb-3 flex flex-wrap items-end gap-2 rounded border p-3"
            >
              <div className="min-w-[180px] flex-1">
                <SelectDropdown
                  label="Product"
                  placeholder="Select product"
                  options={products.map((p) => ({ value: p._id, label: p.name }))}
                  value={productId}
                  onChange={(v) => {
                    setValue(`items.${i}.productId`, v);
                    setValue(`items.${i}.variantId`, "");
                    const prod = products.find((p) => p._id === v);
                    if (prod?.variants?.[0]) {
                      setValue(`items.${i}.variantId`, prod.variants[0]._id);
                      setValue(`items.${i}.price`, prod.variants[0].pricePerUnit);
                    }
                  }}
                />
              </div>
              <div className="min-w-[200px] flex-1">
                <SelectDropdown
                  label="Variant"
                  placeholder="Select variant"
                  options={variantOptions}
                  value={watch(`items.${i}.variantId`)}
                  onChange={(v) => {
                    setValue(`items.${i}.variantId`, v);
                    const variant = product?.variants?.find((x) => x._id === v);
                    if (variant) setValue(`items.${i}.price`, variant.pricePerUnit);
                  }}
                />
              </div>
              <div className="flex items-end gap-2">
                <Input
                  label="Quantity"
                  type="number"
                  placeholder="0"
                  className="w-24"
                  {...register(`items.${i}.quantity`)}
                />
                <Input
                  label="Price (₹)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-28"
                  {...register(`items.${i}.price`)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(i)}
                className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Remove
              </Button>
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ productId: "", variantId: "", quantity: 1, price: 0 })}
        >
          Add item
        </Button>
        {errors.items?.root?.message && (
          <p className="mt-1 text-sm text-destructive">{errors.items.root.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEdit ? "Update order" : "Create order"}
        </PrimaryButton>
      </div>
    </form>
  );
}
