"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { PrimaryButton } from "@/components/ui/button";
import { toast } from "sonner";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("resetToken") ?? "";
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(data: ResetPasswordForm) {
    if (!resetToken) {
      toast.error("Missing reset link. Please request a new OTP.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          newPassword: data.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to reset password");
        return;
      }
      toast.success(json.message || "Password updated.");
      router.push("/admin/login");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!resetToken) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          Invalid or missing reset link. Please start from{" "}
          <Link href="/admin/forgot-password" className="underline">
            Forgot password
          </Link>
          .
        </p>
        <Link href="/admin/login">
          <PrimaryButton type="button" className="w-full">
            Back to login
          </PrimaryButton>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <PasswordInput
        label="New password"
        placeholder="••••••••"
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />
      <PasswordInput
        label="Confirm password"
        placeholder="••••••••"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <PrimaryButton
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Updating..." : "Set new password"}
      </PrimaryButton>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Set new password
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter and confirm your new password.
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="animate-pulse h-10 bg-muted rounded" />}>
            <ResetPasswordFormInner />
          </Suspense>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/admin/login" className="underline hover:no-underline">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
