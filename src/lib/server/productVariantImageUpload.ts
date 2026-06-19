import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { requireAuth } from "@/lib/api-auth";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "product-variants");
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const extFromMime: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function mimeFromFileName(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return undefined;
}

/** When the browser sends empty/octet-stream MIME and the filename has no extension (e.g. "Deep_code_1"). */
function mimeFromMagicBytes(buf: Buffer): string | undefined {
  if (buf.length < 12) return undefined;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.length >= 12 &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return undefined;
}

function isBlobLike(v: unknown): v is Blob {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Blob).arrayBuffer === "function" &&
    typeof (v as Blob).size === "number"
  );
}

/**
 * Stores one image under public/uploads/product-variants and returns public URLs.
 * Field name: "file" (multipart/form-data).
 */
export async function handleProductVariantImageUpload(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!isBlobLike(file)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    const fileName = typeof (file as File).name === "string" ? (file as File).name : "";
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    let type = (file.type || "").trim().toLowerCase();
    if (!type || type === "application/octet-stream") {
      const guessed = mimeFromFileName(fileName);
      if (guessed) type = guessed;
    }
    if (!ALLOWED.has(type)) {
      const fromMagic = mimeFromMagicBytes(buf);
      if (fromMagic) type = fromMagic;
    }
    if (!ALLOWED.has(type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }
    const ext = extFromMime[type] ?? ".bin";
    const name = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = path.join(UPLOAD_DIR, name);
    await writeFile(filePath, buf);
    const url = `/uploads/product-variants/${name}`;
    const origin = req.nextUrl.origin;
    const absoluteUrl = `${origin}${url}`;
    return NextResponse.json({ url, absoluteUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
