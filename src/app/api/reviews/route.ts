/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { listRecords, createRecord } from "../../../lib/airtable";

const T_REVIEWS = process.env.AIRTABLE_TABLE_REVIEWS || "Reviews";
const T_PRODUCTS = process.env.AIRTABLE_TABLE_PRODUCTS || "Products";

// If you renamed the linked field for product, one of these should match.
// You can add more variants if needed.
const PRODUCT_LINK_FIELDS = [
  "Product",
  "Products",
  "Product Link",
  "Product (link)",
  "Product Record",
];

// GET ?approved=true&productId=rec... (optional)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const approved = url.searchParams.get("approved");
  const productId = url.searchParams.get("productId");

  try {
    const params: Record<string, string> = {};
    const filters: string[] = [];

    if (approved === "true") {
      // support either checkbox "Approved" or a single-select Status
      filters.push('OR({Approved}=TRUE(), {Status}="Approved")');
    }
    if (productId) {
      // match any possible product-link field: OR(Product=rec123, Products=rec123, ...)
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
        const date =
          f["Date"] || f["Created"] || f["Created Time"] || r["createdTime"];
        return {
          id: r.id,
          productId, // not strictly needed in UI here
          displayName: f["Anonymous"]
            ? "Anonymous"
            : f["Reviewer Name"] || f["Name"] || "Anonymous",
          role: f["Role"] || "Other",
          fleetSize: f["Fleet Size"] || "Small",
          rating: Number(f["Star Rating"] ?? f["Rating"] ?? 0),
          pros: f["Pros"] || "",
          cons: f["Cons"] || "",
          wouldRecommend: Boolean(f["Would Recommend"]),
          date: typeof date === "string" ? date : new Date().toISOString(),
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productId, // recXXXX of the product
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

    // Build the common non-link fields
    const baseFields = {
      "Reviewer Name": reviewerName,
      Email: email,
      Role: role,
      "Fleet Size": fleetSize,
      "Star Rating": Number(rating),
      Pros: pros,
      Cons: cons,
      Anonymous: Boolean(anonymous),
      "Would Recommend": Boolean(wouldRecommend),
      Approved: false, // default moderation
      Date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    };

    // Some bases have both "Approved" (checkbox) and "Status" (single select):
    // We can optionally set Status to "Pending".
    (baseFields as any)["Status"] = (baseFields as any)["Status"] || "Pending";

    // Try each candidate field name for the product link until one works.
    let lastErr: any = null;
    for (const linkField of PRODUCT_LINK_FIELDS) {
      const fieldsAttempt: Record<string, any> = {
        ...baseFields,
        [linkField]: [productId], // IMPORTANT: linked record expects an ARRAY of IDs
      };

      try {
        const created = await createRecord(T_REVIEWS, fieldsAttempt);
        return NextResponse.json({ ok: true, id: created?.id });
      } catch (err: any) {
        // If it's a 422 about invalid value for column, try next field name
        lastErr = err;
        continue;
      }
    }

    // If all attempts failed, surface the last error for debugging
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
