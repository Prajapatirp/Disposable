"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PrimaryButton } from "@/components/ui/button";
import { toast } from "sonner";

const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type VerifyOtpForm = z.infer<typeof verifyOtpSchema>;

function VerifyOtpFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyOtpForm>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { email: emailFromQuery, otp: "" },
  });

  async function onSubmit(data: VerifyOtpForm) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, otp: data.otp }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Invalid or expired OTP");
        return;
      }
      toast.success(json.message || "OTP verified.");
      router.push(
        `/admin/reset-password?resetToken=${encodeURIComponent(json.resetToken)}`
      );
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email"
        type="email"
        placeholder="admin@example.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="OTP"
        type="text"
        placeholder="000000"
        maxLength={6}
        error={errors.otp?.message}
        {...register("otp")}
      />
      <PrimaryButton
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Verifying..." : "Verify OTP"}
      </PrimaryButton>
    </form>
  );
}

export default function VerifyOtpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Verify OTP
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your email. It expires in 10 minutes.
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="animate-pulse h-10 bg-muted rounded" />}>
            <VerifyOtpFormInner />
          </Suspense>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/admin/forgot-password" className="underline hover:no-underline">
              Request new OTP
            </Link>
            {" · "}
            <Link href="/admin/login" className="underline hover:no-underline">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
