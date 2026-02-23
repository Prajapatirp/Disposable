import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Admin from "@/lib/models/Admin";
import OtpRequest from "@/lib/models/OtpRequest";
import { sendOtpEmail } from "@/lib/email";
import { z } from "zod";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});

const OTP_EXPIRY_MINUTES = 10;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    await connectDB();
    const admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive an OTP. It expires in 10 minutes.",
      });
    }
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await OtpRequest.deleteMany({ email: normalizedEmail });
    await OtpRequest.create({ email: normalizedEmail, otp, expiresAt });
    const { sent, error } = await sendOtpEmail(normalizedEmail, otp);
    if (!sent) {
      return NextResponse.json(
        { error: error || "Failed to send OTP email" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "OTP sent to your email. It expires in 10 minutes.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
