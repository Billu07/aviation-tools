import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Use relative import to avoid alias issues:
import { createRecord } from "../../../lib/airtable";
const T_LEADS = process.env.AIRTABLE_TABLE_LEADS || "Leads";

const PostLead = z.object({
  productId: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional().default(""),
  role: z.string().optional().default(""),
  message: z.string().optional().default(""),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = PostLead.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const v = parsed.data;

  try {
    const fields: Record<string, any> = {
      Product: [v.productId],
      "Lead Name": v.name,
      Email: v.email,
      Company: v.company,
      Role: v.role,
      Message: v.message,
      Source: "Website form",
      Status: "New",
    };

    await createRecord(T_LEADS, fields);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/leads POST] error:", err);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 400 }
    );
  }
}
