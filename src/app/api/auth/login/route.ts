import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Admin from "@/lib/models/Admin";
import { createToken, setAuthCookie } from "@/lib/auth";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email or password", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;
    await connectDB();

    let admin = await Admin.findOne({ email });
    if (!admin) {
      const seedEmail = process.env.ADMIN_EMAIL;
      const seedPassword = process.env.ADMIN_PASSWORD;
      if (seedEmail && seedPassword && email === seedEmail) {
        admin = await Admin.create({ email: seedEmail, password: seedPassword });
      }
    }
    if (!admin) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const valid = await admin.comparePassword(password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const token = await createToken({
      email: admin.email,
      id: admin._id.toString(),
    });
    await setAuthCookie(token);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
