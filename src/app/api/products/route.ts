/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { listRecords } from "../../lib/airtable";

const T_PRODUCTS = process.env.AIRTABLE_TABLE_PRODUCTS || "Products";

export async function GET() {
  try {
    const records = await listRecords(T_PRODUCTS, {});

    const mapped = records.map((r) => {
      const f = r.fields as any;

      const media = Array.isArray(f["Media"]) ? f["Media"] : [];
      const logoUrl = media[0]?.url || undefined;
      const screenshots = media
        .slice(1)
        .map((m: any) => m?.url)
        .filter(Boolean);

      const categories = Array.isArray(f["Categories"])
        ? f["Categories"].map(String)
        : [];

      const rec = f["Recommend %"];
      const recommendPct =
        typeof rec === "number"
          ? rec
          : typeof rec === "string"
          ? Number(rec.replace("%", "")) || 0
          : 0;

      return {
        id: r.id,
        slug: f["Slug (optional)"] || "", // <-- ensure slug included
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
  } catch (e) {
    console.error("[/api/products]", e);
    return NextResponse.json([]);
  }
}
