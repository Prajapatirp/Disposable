import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OtpRequest from "@/lib/models/OtpRequest";
import { createResetToken } from "@/lib/auth";
import { z } from "zod";

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VerifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, otp } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    await connectDB();
    const record = await OtpRequest.findOne({
      email: normalizedEmail,
      otp,
      expiresAt: { $gt: new Date() },
    });
    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }
    await OtpRequest.deleteOne({ _id: record._id });
    const resetToken = await createResetToken({ email: normalizedEmail });
    return NextResponse.json({
      success: true,
      resetToken,
      message: "OTP verified. You can now set a new password.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
