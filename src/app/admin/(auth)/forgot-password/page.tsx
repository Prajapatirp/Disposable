"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PrimaryButton } from "@/components/ui/button";
import { toast } from "sonner";

const forgotSchema = z.object({
  email: z.string().email("Invalid email"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotForm) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to send OTP");
        return;
      }
      toast.success(json.message || "OTP sent. Check your email.");
      router.push(`/admin/verify-otp?email=${encodeURIComponent(data.email)}`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Forgot password
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your admin email. We&apos;ll send a 6-digit OTP (valid 10 minutes).
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="admin@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <PrimaryButton
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </PrimaryButton>
          </form>
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
