// app/products/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ReviewForm, LeadForm } from "@/components/review-lead-forms";

type Product = {
  id: string;
  slug: string;
  name: string;
  vendor: string;
  website: string;
  description: string;
  categories: string[];
  features?: string[];
  logoUrl?: string;
  screenshots?: string[];
  avgRating: number;
  reviewCount: number;
  recommendPct: number;
};

type Review = {
  id: string;
  displayName: string;
  role: string;
  fleetSize: string;
  rating: number;
  pros: string;
  cons: string;
  wouldRecommend: boolean;
  date: string;
};

// Next 15: headers() is async
async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

async function fetchJSON<T>(path: string): Promise<T> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

async function getProductBySlugOrId(slugOrId: string): Promise<Product | null> {
  const isRecId = slugOrId.startsWith("rec");
  if (isRecId) {
    return fetchJSON<Product>(`/api/products/by-id/${slugOrId}`).catch(
      () => null
    );
  }
  return fetchJSON<Product>(
    `/api/products/${encodeURIComponent(slugOrId)}`
  ).catch(() => null);
}

async function getReviews(productId: string): Promise<Review[]> {
  return fetchJSON<Review[]>(`/api/reviews/by-product/${productId}`).catch(
    () => []
  );
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const p = await getProductBySlugOrId(params.slug);
  if (!p) return { title: "Product not found" };
  const title = `${p.name} — Reviews, Features & Pricing`;
  const description = p.description || `${p.name} by ${p.vendor}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: p.logoUrl ? [{ url: p.logoUrl }] : [],
    },
  };
}

export default async function ProductDetail({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlugOrId(params.slug);
  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20">
        <h1 className="text-2xl font-semibold mb-2">Product not found</h1>
        <p className="text-muted-foreground">
          Check the URL or go back to{" "}
          <Link className="underline" href="/products">
            products
          </Link>
          .
        </p>
      </div>
    );
  }

  const reviews = await getReviews(product.id);

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="border-b border-border/50 bg-background/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-[auto,1fr,auto] gap-6 items-center">
          <div className="h-16 w-16 rounded-xl bg-muted overflow-hidden">
            {product.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.logoUrl}
                alt={`${product.name} logo`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-xs opacity-60">
                Logo
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {product.name}
            </h1>
            <div className="text-sm text-muted-foreground mt-1">
              by {product.vendor} • {product.categories.join(" • ")}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <Rating value={product.avgRating} />
              <span className="text-sm">{product.reviewCount} reviews</span>
              <span className="text-sm">{product.recommendPct}% recommend</span>
            </div>
          </div>

          <div className="flex md:justify-end gap-2">
            {product.website && (
              <a
                href={product.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full px-5 py-3 bg-primary text-primary-foreground hover:opacity-90"
              >
                Visit website
              </a>
            )}
            <Link
              href="/products"
              className="inline-flex items-center rounded-full px-5 py-3 border"
            >
              All products
            </Link>
          </div>
        </div>
      </section>

      {/* BODY */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* MAIN */}
        <div className="lg:col-span-8 space-y-8">
          {/* Overview */}
          <section>
            <h2 className="text-xl font-semibold mb-2">Overview</h2>
            <p className="text-sm text-muted-foreground">
              {product.description}
            </p>
          </section>

          {/* Screenshots */}
          {product.screenshots && product.screenshots.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Screenshots</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {product.screenshots.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`screenshot ${i + 1}`}
                    className="w-full h-40 object-cover rounded-xl border"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Features */}
          {product.features && product.features.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-2">Features</h2>
              <div className="flex flex-wrap gap-2">
                {product.features.map((f) => (
                  <span
                    key={f}
                    className="px-2 py-1 text-xs rounded-full bg-muted"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          <section id="reviews">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">Reviews</h2>
              <small className="text-muted-foreground">Sorted by newest</small>
            </div>
            <div className="space-y-4">
              {reviews.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No reviews yet.
                </div>
              )}
              {reviews.map((r) => (
                <article
                  key={r.id}
                  className="border rounded-xl p-4 space-y-2 bg-background"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{r.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Rating value={r.rating} small />
                    <span className="text-xs text-muted-foreground">
                      {r.role} • {r.fleetSize} fleet
                    </span>
                  </div>
                  {r.wouldRecommend && (
                    <div className="text-xs">✅ Would recommend</div>
                  )}
                  <div>
                    <div className="text-xs font-semibold">Pros</div>
                    <p className="text-sm">{r.pros || "—"}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Cons</div>
                    <p className="text-sm">{r.cons || "—"}</p>
                  </div>
                </article>
              ))}
            </div>

            {/* Write a review form */}
            <section className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Write a review</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Share your experience. Your review will appear after approval.
              </p>
              <ReviewForm productId={product.id} />
            </section>
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="lg:col-span-4 lg:sticky lg:top-16 space-y-4 h-fit">
          <div className="border rounded-xl p-4">
            <div className="text-sm font-semibold mb-2">Quick Stats</div>
            <div className="space-y-1 text-sm">
              <div>
                Average rating: <b>{product.avgRating.toFixed(1)}</b>/5
              </div>
              <div>
                Review count: <b>{product.reviewCount}</b>
              </div>
              <div>
                Recommend: <b>{product.recommendPct}%</b>
              </div>
            </div>
            <a
              href="#reviews"
              className="mt-4 inline-flex items-center rounded-full px-4 py-2 bg-primary text-primary-foreground"
            >
              Read reviews
            </a>
          </div>

          {/* Request info form */}
          <div className="border rounded-xl p-4">
            <div className="text-sm font-semibold mb-2">Request Info</div>
            <LeadForm productId={product.id} />
          </div>

          <div className="border rounded-xl p-4">
            <div className="text-sm font-semibold mb-2">Categories</div>
            <div className="flex flex-wrap gap-2">
              {product.categories.map((c) => (
                <span
                  key={c}
                  className="px-2 py-1 text-xs rounded-full bg-muted"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Rating({ value, small = false }: { value: number; small?: boolean }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const size = small ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full || (i === full && half);
        return (
          <svg
            key={i}
            className={`${size} ${filled ? "fill-current" : ""}`}
            viewBox="0 0 24 24"
          >
            <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.165L12 18.897l-7.334 3.865 1.4-8.165L.132 9.21l8.2-1.192z" />
          </svg>
        );
      })}
      {!small && <span className="ml-2 text-sm">{value.toFixed(1)}</span>}
    </div>
  );
}
