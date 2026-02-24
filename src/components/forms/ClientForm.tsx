"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { toast } from "sonner";

const phoneSchema = z
  .string()
  .min(1, "Phone required")
  .regex(/^\d{10}$/, "Only 10 digits allowed (no letters or symbols)");

const clientSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  phoneNumber: phoneSchema,
  addressLine1: z.string().min(1, "Address line 1 required"),
  addressLine2: z.string().optional(),
  pincode: z.string().min(1, "Pincode required"),
  city: z.string().min(1, "City required"),
  state: z.string().min(1, "State required"),
  country: z.string().min(1, "Country required"),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  companyAddress: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  initial?: {
    _id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    pincode?: string;
    city?: string;
    state?: string;
    country?: string;
    businessName?: string;
    gstNumber?: string;
    companyAddress?: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const DEFAULT_COUNTRY = "India";

/** Parse legacy combined address string into addressLine1, city, state, pincode, country. */
function parseAddressFields(address: string): {
  addressLine1: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
} {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 4) {
    return {
      addressLine1: parts.slice(0, -4).join(", "),
      city: parts[parts.length - 4] ?? "",
      state: parts[parts.length - 3] ?? "",
      pincode: parts[parts.length - 2] ?? "",
      country: parts[parts.length - 1] ?? DEFAULT_COUNTRY,
    };
  }
  return {
    addressLine1: address,
    pincode: "",
    city: "",
    state: "",
    country: DEFAULT_COUNTRY,
  };
}

export function ClientForm({ initial, onSuccess, onCancel }: ClientFormProps) {
  const isEdit = !!initial;
  const hasLegacyAddressOnly =
    initial?.address && !initial?.addressLine1 && !initial?.city;
  const parsed =
    hasLegacyAddressOnly && initial
      ? parseAddressFields(initial?.address ?? "")
      : null;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: initial
      ? {
          firstName: initial.firstName,
          lastName: initial.lastName,
          phoneNumber: initial.phoneNumber,
          addressLine1: parsed
            ? parsed.addressLine1
            : (initial.addressLine1 ?? initial.address ?? ""),
          addressLine2: initial.addressLine2 ?? "",
          pincode: parsed ? parsed.pincode : (initial.pincode ?? ""),
          city: parsed ? parsed.city : (initial.city ?? ""),
          state: parsed ? parsed.state : (initial.state ?? ""),
          country: parsed ? parsed.country : (initial.country ?? DEFAULT_COUNTRY),
          businessName: initial.businessName ?? "",
          gstNumber: initial.gstNumber ?? "",
          companyAddress: initial.companyAddress ?? "",
        }
      : {
          firstName: "",
          lastName: "",
          phoneNumber: "",
          addressLine1: "",
          addressLine2: "",
          pincode: "",
          city: "",
          state: "",
          country: DEFAULT_COUNTRY,
          businessName: "",
          gstNumber: "",
          companyAddress: "",
        },
  });

  async function onSubmit(data: ClientFormValues) {
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || undefined,
        pincode: data.pincode,
        city: data.city,
        state: data.state,
        country: data.country,
        businessName: data.businessName || undefined,
        gstNumber: data.gstNumber || undefined,
        companyAddress: data.companyAddress || undefined,
      };
      const url = isEdit ? `/api/clients/${initial._id}` : "/api/clients";
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
      toast.success(isEdit ? "Client updated" : "Client created");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="First name"
          placeholder="e.g. John"
          {...register("firstName")}
          error={errors.firstName?.message}
        />
        <Input
          label="Last name"
          placeholder="e.g. Doe"
          {...register("lastName")}
          error={errors.lastName?.message}
        />
      </div>
      <Controller
        name="phoneNumber"
        control={control}
        render={({ field }) => (
          <Input
            label="Phone number"
            placeholder="10 digits only (numbers only)"
            inputMode="numeric"
            maxLength={10}
            {...field}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
              field.onChange(digitsOnly);
            }}
            error={errors.phoneNumber?.message}
          />
        )}
      />
      <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
        <h3 className="text-sm font-medium">Address</h3>
        <Input
          label="Address line 1"
          placeholder="e.g. Building, street"
          {...register("addressLine1")}
          error={errors.addressLine1?.message}
        />
        <Input
          label="Address line 2 (optional)"
          placeholder="e.g. Landmark, area"
          {...register("addressLine2")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Pincode"
            placeholder="e.g. 110001"
            {...register("pincode")}
            error={errors.pincode?.message}
          />
          <Input
            label="City"
            placeholder="e.g. New Delhi"
            {...register("city")}
            error={errors.city?.message}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="State"
            placeholder="e.g. Delhi"
            {...register("state")}
            error={errors.state?.message}
          />
          <Input
            label="Country"
            placeholder="India"
            {...register("country")}
            error={errors.country?.message}
          />
        </div>
      </div>
      <Input
        label="Business name (optional)"
        placeholder="e.g. ABC Pvt Ltd"
        {...register("businessName")}
      />
      <Input
        label="GST number (optional)"
        placeholder="e.g. 27XXXXX1234X1XX"
        {...register("gstNumber")}
      />
      <Textarea
        label="Company address (optional)"
        placeholder="Full company address if different"
        {...register("companyAddress")}
      />

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
