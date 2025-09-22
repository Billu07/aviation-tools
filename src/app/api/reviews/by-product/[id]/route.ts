/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { listRecords } from "../../../../../lib/airtable";

const T_REVIEWS = process.env.AIRTABLE_TABLE_REVIEWS || "Reviews";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Expect Reviews.Product to be a linked field to Products
    const records = await listRecords(T_REVIEWS, {
      filterByFormula: `ARRAYJOIN({Product}) = '${params.id}'`,
      // if your column is named differently, adjust the formula above
    });

    const mapped = records.map((r) => {
      const f = r.fields as any;
      return {
        id: r.id,
        displayName:
          f["Display Name"] ||
          (f["Anonymous?"] ? "Anonymous" : f["Reviewer Name"] || ""),
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
