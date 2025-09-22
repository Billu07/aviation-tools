import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Use relative import to avoid alias issues:
import { listRecords, createRecord } from "../../../lib/airtable";
const T_REVIEWS = process.env.AIRTABLE_TABLE_REVIEWS || "Reviews";

/** ---------- POST body validation ---------- */
const PostReview = z.object({
  productId: z.string(),
  reviewerName: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
  role: z.string().optional(),
  fleetSize: z.string().optional(),
  rating: z.number().min(1).max(5),
  pros: z.string().optional().default(""),
  cons: z.string().optional().default(""),
  anonymous: z.boolean().optional().default(false),
  wouldRecommend: z.boolean().optional().default(true),
});

/** ---------- GET /api/reviews?approved=true ----------
 * Tries to filter by {Approved?} = 1.
 * If anything fails (field missing, perms, env), logs and returns [].
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const wantsApprovedOnly = url.searchParams.get("approved") === "true";

  try {
    const filter = wantsApprovedOnly ? "{Approved?} = 1" : undefined;
    const records = await listRecords(
      T_REVIEWS,
      filter ? { filterByFormula: filter } : {}
    );
    return NextResponse.json(records.map(mapReview));
  } catch (err) {
    console.error("[/api/reviews GET] falling back to []:", err);
    return NextResponse.json([]);
  }
}

/** ---------- POST /api/reviews ----------
 * Creates a new review with Approved? = false by default.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = PostReview.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const v = parsed.data;

  try {
    const fields: Record<string, any> = {
      Product: [v.productId], // link by Product record id
      "Reviewer Name": v.reviewerName,
      Role: v.role || "Other",
      "Fleet Size": v.fleetSize || "Small",
      "Star Rating": v.rating,
      Pros: v.pros,
      Cons: v.cons,
      "Anonymous?": v.anonymous,
      "Would Recommend": v.wouldRecommend,
      "Approved?": false, // moderation
      Date: new Date().toISOString().slice(0, 10),
    };

    await createRecord(T_REVIEWS, fields);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/reviews POST] error:", err);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 400 }
    );
  }
}

/** ---------- mapper ---------- */
function mapReview(r: { id: string; fields: Record<string, any> }) {
  const f = r.fields as any;
  const displayName =
    f["Display Name"] ||
    (f["Anonymous?"] ? "Anonymous" : f["Reviewer Name"] || "");
  const linked = (f["Product"] || []) as string[]; // product record IDs

  return {
    id: r.id,
    productId: linked?.[0] || "",
    displayName,
    role: f["Role"] || "Other",
    fleetSize: f["Fleet Size"] || "Small",
    rating: Number(f["Star Rating"]) || 0,
    pros: f["Pros"] || "",
    cons: f["Cons"] || "",
    wouldRecommend: !!f["Would Recommend"],
    date: f["Date"] || new Date().toISOString(),
  };
}
