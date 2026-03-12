"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button, PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ChangePasswordForm) {
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to change password");
        return;
      }
      toast.success("Password changed. Please sign in with your new password.");
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Change password</h1>
          <p className="text-muted-foreground">
            Update your account password
          </p>
        </div>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>New password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <PasswordInput
              label="Current password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              {...register("currentPassword")}
            />
            <PasswordInput
              label="New password"
              placeholder="At least 6 characters"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              {...register("newPassword")}
            />
            <PasswordInput
              label="Confirm new password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            <div className="flex gap-2 pt-2">
              <SecondaryButton type="button" onClick={() => router.back()}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Change password"}
              </PrimaryButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
