import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  listRecords,
  AIRTABLE_API_URL,
  BASE_ID,
  API_KEY,
} from "../../../lib/airtable";

const T_PRODUCTS = process.env.AIRTABLE_TABLE_PRODUCTS || "Products";
const T_CATEGORIES = process.env.AIRTABLE_TABLE_CATEGORIES || "Categories";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  try {
    // If debug, hit Airtable directly and show raw info so we can pinpoint issues fast.
    if (debug) {
      const testUrl = `${AIRTABLE_API_URL}/${BASE_ID}/${encodeURIComponent(
        T_PRODUCTS
      )}?maxRecords=3`;
      const res = await fetch(testUrl, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      let bodyText = "";
      try {
        bodyText = await res.text();
      } catch {
        bodyText = "<no body>";
      }

      return NextResponse.json(
        {
          ok: res.ok,
          status: res.status,
          table: T_PRODUCTS,
          raw: safeJson(bodyText),
        },
        { status: 200 }
      );
    }

    // Try to load Categories table (only used if Products.Categories are rec IDs)
    let catNameById = new Map<string, string>();
    try {
      const cats = await listRecords(T_CATEGORIES);
      for (const c of cats) {
        const name = (c.fields["Name"] as string) || "";
        if (name) catNameById.set(c.id, name);
      }
    } catch {
      // It's fine if there is no Categories table — we'll treat values as plain text
      catNameById = new Map();
    }

    // Fetch ALL products (no Status filter so nothing hides in demo)
    const products = await listRecords(T_PRODUCTS);

    const out = products.map((p) => {
      const f = p.fields as any;

      // --- Categories can be multi-select text OR linked record IDs ---
      const raw = (f["Categories"] || []) as any[];
      let categories: string[] = [];
      if (raw.length > 0) {
        const first = raw[0];
        if (typeof first === "string") {
          const looksLikeId = first.startsWith("rec");
          categories =
            looksLikeId && catNameById.size > 0
              ? (raw
                  .map((id: string) => catNameById.get(id))
                  .filter(Boolean) as string[])
              : raw.map(String);
        } else if (first && typeof first === "object") {
          categories = raw
            .map((o: any) => catNameById.get(o.id) || o.name)
            .filter(Boolean);
        }
      }

      // --- Media attachments: first = logo, rest = screenshots (if present) ---
      const media = (Array.isArray(f["Media"]) ? f["Media"] : []) as Array<{
        url: string;
      }>;
      const logoUrl = media[0]?.url || undefined;
      const screenshots = media
        .slice(1)
        .map((m) => m?.url)
        .filter(Boolean);

      // --- Ratings / counts using your exact column names ---
      const reviewCount = Number(f["Review Count"]) || 0;
      const avgRating = Number(f["Star Rating Rollup (from Reviews)"]) || 0;

      const rec = f["Recommend %"];
      const recommendPct =
        typeof rec === "number"
          ? rec
          : typeof rec === "string"
          ? Number(rec.replace("%", "")) || 0
          : 0;

      return {
        id: p.id,
        name: f["Product Name"] || "",
        vendor: f["Vendor Name"] || "",
        categories,
        website: f["Website URL"] || "",
        description: f["Short Description"] || "",
        logoUrl,
        screenshots,
        avgRating,
        reviewCount,
        recommendPct,
        status: f["Status"] || "",
        slug: f["Slug (optional)"] || "",
        lastReviewDate: f["Last Review Date"] || "",
      };
    });

    return NextResponse.json(out);
  } catch (err: any) {
    // Return the error details so we can see what's wrong (table name, perms, etc.)
    const message =
      typeof err?.message === "string" ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message, table: T_PRODUCTS },
      { status: 200 } // keep demo alive
    );
  }
}

// Helpers
function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
