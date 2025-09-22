/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { listRecords, createRecord } from "../../../lib/airtable";

const T_REVIEWS = process.env.AIRTABLE_TABLE_REVIEWS || "Reviews";

/**
 * GET /api/reviews?approved=true|false
 * - approved=true: return only approved reviews
 * - default: return all
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const approvedOnly = url.searchParams.get("approved") === "true";

    let filterByFormula = "";
    // Support either a checkbox "Approved" or a "Status" single select with 'Approved'
    if (approvedOnly) {
      filterByFormula = "OR({Approved}=TRUE(), {Status}='Approved')";
    }

    const records = await listRecords(T_REVIEWS, {
      ...(filterByFormula ? { filterByFormula } : {}),
    });

    const mapped = records.map((r) => {
      const f = r.fields as any;
      // If Product is linked, Airtable returns an array of record ids
      const productIds: string[] = Array.isArray(f["Product"])
        ? f["Product"]
        : [];
      return {
        id: r.id,
        productId: productIds[0] || f["Product Id"] || "", // fallback if you kept a text field
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
    console.error("[/api/reviews GET]", e);
    return NextResponse.json([]);
  }
}

/**
 * POST /api/reviews
 * Body:
 * { productId, reviewerName, email, role, fleetSize, rating, pros, cons, anonymous, wouldRecommend }
 *
 * Notes:
 * - If Reviews.Product is a linked field to Products, it MUST be an array: { Product: [productId] }
 * - We default Status='Pending' and Approved=false so your “approved only” feed stays clean.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      productId,
      reviewerName,
      email,
      role,
      fleetSize,
      rating,
      pros,
      cons,
      anonymous,
      wouldRecommend,
    } = body || {};

    if (!productId) {
      return NextResponse.json(
        { ok: false, error: "Missing productId" },
        { status: 400 }
      );
    }

    // Build Airtable fields
    const fields: Record<string, any> = {
      // Linked record to Products — must be an array of record ids
      Product: [productId],
      "Reviewer Name": reviewerName || "",
      Email: email || "",
      Role: role || "",
      "Fleet Size": fleetSize || "",
      "Star Rating": Number(rating) || 0,
      Pros: pros || "",
      Cons: cons || "",
      "Anonymous?": !!anonymous,
      "Would Recommend": !!wouldRecommend,
      Date: new Date().toISOString(),
      // moderation defaults (adjust to your actual column names)
      Approved: false,
      Status: "Pending",
    };

    const created = await createRecord(T_REVIEWS, fields);

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    console.error("[/api/reviews POST]", e?.message || e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 200 }
    );
  }
}
