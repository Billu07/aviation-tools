/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { listRecords } from "../../../../../lib/airtable";

const T_REVIEWS = process.env.AIRTABLE_TABLE_REVIEWS || "Reviews";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } // <-- Promise
) {
  const { id } = await ctx.params; // <-- await

  try {
    const records = await listRecords(T_REVIEWS, {
      // Reviews.Product is a linked field. ARRAYJOIN turns ["rec..."] into "rec..."
      filterByFormula: `ARRAYJOIN({Product}) = '${id}'`,
    });

    const mapped = records.map((r) => {
      const f = r.fields as any;
      const productIds: string[] = Array.isArray(f["Product"])
        ? f["Product"]
        : [];
      return {
        id: r.id,
        productId: productIds[0] || "",
        displayName:
          f["Display Name"] ||
          (f["Anonymous?"] ? "Anonymous" : f["Reviewer Name"] || "Anonymous"),
        role: f["Role"] || "Other",
        fleetSize: f["Fleet Size"] || "Small",
        rating: Number(f["Star Rating"]) || 0,
        pros: f["Pros"] || "",
        cons: f["Cons"] || "",
        wouldRecommend: !!f["Would Recommend"],
        date: f["Date"] || new Date().toISOString(),
      };
    });

    return NextResponse.json(mapped);
  } catch (e) {
    console.error("[/api/reviews/by-product/[id]]", e);
    return NextResponse.json([]); // safe fallback
  }
}
