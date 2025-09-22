/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { listRecords } from "../../../lib/airtable";

const T_PRODUCTS = process.env.AIRTABLE_TABLE_PRODUCTS || "Products";
const T_CATEGORIES = process.env.AIRTABLE_TABLE_CATEGORIES || "Categories";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const debug = url.searchParams.get("debug") === "1";

  try {
    // 1) Load categories (to map recIDs -> names)
    let catMap = new Map<string, string>();
    try {
      const catRecords = await listRecords(T_CATEGORIES, {});
      for (const r of catRecords) {
        const f = r.fields as any;
        // be robust to whatever you named the primary field
        const label =
          f["Name"] ?? f["Category"] ?? f["Title"] ?? f["Label"] ?? ""; // last resort: empty; we'll fallback to id below
        catMap.set(r.id, String(label || r.id));
      }
    } catch {
      // If Categories table is missing or not accessible, we’ll still return products,
      // just with raw values from Products.Categories.
      catMap = new Map();
    }

    // 2) Load products
    const prodRecords = await listRecords(T_PRODUCTS, {});

    if (debug) {
      return NextResponse.json({
        ok: true,
        counts: { products: prodRecords.length, categories: catMap.size },
        sample: prodRecords.slice(0, 2),
      });
    }

    // 3) Map Airtable -> UI shape, resolving category IDs to names
    const mapped = prodRecords.map((r) => {
      const f = r.fields as any;

      // Media: first = logo, rest = screenshots
      const media = Array.isArray(f["Media"]) ? f["Media"] : [];
      const logoUrl = media[0]?.url || undefined;
      const screenshots = media
        .slice(1)
        .map((m: any) => m?.url)
        .filter(Boolean);

      // Categories can be either multi-select names OR linked-record IDs.
      let categories: string[] = [];
      const rawCats = Array.isArray(f["Categories"]) ? f["Categories"] : [];
      if (rawCats.length && typeof rawCats[0] === "string") {
        const looksLikeIds = String(rawCats[0]).startsWith("rec");
        if (looksLikeIds) {
          // linked records -> map via catMap
          categories = rawCats.map((id: string) => catMap.get(id) || id);
        } else {
          // multi-select values are already names
          categories = rawCats.map(String);
        }
      }

      // Percent helper
      const rec = f["Recommend %"];
      const recommendPct =
        typeof rec === "number"
          ? rec
          : typeof rec === "string"
          ? Number(rec.replace("%", "")) || 0
          : 0;

      return {
        id: r.id,
        slug: f["Slug (optional)"] || "",
        name: f["Product Name"] || "",
        vendor: f["Vendor Name"] || "",
        website: f["Website URL"] || "",
        description: f["Short Description"] || "",
        categories,
        logoUrl,
        screenshots,
        avgRating: Number(f["Star Rating Rollup (from Reviews)"]) || 0,
        reviewCount: Number(f["Review Count"]) || 0,
        recommendPct,
      };
    });

    return NextResponse.json(mapped);
  } catch (e: any) {
    console.error("[/api/products GET] error:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
