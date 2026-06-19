"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { toast } from "sonner";

const categorySchema = z.object({
  name: z.string().min(1, "Name required").max(120),
  description: z.string().max(500).optional(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  initial?: {
    _id: string;
    name: string;
    description?: string;
    sortOrder: number;
    isActive: boolean;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function CategoryForm({ initial, onSuccess, onCancel }: CategoryFormProps) {
  const isEdit = !!initial;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: initial
      ? {
          name: initial.name,
          description: initial.description ?? "",
          sortOrder: initial.sortOrder ?? 0,
          isActive: initial.isActive ?? true,
        }
      : {
          name: "",
          description: "",
          sortOrder: 0,
          isActive: true,
        },
  });

  async function onSubmit(data: CategoryFormValues) {
    try {
      const payload = {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      };
      const url = isEdit ? `/api/categories/${initial._id}` : "/api/categories";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof j.error === "string" ? j.error : "Request failed");
      }
      toast.success(isEdit ? "Category updated" : "Category created");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Category name"
        placeholder="e.g. Medical & Healthcare"
        {...register("name")}
        error={errors.name?.message}
      />
      <Textarea
        label="Description (optional)"
        placeholder="Short description for this category"
        {...register("description")}
        error={errors.description?.message}
      />
      <Input
        label="Sort order"
        type="number"
        min={0}
        {...register("sortOrder")}
        error={errors.sortOrder?.message}
      />
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" className="rounded border-gray-300" {...register("isActive")} />
        Active (visible on storefront)
      </label>
      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
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
