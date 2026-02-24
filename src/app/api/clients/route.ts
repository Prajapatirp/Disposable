import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/lib/models/Client";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

const phoneSchema = z
  .string()
  .min(1, "Phone required")
  .regex(/^\d{10}$/, "Phone must be exactly 10 digits (numbers only)");

const CreateClientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: phoneSchema,
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  pincode: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1).default("India"),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  companyAddress: z.string().optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    await connectDB();
    const clients = await Client.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(clients);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const parsed = CreateClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await connectDB();
    const { addressLine1, addressLine2, pincode, city, state, country } = parsed.data;
    const addressLine = [addressLine1, addressLine2].filter(Boolean).join(", ");
    const address = [addressLine, city, state, pincode, country].filter(Boolean).join(", ");
    const client = await Client.create({
      ...parsed.data,
      address,
    });
    return NextResponse.json(client);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
