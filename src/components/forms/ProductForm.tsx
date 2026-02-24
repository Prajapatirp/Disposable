"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectDropdown } from "@/components/ui/select";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const variantSchema = z.object({
  variantName: z.string().min(1, "Variant name required"),
  quantityAvailable: z.coerce.number().min(0),
  pricePerUnit: z.coerce.number().min(0, "Price required"),
});

const productSchema = z.object({
  name: z.string().min(1, "Name required"),
  category: z.enum(PRODUCT_CATEGORIES as unknown as [string, ...string[]]),
  description: z.string().optional(),
  variants: z
    .array(variantSchema)
    .min(1, "Add at least one variant"),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initial?: {
    _id: string;
    name: string;
    category: string;
    description?: string;
    variants: { _id?: string; variantName: string; quantityAvailable: number; pricePerUnit: number }[];
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ initial, onSuccess, onCancel }: ProductFormProps) {
  const isEdit = !!initial;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          category: initial.category,
          description: initial.description ?? "",
          variants: initial.variants?.length
            ? initial.variants.map((v) => ({
                variantName: v.variantName,
                quantityAvailable: v.quantityAvailable,
                pricePerUnit: v.pricePerUnit,
              }))
            : [],
        }
      : {
          name: "",
          category: PRODUCT_CATEGORIES[0],
          description: "",
          variants: [],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });
  const category = watch("category");

  async function onSubmit(data: ProductFormValues) {
    try {
      const payload = {
        name: data.name,
        category: data.category,
        description: data.description || undefined,
        variants: data.variants.map((v) => ({
          variantName: v.variantName,
          quantityAvailable: Number(v.quantityAvailable),
          pricePerUnit: Number(v.pricePerUnit),
        })),
      };
      const url = isEdit ? `/api/products/${initial._id}` : "/api/products";
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
      toast.success(isEdit ? "Product updated" : "Product created");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Product name"
        placeholder="e.g. Disposable cups"
        {...register("name")}
        error={errors.name?.message}
      />
      <SelectDropdown
        label="Category"
        placeholder="Select category"
        options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
        value={category}
        onChange={(v) => setValue("category", v as ProductFormValues["category"])}
        error={errors.category?.message}
      />
      <Textarea
        label="Description (optional)"
        placeholder="e.g. Brief description of the product"
        {...register("description")}
        error={errors.description?.message}
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">Variants</label>
          <button
            type="button"
            onClick={() => append({ variantName: "", quantityAvailable: 0, pricePerUnit: 0 })}
            className="text-sm text-primary hover:underline"
          >
            <Plus className="inline h-4 w-4" /> Add variant
          </button>
        </div>
        {errors.variants?.message && (
          <p className="mb-2 text-sm text-destructive">{errors.variants.message}</p>
        )}
        <div className="space-y-3">
          {fields.map((field, i) => (
            <div
              key={field.id}
              className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/30 p-4"
            >
              <div className="min-w-[140px] flex-1">
                <Input
                  label="Variant name"
                  placeholder="e.g. Cup 25mm, Pack of 100"
                  {...register(`variants.${i}.variantName`)}
                  error={errors.variants?.[i]?.variantName?.message}
                />
              </div>
              <div className="w-32">
                <Input
                  label="Quantity available"
                  type="number"
                  placeholder="0"
                  {...register(`variants.${i}.quantityAvailable`)}
                  error={errors.variants?.[i]?.quantityAvailable?.message}
                />
              </div>
              <div className="w-36">
                <Input
                  label="Price per unit (₹)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register(`variants.${i}.pricePerUnit`)}
                  error={errors.variants?.[i]?.pricePerUnit?.message}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded p-2 text-destructive hover:bg-destructive/10"
                aria-label="Remove variant"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
        </PrimaryButton>
      </div>
    </form>
  );
}
