"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectDropdown } from "@/components/ui/select";
import { PrimaryButton, SecondaryButton, Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { Plus, Trash2, ImageIcon, X, ImagePlus, Loader2 } from "lucide-react";
import { useState, useCallback, useRef, useEffect, type DragEvent, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";

const VARIANT_UPLOAD_API = "/api/uploads/product-variant";
const MAX_VARIANT_IMAGES = 20;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const CLIENT_ACCEPT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const variantSchema = z.object({
  _id: z.string().optional(),
  variantName: z.string().min(1, "Variant name required"),
  quantityAvailable: z.coerce.number().min(0),
  pricePerUnit: z.coerce.number().min(0, "Price required"),
  imageUrls: z.array(z.string().max(2048)).max(20).default([]),
});

const productSchema = z.object({
  name: z.string().min(1, "Name required"),
  categoryId: z.string().min(1, "Category required"),
  description: z.string().optional(),
  thumbnailUrl: z.string().max(2048).optional(),
  variants: z.array(variantSchema),
});

type ProductFormValues = z.infer<typeof productSchema>;

/** Local preview + upload; only `saved` URLs are sent in the product payload. */
type ImageSlot =
  | { type: "pending"; id: string; previewUrl: string; file: File }
  | { type: "saved"; url: string };

interface ProductFormProps {
  initial?: {
    _id: string;
    name: string;
    categoryId?: string;
    category?: string;
    description?: string;
    thumbnailUrl?: string | null;
    variants: {
      _id?: string;
      variantName: string;
      quantityAvailable: number;
      pricePerUnit: number;
      imageUrl?: string;
      imageUrls?: string[];
    }[];
  };
  onSuccess: () => void;
  onCancel: () => void;
}

function variantImagesFromApi(v: { imageUrls?: string[]; imageUrl?: string }): string[] {
  if (v.imageUrls?.length) return [...v.imageUrls];
  const single = v.imageUrl?.trim();
  return single ? [single] : [];
}

function urlsToSlots(urls: string[]): ImageSlot[] {
  return urls.map((url) => ({ type: "saved" as const, url }));
}

function slotsToSavedUrls(slots: ImageSlot[]): string[] {
  return slots.filter((s): s is { type: "saved"; url: string } => s.type === "saved").map((s) => s.url);
}

function revokeSlot(slot: ImageSlot) {
  if (slot.type === "pending") URL.revokeObjectURL(slot.previewUrl);
}

function normalizeVariantPayload(v: ProductFormValues["variants"][number], imageUrls: string[]) {
  const base = {
    variantName: v.variantName,
    quantityAvailable: Number(v.quantityAvailable),
    pricePerUnit: Number(v.pricePerUnit),
  };
  const urls = imageUrls.map((s) => String(s).trim()).filter(Boolean);
  const withId = v._id ? { _id: v._id, ...base } : base;
  if (urls.length === 0) return { ...withId, imageUrls: [] as string[] };
  return { ...withId, imageUrls: urls, imageUrl: urls[0] };
}

function validateClientImage(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) return "File too large (max 5MB)";
  let t = (file.type || "").toLowerCase();
  if (!t || t === "application/octet-stream") {
    const n = file.name.toLowerCase();
    if (n.endsWith(".jpg") || n.endsWith(".jpeg")) t = "image/jpeg";
    else if (n.endsWith(".png")) t = "image/png";
    else if (n.endsWith(".webp")) t = "image/webp";
    else if (n.endsWith(".gif")) t = "image/gif";
    else t = "";
  }
  // No MIME + no extension (e.g. "Deep_code_1"): allow — server validates bytes/MIME
  if (!t) return null;
  if (!CLIENT_ACCEPT_TYPES.includes(t)) {
    return "Use JPEG, PNG, WebP, or GIF";
  }
  return null;
}

function VariantThumb({ src, className }: { src: string; className?: string }) {
  return <img src={src} alt="" className={cn("object-cover", className)} loading="lazy" />;
}

export function ProductForm({ initial, onSuccess, onCancel }: ProductFormProps) {
  const isEdit = !!initial;
  const [activeTab, setActiveTab] = useState<"details" | "variants">("details");
  const [imageModalIndex, setImageModalIndex] = useState<number | null>(null);
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [categories, setCategories] = useState<{ _id: string; name: string; isActive: boolean }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => toast.error("Failed to load categories"))
      .finally(() => setCategoriesLoading(false));
  }, []);

  const activeCategories = categories.filter((c) => c.isActive);

  const initialThumb = initial?.thumbnailUrl?.trim();
  const [thumbnailSlot, setThumbnailSlot] = useState<ImageSlot | null>(() =>
    initialThumb ? { type: "saved", url: initialThumb } : null
  );
  const thumbnailSlotRef = useRef<ImageSlot | null>(thumbnailSlot);
  thumbnailSlotRef.current = thumbnailSlot;

  const initialRows =
    initial?.variants?.length
      ? initial.variants.map((v) => variantImagesFromApi(v as never))
      : [];
  const initialSlots = initialRows.map((urls) => urlsToSlots(urls));

  const variantSlotsRef = useRef<ImageSlot[][]>(initialSlots.map((row) => [...row]));
  const [variantSlots, setVariantSlots] = useState<ImageSlot[][]>(() =>
    initialSlots.map((row) => [...row])
  );

  /** After closing the OS file picker, some browsers fire a click on the modal backdrop → onClose unmounts the input before `change` runs. */
  const filePickerBackdropGuardUntilRef = useRef(0);
  const bumpFilePickerBackdropGuard = useCallback(() => {
    filePickerBackdropGuardUntilRef.current = Date.now() + 2000;
  }, []);
  const shouldAllowImageModalBackdropClose = useCallback(() => {
    return Date.now() >= filePickerBackdropGuardUntilRef.current;
  }, []);

  /** Latest modal variant index for file input `change` (avoids stale closure if backdrop races). */
  const imageModalVariantIndexRef = useRef<number | null>(null);
  imageModalVariantIndexRef.current = imageModalIndex;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    getValues,
    trigger,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    shouldUnregister: false,
    defaultValues: initial
      ? {
          name: initial.name,
          categoryId: initial.categoryId ?? "",
          description: initial.description ?? "",
          thumbnailUrl: initialThumb ?? "",
          variants: initial.variants?.length
            ? initial.variants.map((v) => ({
                _id: v._id,
                variantName: v.variantName,
                quantityAvailable: v.quantityAvailable,
                pricePerUnit: v.pricePerUnit,
                imageUrls: variantImagesFromApi(v as never),
              }))
            : [],
        }
      : {
          name: "",
          categoryId: "",
          description: "",
          thumbnailUrl: "",
          variants: [],
        },
  });

  const commitVariantSlots = useCallback(
    (next: ImageSlot[][]) => {
      const copy = next.map((r) => [...r]);
      variantSlotsRef.current = copy;
      setVariantSlots(copy);
      copy.forEach((row, i) => {
        setValue(`variants.${i}.imageUrls`, slotsToSavedUrls(row));
      });
    },
    [setValue]
  );

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });
  const categoryId = watch("categoryId");

  useEffect(() => {
    if (!isEdit && !getValues("categoryId") && activeCategories.length > 0) {
      setValue("categoryId", activeCategories[0]!._id);
    }
  }, [isEdit, activeCategories, getValues, setValue]);

  const appendVariant = useCallback(() => {
    append({
      variantName: "",
      quantityAvailable: 0,
      pricePerUnit: 0,
      imageUrls: [],
    });
    commitVariantSlots([...variantSlotsRef.current, []]);
  }, [append, commitVariantSlots]);

  const removeVariant = useCallback(
    (index: number) => {
      const row = variantSlotsRef.current[index];
      if (row) row.forEach(revokeSlot);
      remove(index);
      commitVariantSlots(variantSlotsRef.current.filter((_, j) => j !== index));
      if (imageModalIndex === index) setImageModalIndex(null);
      else if (imageModalIndex !== null && imageModalIndex > index) {
        setImageModalIndex(imageModalIndex - 1);
      }
    },
    [remove, commitVariantSlots, imageModalIndex]
  );

  const onContinueFromDetails = useCallback(async () => {
    const ok = await trigger(["name", "categoryId", "description", "thumbnailUrl"]);
    if (!ok) return;
    if (thumbnailSlotRef.current?.type === "pending") {
      toast.error("Wait for the thumbnail to finish uploading");
      return;
    }
    setActiveTab("variants");
  }, [trigger]);

  function removeThumbnail() {
    const prev = thumbnailSlotRef.current;
    if (prev?.type === "pending") revokeSlot(prev);
    thumbnailSlotRef.current = null;
    setThumbnailSlot(null);
    setValue("thumbnailUrl", "", { shouldDirty: true });
  }

  async function handleThumbnailFile(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0]!;
    const err = validateClientImage(file);
    if (err) {
      toast.error(err);
      return;
    }
    bumpFilePickerBackdropGuard();
    const prev = thumbnailSlotRef.current;
    if (prev?.type === "pending") revokeSlot(prev);
    const id = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);
    const pending: ImageSlot = { type: "pending", id, previewUrl, file };
    thumbnailSlotRef.current = pending;
    setThumbnailSlot(pending);
    setValue("thumbnailUrl", "", { shouldDirty: true });

    setUploadingThumbnail(true);
    try {
      const url = await uploadOneFile(file);
      URL.revokeObjectURL(previewUrl);
      const saved: ImageSlot = { type: "saved", url };
      thumbnailSlotRef.current = saved;
      setThumbnailSlot(saved);
      setValue("thumbnailUrl", url, { shouldDirty: true });
      toast.success("Thumbnail uploaded");
    } catch (e) {
      URL.revokeObjectURL(previewUrl);
      thumbnailSlotRef.current = null;
      setThumbnailSlot(null);
      setValue("thumbnailUrl", "", { shouldDirty: true });
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingThumbnail(false);
    }
  }

  async function uploadOneFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(VARIANT_UPLOAD_API, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
    return data.url as string;
  }

  function replacePendingWithSaved(
    rows: ImageSlot[][],
    variantIndex: number,
    id: string,
    serverUrl: string,
    previewUrl: string
  ): ImageSlot[][] {
    URL.revokeObjectURL(previewUrl);
    const row = rows[variantIndex] ?? [];
    const nextRow = row.map((s) =>
      s.type === "pending" && s.id === id ? { type: "saved" as const, url: serverUrl } : s
    );
    const next = [...rows];
    next[variantIndex] = nextRow;
    return next;
  }

  function removePendingSlot(
    rows: ImageSlot[][],
    variantIndex: number,
    id: string,
    previewUrl: string
  ): ImageSlot[][] {
    URL.revokeObjectURL(previewUrl);
    const row = rows[variantIndex] ?? [];
    const nextRow = row.filter((s) => !(s.type === "pending" && s.id === id));
    const next = [...rows];
    next[variantIndex] = nextRow;
    return next;
  }

  async function handleVariantImageFiles(index: number, files: FileList | null) {
    if (!files?.length) return;
    if (!Number.isFinite(index) || index < 0) return;

    const currentRow = variantSlotsRef.current[index] ?? [];
    const fileArray = Array.from(files);

    const tasks: { id: string; previewUrl: string; file: File }[] = [];
    for (const file of fileArray) {
      const err = validateClientImage(file);
      if (err) {
        toast.error(err);
        continue;
      }
      if (currentRow.length + tasks.length >= MAX_VARIANT_IMAGES) {
        toast.error(`Maximum ${MAX_VARIANT_IMAGES} images per variant`);
        break;
      }
      tasks.push({
        id: crypto.randomUUID(),
        previewUrl: URL.createObjectURL(file),
        file,
      });
    }

    if (!tasks.length) return;

    if (currentRow.length + tasks.length > MAX_VARIANT_IMAGES) {
      tasks.forEach((t) => URL.revokeObjectURL(t.previewUrl));
      toast.error(`Maximum ${MAX_VARIANT_IMAGES} images per variant`);
      return;
    }

    const pendingSlots: ImageSlot[] = tasks.map((t) => ({
      type: "pending",
      id: t.id,
      previewUrl: t.previewUrl,
      file: t.file,
    }));

    const mergedRow = [...currentRow, ...pendingSlots];
    const baseRows = [...variantSlotsRef.current];
    while (baseRows.length <= index) baseRows.push([]);
    baseRows[index] = mergedRow;
    commitVariantSlots(baseRows);

    setUploadingVariantIndex(index);
    let okCount = 0;
    try {
      for (const t of tasks) {
        try {
          const url = await uploadOneFile(t.file);
          commitVariantSlots(
            replacePendingWithSaved(variantSlotsRef.current, index, t.id, url, t.previewUrl)
          );
          okCount++;
        } catch (e) {
          commitVariantSlots(
            removePendingSlot(variantSlotsRef.current, index, t.id, t.previewUrl)
          );
          toast.error(e instanceof Error ? e.message : "Upload failed");
        }
      }
      if (okCount > 0) {
        toast.success(okCount > 1 ? `${okCount} images uploaded` : "Image uploaded");
      }
    } finally {
      setUploadingVariantIndex(null);
    }
  }

  function removeVariantImage(variantIndex: number, imageIndex: number) {
    const prev = variantSlotsRef.current;
    const row = [...(prev[variantIndex] ?? [])];
    const removed = row[imageIndex];
    if (!removed) return;
    revokeSlot(removed);
    row.splice(imageIndex, 1);
    const next = [...prev];
    next[variantIndex] = row;
    commitVariantSlots(next);
  }

  async function onSubmit(data: ProductFormValues) {
    try {
      if (activeTab === "details") {
        await onContinueFromDetails();
        return;
      }
      const rows = getValues("variants");
      if (!rows?.length) {
        toast.error("Add at least one variant");
        setActiveTab("variants");
        return;
      }
      if (thumbnailSlotRef.current?.type === "pending") {
        toast.error("Wait for the thumbnail to finish uploading");
        setActiveTab("details");
        return;
      }
      const slots = variantSlotsRef.current;
      const pending = slots.some((r) => r.some((s) => s.type === "pending"));
      if (pending) {
        toast.error("Wait for images to finish uploading before saving");
        setActiveTab("variants");
        return;
      }
      const thumbUrl =
        thumbnailSlotRef.current?.type === "saved"
          ? thumbnailSlotRef.current.url.trim()
          : undefined;
      const payload: {
        name: string;
        categoryId: string;
        description?: string;
        thumbnailUrl?: string;
        variants: ReturnType<typeof normalizeVariantPayload>[];
      } = {
        name: data.name,
        categoryId: data.categoryId,
        description: data.description || undefined,
        variants: rows.map((v, i) =>
          normalizeVariantPayload(v, slotsToSavedUrls(slots[i] ?? []))
        ),
      };
      if (isEdit) {
        payload.thumbnailUrl = thumbUrl ?? "";
      } else if (thumbUrl) {
        payload.thumbnailUrl = thumbUrl;
      }
      const url = isEdit ? `/api/products/${initial._id}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg =
          typeof j.error === "string"
            ? j.error
            : j.details
              ? JSON.stringify(j.details)
              : "Request failed";
        throw new Error(msg);
      }
      toast.success(isEdit ? "Product updated" : "Product created");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const modalVariantName =
    imageModalIndex !== null
      ? (getValues(`variants.${imageModalIndex}.variantName`) as string)?.trim() ||
        `Variant ${imageModalIndex + 1}`
      : "";
  const modalSlots = imageModalIndex !== null ? variantSlots[imageModalIndex] ?? [] : [];
  const isModalUploading =
    imageModalIndex !== null && uploadingVariantIndex === imageModalIndex;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="border-b border-gray-200">
        <div className="flex gap-6" role="tablist" aria-label="Product sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "details"}
            className={cn(
              "border-b-2 pb-3 text-sm font-medium transition-colors",
              activeTab === "details"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("details")}
          >
            Product details
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "variants"}
            className={cn(
              "border-b-2 pb-3 text-sm font-medium transition-colors",
              activeTab === "variants"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("variants")}
          >
            Variants
          </button>
        </div>
      </div>

      {activeTab === "details" && (
        <div role="tabpanel" className="space-y-4 pt-1">
          <Input
            label="Product name"
            placeholder="e.g. Disposable cups"
            {...register("name")}
            error={errors.name?.message}
          />
          <SelectDropdown
            label="Category"
            placeholder={categoriesLoading ? "Loading categories…" : "Select category"}
            options={activeCategories.map((c) => ({ value: c._id, label: c.name }))}
            value={categoryId}
            onChange={(v) => setValue("categoryId", v, { shouldValidate: true })}
            error={errors.categoryId?.message}
            disabled={categoriesLoading || activeCategories.length === 0}
          />
          {!categoriesLoading && activeCategories.length === 0 ? (
            <p className="text-sm text-destructive">
              No active categories.{" "}
              <a href="/admin/categories/new" className="underline">
                Create a category
              </a>{" "}
              first.
            </p>
          ) : null}
          <Textarea
            label="Description (optional)"
            placeholder="e.g. Brief description of the product"
            {...register("description")}
            error={errors.description?.message}
          />
          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">Thumbnail (optional)</span>
            <p className="mb-2 text-xs text-muted-foreground">
              Shown on the storefront product list and as the primary image when no variant photos exist.
              JPEG, PNG, WebP, or GIF — max 5MB.
            </p>
            <div className="flex flex-wrap items-start gap-3">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-gray-300 bg-muted/30">
                {thumbnailSlot ? (
                  <>
                    <VariantThumb
                      src={thumbnailSlot.type === "pending" ? thumbnailSlot.previewUrl : thumbnailSlot.url}
                      className="h-full w-full"
                    />
                    {thumbnailSlot.type === "pending" && uploadingThumbnail && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-7 w-7 animate-spin text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                  id="product-thumbnail-file"
                  className="sr-only"
                  disabled={uploadingThumbnail}
                  onPointerDownCapture={bumpFilePickerBackdropGuard}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const list = e.target.files;
                    const input = e.currentTarget;
                    queueMicrotask(() => {
                      input.value = "";
                    });
                    void handleThumbnailFile(list);
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit gap-2"
                    disabled={uploadingThumbnail}
                    onPointerDownCapture={bumpFilePickerBackdropGuard}
                    onClick={() => document.getElementById("product-thumbnail-file")?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {thumbnailSlot ? "Change thumbnail" : "Upload thumbnail"}
                  </Button>
                  {thumbnailSlot ? (
                    <button
                      type="button"
                      onClick={removeThumbnail}
                      disabled={uploadingThumbnail}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                      aria-label="Remove thumbnail"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <input type="hidden" {...register("thumbnailUrl")} />
          </div>
          <p className="text-xs text-muted-foreground">
            Use <strong>Continue</strong> to add variants, pricing, and variant images. Create the product from the
            Variants tab.
          </p>
        </div>
      )}

      {activeTab === "variants" && (
        <div role="tabpanel" className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Variants</label>
            <button
              type="button"
              onClick={appendVariant}
              className="text-sm text-primary hover:underline"
            >
              <Plus className="inline h-4 w-4" /> Add variant
            </button>
          </div>
          {errors.variants?.message && (
            <p className="text-sm text-destructive">{errors.variants.message}</p>
          )}
          <div className="space-y-3">
            {fields.map((field, i) => {
              const slots = variantSlots[i] ?? [];
              return (
                <div
                  key={field.id}
                  className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/30 p-4 pr-3 sm:pr-6"
                >
                  <div className="min-w-0 flex-1 basis-full sm:basis-[280px] sm:flex-initial">
                    <span className="text-sm font-medium text-foreground">Variant images</span>
                    <p className="mb-2 text-xs text-muted-foreground">
                      JPEG, PNG, WebP, or GIF — max 5MB each. Up to {MAX_VARIANT_IMAGES} per variant.
                      Upload one or many; preview appears immediately, then files are stored when upload
                      completes.
                    </p>
                    {slots.length > 0 ? (
                      <div className="rounded-lg border border-border/50 bg-background/50">
                        <div
                          className="max-h-[180px] overflow-y-auto overflow-x-hidden overscroll-y-contain p-2 [scrollbar-gutter:stable] sm:max-h-[200px] sm:p-2.5"
                          style={{ WebkitOverflowScrolling: "touch" }}
                        >
                          <div className="flex flex-wrap content-start justify-center gap-2 sm:gap-2.5">
                            {slots.map((slot, imgIdx) => (
                              <div
                                key={slot.type === "pending" ? slot.id : `${slot.url}-${imgIdx}`}
                                className="group relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg border border-gray-300 bg-background shadow-sm ring-1 ring-black/5 sm:h-20 sm:w-20"
                              >
                                <VariantThumb
                                  src={slot.type === "pending" ? slot.previewUrl : slot.url}
                                  className="h-full w-full"
                                />
                                {slot.type === "pending" && uploadingVariantIndex === i && (
                                  <div
                                    className="absolute inset-0 flex items-center justify-center bg-black/40"
                                    aria-hidden
                                  >
                                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeVariantImage(i, imgIdx)}
                                  className="absolute right-0.5 top-0.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow-md ring-1 ring-white/15 transition-colors hover:bg-destructive hover:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                                  aria-label="Remove image"
                                >
                                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-background">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                      multiple
                      id={`variant-file-inline-${i}`}
                      className="sr-only"
                      disabled={uploadingVariantIndex === i}
                      onPointerDownCapture={bumpFilePickerBackdropGuard}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const list = e.target.files;
                        const input = e.currentTarget;
                        queueMicrotask(() => {
                          input.value = "";
                        });
                        void handleVariantImageFiles(i, list);
                      }}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={uploadingVariantIndex === i}
                        onPointerDownCapture={bumpFilePickerBackdropGuard}
                        onClick={() => document.getElementById(`variant-file-inline-${i}`)?.click()}
                      >
                        <ImagePlus className="h-4 w-4" />
                        {slots.length > 0 ? "Add more images" : "Upload images"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          bumpFilePickerBackdropGuard();
                          setImageModalIndex(i);
                        }}
                      >
                        <ImageIcon className="h-4 w-4" />
                        Manage in modal
                      </Button>
                    </div>
                    <input type="hidden" {...register(`variants.${i}._id`)} />
                  </div>
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
                    onClick={() => removeVariant(i)}
                    className="mb-1 shrink-0 rounded p-2 text-destructive hover:bg-destructive/10"
                    aria-label="Remove variant"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={imageModalIndex !== null}
        onClose={() => {
          if (isModalUploading) return;
          setImageModalIndex(null);
        }}
        shouldCloseOnBackdropClick={shouldAllowImageModalBackdropClose}
        title={`Images — ${modalVariantName}`}
        size="full"
        className="max-w-xl sm:max-w-2xl"
        footer={
          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              onClick={() => setImageModalIndex(null)}
              disabled={isModalUploading}
            >
              Done
            </Button>
          </div>
        }
      >
        {imageModalIndex !== null && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground sm:text-sm">
              Select one or more images. A preview appears right away; after upload finishes, the
              stored URL is added to this product. You can remove any image before saving the
              product.
            </p>
            {modalSlots.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Preview &amp; current</p>
                <div className="rounded-lg border border-border/60 bg-muted/25">
                  <div
                    className="max-h-[140px] overflow-y-auto overflow-x-hidden overscroll-y-contain p-2 [scrollbar-gutter:stable] sm:max-h-[160px] sm:p-2.5"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <div className="flex flex-wrap content-start justify-center gap-2 sm:gap-2">
                      {modalSlots.map((slot, imgIdx) => (
                        <div
                          key={slot.type === "pending" ? slot.id : `${slot.url}-${imgIdx}`}
                          className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-background shadow-sm ring-1 ring-black/5 sm:h-16 sm:w-16"
                        >
                          <VariantThumb
                            src={slot.type === "pending" ? slot.previewUrl : slot.url}
                            className="h-full w-full"
                          />
                          {slot.type === "pending" && isModalUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <Loader2 className="h-5 w-5 animate-spin text-white sm:h-6 sm:w-6" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeVariantImage(imageModalIndex, imgIdx)}
                            className="absolute right-0.5 top-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white shadow ring-1 ring-white/15 transition-colors hover:bg-destructive hover:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                            aria-label="Remove image"
                          >
                            <X className="h-3 w-3" strokeWidth={2.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div>
              <p className="mb-1.5 block text-xs font-medium sm:text-sm">Upload images</p>
              <div
                className="relative flex min-h-[96px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-muted/30 px-4 py-5 transition-colors hover:bg-muted/50 has-[:disabled]:cursor-not-allowed sm:min-h-[104px] sm:py-6"
                onPointerDownCapture={bumpFilePickerBackdropGuard}
                onDragOver={(e: DragEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e: DragEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  bumpFilePickerBackdropGuard();
                  if (imageModalIndex === null || isModalUploading) return;
                  void handleVariantImageFiles(imageModalIndex, e.dataTransfer.files);
                }}
              >
                <div className="pointer-events-none flex flex-col items-center">
                  <ImageIcon className="mb-1.5 h-7 w-7 text-muted-foreground sm:mb-2 sm:h-8 sm:w-8" />
                  <span className="text-xs font-medium text-foreground sm:text-sm">
                    {isModalUploading ? "Uploading…" : "Click to select files"}
                  </span>
                  <span className="mt-0.5 max-w-[16rem] text-center text-[10px] leading-tight text-muted-foreground sm:mt-1 sm:text-xs">
                    JPEG, PNG, WebP, GIF · multiple · drag and drop
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                  multiple
                  aria-label="Choose image files"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  disabled={isModalUploading}
                  onPointerDownCapture={bumpFilePickerBackdropGuard}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const list = e.target.files;
                    const input = e.currentTarget;
                    const variantIdx = imageModalVariantIndexRef.current;
                    queueMicrotask(() => {
                      input.value = "";
                    });
                    if (!list?.length || variantIdx === null) return;
                    void handleVariantImageFiles(variantIdx, list);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        {activeTab === "details" ? (
          <PrimaryButton type="button" onClick={() => void onContinueFromDetails()}>
            Continue
          </PrimaryButton>
        ) : (
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
          </PrimaryButton>
        )}
      </div>
    </form>
  );
}
