/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { listRecords } from "../../../../lib/airtable";

const T_PRODUCTS = process.env.AIRTABLE_TABLE_PRODUCTS || "Products";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const recs = await listRecords(T_PRODUCTS, {
      filterByFormula: `LOWER({Slug (optional)}) = '${params.slug.toLowerCase()}'`,
      maxRecords: "1",
    });

    if (!recs?.length)
      return NextResponse.json({ notFound: true }, { status: 200 });

    const p = recs[0];
    const f = p.fields as any;

    const media = (Array.isArray(f["Media"]) ? f["Media"] : []) as Array<{
      url: string;
    }>;
    const logoUrl = media[0]?.url || undefined;
    const screenshots = media
      .slice(1)
      .map((m) => m?.url)
      .filter(Boolean);

    const categories = Array.isArray(f["Categories"])
      ? f["Categories"].map(String)
      : [];
    const features = Array.isArray(f["Features"])
      ? f["Features"].map(String)
      : [];

    const reviewCount = Number(f["Review Count"]) || 0;
    const avgRating = Number(f["Star Rating Rollup (from Reviews)"]) || 0;
    const rec = f["Recommend %"];
    const recommendPct =
      typeof rec === "number"
        ? rec
        : typeof rec === "string"
        ? Number(rec.replace("%", "")) || 0
        : 0;

    return NextResponse.json({
      id: p.id,
      slug: f["Slug (optional)"] || "",
      name: f["Product Name"] || "",
      vendor: f["Vendor Name"] || "",
      website: f["Website URL"] || "",
      description: f["Short Description"] || "",
      categories,
      features,
      logoUrl,
      screenshots,
      avgRating,
      reviewCount,
      recommendPct,
    });
  } catch (e) {
    console.error("[/api/products/[slug]]", e);
    return NextResponse.json({ notFound: true }, { status: 200 });
  }
}
