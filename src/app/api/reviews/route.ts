/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { listRecords, createRecord } from "../../../lib/airtable";

const T_REVIEWS = process.env.AIRTABLE_TABLE_REVIEWS || "Reviews";
const T_PRODUCTS = process.env.AIRTABLE_TABLE_PRODUCTS || "Products";

// If your linked field to Products has a different name, add it here.
const PRODUCT_LINK_FIELDS = [
  "Product",
  "Products",
  "Product Link",
  "Product(link)",
  "Product Record",
];

// GET /api/reviews?approved=true&productId=rec...
export async function GET(request: Request) {
  const url = new URL(request.url);
  const approved = url.searchParams.get("approved");
  const productId = url.searchParams.get("productId");

  try {
    const params: Record<string, string> = {};
    const filters: string[] = [];

    if (approved === "true") {
      // Support either a checkbox "Approved" or a single-select "Status"
      filters.push('OR({Approved}=TRUE(), {Status}="Approved")');
    }

    if (productId) {
      // OR across possible product link field names
      const ors = PRODUCT_LINK_FIELDS.map((f) => `{${f}}='${productId}'`).join(
        ", "
      );
      filters.push(`OR(${ors})`);
    }

    if (filters.length) {
      params.filterByFormula =
        filters.length === 1 ? filters[0] : `AND(${filters.join(",")})`;
    }

    const recs = await listRecords(T_REVIEWS, params);

    const mapped = recs
      .map((r) => {
        const f = r.fields as any;
        const createdTime =
          (f["Date"] as string | undefined) ||
          (f["Created"] as string | undefined) ||
          (f["Created Time"] as string | undefined) ||
          ((r as any).createdTime as string | undefined);

        return {
          id: r.id,
          productId: productId ?? "", // optional
          displayName: f["Anonymous"]
            ? "Anonymous"
            : f["Reviewer Name"] || f["Name"] || "Anonymous",
          role: f["Role"] || "Other",
          fleetSize: f["Fleet Size"] || "Small",
          rating: Number(f["Star Rating"] ?? f["Rating"] ?? 0),
          pros: f["Pros"] || "",
          cons: f["Cons"] || "",
          wouldRecommend: Boolean(f["Would Recommend"]),
          date: createdTime || new Date().toISOString(),
        };
      })
      // newest first
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(mapped);
  } catch (e: any) {
    console.error("[/api/reviews GET] error:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}

// POST /api/reviews
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productId,
      reviewerName = "",
      email = "",
      role = "Dispatcher",
      fleetSize = "Small",
      rating = 5,
      pros = "",
      cons = "",
      anonymous = false,
      wouldRecommend = true,
    } = body || {};

    if (
      !productId ||
      typeof productId !== "string" ||
      !productId.startsWith("rec")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid productId. Expected an Airtable record id (rec...).",
        },
        { status: 400 }
      );
    }

    // Non-link fields
    const baseFields: Record<string, any> = {
      "Reviewer Name": reviewerName,
      Email: email,
      Role: role,
      "Fleet Size": fleetSize,
      "Star Rating": Number(rating),
      Pros: pros,
      Cons: cons,
      Anonymous: Boolean(anonymous),
      "Would Recommend": Boolean(wouldRecommend),
      Approved: false,
      Status: "Pending", // if you have a Status single-select
      Date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    };

    // Try each possible product-link field name until one succeeds.
    let lastErr: any = null;
    for (const linkField of PRODUCT_LINK_FIELDS) {
      try {
        const fieldsAttempt = { ...baseFields, [linkField]: [productId] }; // IMPORTANT: array of rec IDs
        const created = await createRecord(T_REVIEWS, fieldsAttempt);
        return NextResponse.json({ ok: true, id: created?.id });
      } catch (err: any) {
        lastErr = err;
        // Continue trying next field name
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to write to the linked Product field. Check the exact column name in Reviews.",
        detail: String(lastErr?.message || lastErr),
        triedFields: PRODUCT_LINK_FIELDS,
      },
      { status: 422 }
    );
  } catch (e: any) {
    console.error("[/api/reviews POST] error:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
