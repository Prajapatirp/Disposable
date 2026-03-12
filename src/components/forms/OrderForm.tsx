"use client";

import { useEffect, useState } from "react";
import { Formik, FieldArray, FormikErrors } from "formik";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SelectDropdown } from "@/components/ui/select";
import { Button, PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { toast } from "sonner";

interface OrderFormValues {
  clientId: string;
  items: { productId: string; variantId: string; quantity: number; price: number }[];
}

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

function getInitialValues(initial: OrderFormProps["initial"]): OrderFormValues {
  const clientId = initial
    ? typeof initial.clientId === "object"
      ? initial.clientId._id
      : initial.clientId
    : "";
  const items =
    initial?.items?.length ?
      initial.items.map((i) => ({
        productId: typeof i.productId === "object" ? (i.productId as { _id: string })._id : i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        price: i.price,
      }))
    : [{ productId: "", variantId: "", quantity: 1, price: 0 }];
  return { clientId, items };
}

function validateOrder(
  values: OrderFormValues,
  products: Product[] = []
): FormikErrors<OrderFormValues> {
  const errors: FormikErrors<OrderFormValues> = {};
  if (!values.clientId) errors.clientId = "Select client";
  if (!values.items?.length) {
    (errors as { items?: string }).items = "Add at least one item";
    return errors;
  }
  const itemErrors: FormikErrors<OrderFormValues["items"]> = [];
  values.items.forEach((item, i) => {
    const row: { productId?: string; variantId?: string; quantity?: string; price?: string } = {};
    if (!item.productId) row.productId = "Select product";
    if (!item.variantId) row.variantId = "Select variant";
    if (item.quantity == null || item.quantity < 1) row.quantity = "Quantity must be at least 1";
    else if (products.length) {
      const product = products.find((p) => p._id === item.productId);
      const variant = product?.variants?.find((v) => v._id === item.variantId);
      if (variant && item.quantity > variant.quantityAvailable) {
        row.quantity = `Value must be less than or equal to ${variant.quantityAvailable}.`;
      }
    }
    if (item.price == null || item.price < 0) row.price = "Price must be 0 or more";
    if (Object.keys(row).length) itemErrors[i] = row;
  });
  if (itemErrors.length) (errors as { items?: unknown }).items = itemErrors;
  return errors;
}

export function OrderForm({ initial, onSuccess, onCancel }: OrderFormProps) {
  const isEdit = !!initial;
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/products").then((r) => r.json()), fetch("/api/clients").then((r) => r.json())]).then(
      ([p, c]) => {
        setProducts(p);
        setClients(c);
      }
    );
  }, []);

  const clientOptions = clients.map((c) => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName}`,
  }));

  return (
    <Formik
      initialValues={getInitialValues(initial)}
      validate={(values) => validateOrder(values, products)}
      onSubmit={async (data, { setFieldError, setSubmitting }) => {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const product = products.find((p) => p._id === item.productId);
          const variant = product?.variants?.find((v) => v._id === item.variantId);
          const qty = Number(item.quantity);
          if (variant && qty > variant.quantityAvailable) {
            setFieldError(`items.${i}.quantity`, `Value must be less than or equal to ${variant.quantityAvailable}.`);
            toast.error(`Quantity exceeds stock. Only ${variant.quantityAvailable} available for selected variant.`);
            setSubmitting(false);
            return;
          }
        }
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
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, errors, touched, setFieldValue, handleSubmit, isSubmitting }) => (
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectDropdown
            label="Client"
            options={clientOptions}
            placeholder="Select client"
            value={values.clientId}
            onChange={(v) => setFieldValue("clientId", v)}
            error={errors.clientId ?? undefined}
          />

          <div>
            <label className="mb-2 block text-sm font-medium">Order items</label>
            <FieldArray name="items">
              {(arrayHelpers) => (
                <>
                  {values.items.map((item, i) => {
                    const product = products.find((p) => p._id === item.productId);
                    const variantOptions =
                      product?.variants?.map((v) => ({
                        value: v._id,
                        label:
                          v.quantityAvailable <= 10
                            ? `${v.variantName} - ₹${v.pricePerUnit} (Only ${v.quantityAvailable} left!)`
                            : `${v.variantName} - ₹${v.pricePerUnit} (${v.quantityAvailable} in stock)`,
                      })) ?? [];
                    const selectedVariant = product?.variants?.find((v) => v._id === item.variantId);
                    const isLowStock = selectedVariant != null && selectedVariant.quantityAvailable <= 10;
                    const itemErrors = typeof errors.items === "object" && Array.isArray(errors.items) ? errors.items[i] : undefined;
                    const quantityError =
                      itemErrors != null && typeof itemErrors === "object" && "quantity" in itemErrors
                        ? (itemErrors as { quantity?: string }).quantity
                        : undefined;
                    return (
                      <div
                        key={i}
                        className="mb-3 space-y-3 rounded border p-3"
                      >
                        {/* First row: Product, Variant, Delete icon */}
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="min-w-[180px] flex-1">
                            <SelectDropdown
                              label="Product"
                              placeholder="Select product"
                              options={products.map((p) => ({ value: p._id, label: p.name }))}
                              value={item.productId}
                              onChange={(v) => {
                                setFieldValue(`items.${i}.productId`, v);
                                setFieldValue(`items.${i}.variantId`, "");
                                const prod = products.find((p) => p._id === v);
                                if (prod?.variants?.[0]) {
                                  setFieldValue(`items.${i}.variantId`, prod.variants[0]._id);
                                  setFieldValue(`items.${i}.price`, prod.variants[0].pricePerUnit);
                                }
                              }}
                            />
                          </div>
                          <div className="min-w-[200px] flex-1">
                            <SelectDropdown
                              label="Variant"
                              placeholder="Select variant"
                              options={variantOptions}
                              value={item.variantId}
                              onChange={(v) => {
                                setFieldValue(`items.${i}.variantId`, v);
                                const variant = product?.variants?.find((x) => x._id === v);
                                if (variant) setFieldValue(`items.${i}.price`, variant.pricePerUnit);
                              }}
                            />
                            {isLowStock && selectedVariant && (
                              <p className="mt-1 text-sm font-medium text-destructive">
                                Low stock: only {selectedVariant.quantityAvailable} available
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => arrayHelpers.remove(i)}
                            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* Second row: Quantity, Price (₹) */}
                        <div className="flex flex-wrap items-end gap-3">
                          <Input
                            label="Quantity"
                            type="number"
                            placeholder="0"
                            className="w-24"
                            min={1}
                            max={selectedVariant?.quantityAvailable ?? undefined}
                            error={quantityError ?? undefined}
                            value={item.quantity === 0 ? "" : item.quantity}
                            onChange={(e) => {
                              const v = e.target.value === "" ? 0 : Number(e.target.value);
                              setFieldValue(`items.${i}.quantity`, isNaN(v) ? 0 : v);
                            }}
                          />
                          <Input
                            label="Price (₹)"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="w-28"
                            value={item.price === 0 ? "" : item.price}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                setFieldValue(`items.${i}.price`, 0);
                                return;
                              }
                              const v = Number(raw);
                              setFieldValue(`items.${i}.price`, isNaN(v) ? 0 : v);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => arrayHelpers.push({ productId: "", variantId: "", quantity: 1, price: 0 })}
                  >
                    Add item
                  </Button>
                  {typeof errors.items === "string" && (
                    <p className="mt-1 text-sm text-destructive">{errors.items}</p>
                  )}
                </>
              )}
            </FieldArray>
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
      )}
    </Formik>
  );
}
