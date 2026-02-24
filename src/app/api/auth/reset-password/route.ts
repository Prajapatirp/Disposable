import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Admin from "@/lib/models/Admin";
import { verifyResetToken } from "@/lib/auth";
import { z } from "zod";

const ResetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { resetToken, newPassword } = parsed.data;
    const payload = await verifyResetToken(resetToken);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new OTP." },
        { status: 400 }
      );
    }
    await connectDB();
    const admin = await Admin.findOne({ email: payload.email });
    if (!admin) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }
    admin.password = newPassword;
    await admin.save();
    return NextResponse.json({
      success: true,
      message: "Password updated. You can now sign in.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
