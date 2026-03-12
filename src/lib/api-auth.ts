import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}
