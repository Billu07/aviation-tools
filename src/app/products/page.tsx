"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Star,
  Building2,
  Link as LinkIcon,
  Loader2,
  Check,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

/* ---------------- Types ---------------- */

export type Category =
  | "Scheduling"
  | "Quoting"
  | "Marketplace / Aircraft Sourcing";

export type FleetSize = "Small" | "Medium" | "Large";
export type Role = "DO" | "DOM" | "Dispatcher" | "Broker" | "Safety" | "Other";

export type Review = {
  id: string;
  productId: string;
  displayName: string;
  role: Role;
  fleetSize: FleetSize;
  rating: number;
  pros: string;
  cons: string;
  wouldRecommend: boolean;
  date: string; // ISO
};

export type Product = {
  id: string;
  slug?: string;
  name: string;
  vendor: string;
  categories: Category[] | string[]; // tolerate plain strings
  website: string;
  description: string;
  logoUrl?: string;
  screenshots?: string[];
  avgRating: number;
  reviewCount: number;
  recommendPct: number; // 0..100
};

/* ---------------- Small UI helpers ---------------- */

function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${value.toFixed(1)} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full || (i === full && half);
        return (
          <Star key={i} className={`h-4 w-4 ${filled ? "fill-current" : ""}`} />
        );
      })}
      <span className="ml-2 text-xs text-muted-foreground">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function Chip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`px-2 py-1 text-xs rounded-full bg-muted text-foreground/80 ${className}`}
    >
      {children}
    </span>
  );
}

/** Wraps card with a Link so you don’t have to repeat it everywhere */
function ClickableCard({
  href,
  children,
  className = "hover:shadow-lg transition-shadow cursor-pointer",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className={className}>{children}</Card>
    </Link>
  );
}

/* ---------------- Filters ---------------- */

const ALL_CATEGORIES: Category[] = [
  "Scheduling",
  "Quoting",
  "Marketplace / Aircraft Sourcing",
];

const ROLES: Role[] = ["DO", "DOM", "Dispatcher", "Broker", "Safety", "Other"];
const FLEETS: FleetSize[] = ["Small", "Medium", "Large"];

/* ---------------- Page ---------------- */

export default function ProductsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [minRating, setMinRating] = useState<number>(0);
  const [role, setRole] = useState<Role | "All">("All");
  const [fleet, setFleet] = useState<FleetSize | "All">("All");

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviewsByProduct, setReviewsByProduct] = useState<
    Record<string, Review[]>
  >({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [prods, reviews] = await Promise.all([
        fetchProducts(),
        fetchReviewsApproved(),
      ]);
      setProducts(prods);

      // group reviews by product
      const map: Record<string, Review[]> = {};
      reviews.forEach((r) => {
        (map[r.productId] ||= []).push(r);
      });
      setReviewsByProduct(map);

      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      // category filter
      if (category !== "All") {
        const cats = (p.categories || []) as string[];
        if (!cats.includes(category)) return false;
      }

      // rating filter
      if (minRating > 0 && (p.avgRating || 0) < minRating) return false;

      // text query
      if (query) {
        const q = query.toLowerCase();
        const haystack = `${p.name} ${p.vendor} ${p.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // reviewer-level filters: require at least one matching review
      if (role !== "All" || fleet !== "All") {
        const reviews = reviewsByProduct[p.id] || [];
        const ok = reviews.some(
          (r) =>
            (role === "All" || r.role === role) &&
            (fleet === "All" || r.fleetSize === fleet)
        );
        if (!ok) return false;
      }

      return true;
    });
  }, [products, category, minRating, query, role, fleet, reviewsByProduct]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/15" />
            <span className="font-semibold tracking-tight">Aviation Tools</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="rounded-full">MVP</Badge>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar filters */}
        <aside className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 opacity-60" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products…"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant={category === "All" ? "default" : "outline"}
                onClick={() => setCategory("All")}
                className="rounded-full"
              >
                All
              </Button>
              {ALL_CATEGORIES.map((c) => (
                <Button
                  key={c}
                  variant={category === c ? "default" : "outline"}
                  onClick={() => setCategory(c)}
                  className="rounded-full"
                >
                  {c}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Minimum Rating</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[0, 3, 4, 4.5].map((r) => (
                <Button
                  key={r}
                  variant={minRating === r ? "default" : "outline"}
                  onClick={() => setMinRating(r)}
                  className="rounded-full"
                >
                  {r === 0 ? "Any" : `${r}+`}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reviewer Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-2">Role</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={role === "All" ? "default" : "outline"}
                    onClick={() => setRole("All")}
                    className="rounded-full"
                  >
                    All
                  </Button>
                  {ROLES.map((r) => (
                    <Button
                      key={r}
                      variant={role === r ? "default" : "outline"}
                      onClick={() => setRole(r)}
                      className="rounded-full"
                    >
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">
                  Fleet Size
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={fleet === "All" ? "default" : "outline"}
                    onClick={() => setFleet("All")}
                    className="rounded-full"
                  >
                    All
                  </Button>
                  {FLEETS.map((f) => (
                    <Button
                      key={f}
                      variant={fleet === f ? "default" : "outline"}
                      onClick={() => setFleet(f)}
                      className="rounded-full"
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Results grid */}
        <section className="lg:col-span-9">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading
              products…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <motion.div key={p.id} layout>
                  <ClickableCard href={`/products/${p.slug || p.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-muted overflow-hidden">
                          {p.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.logoUrl}
                              alt={`${p.name} logo`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-xs opacity-60">
                              Logo
                            </div>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base leading-tight">
                            {p.name}
                          </CardTitle>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {p.vendor}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="line-clamp-2 text-sm text-muted-foreground">
                        {p.description}
                      </div>

                      <div className="flex items-center justify-between">
                        <Stars value={p.avgRating || 0} />
                        <Chip>{p.reviewCount} reviews</Chip>
                        <Chip>{p.recommendPct}% recommend</Chip>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {(p.categories as string[]).map((c) => (
                          <Badge
                            key={c}
                            variant="secondary"
                            className="rounded-full"
                          >
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </ClickableCard>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ---------------- Forms (unchanged; still post to your APIs) ---------------- */

function ReviewForm({
  productId,
  onDone,
}: {
  productId: string;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Dispatcher" as Role,
    fleet: "Small" as FleetSize,
    rating: 5,
    pros: "",
    cons: "",
    anonymous: false,
    wouldRecommend: true,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          reviewerName: form.name,
          email: form.email,
          role: form.role,
          fleetSize: form.fleet,
          rating: form.rating,
          pros: form.pros,
          cons: form.cons,
          anonymous: form.anonymous,
          wouldRecommend: form.wouldRecommend,
        }),
      });
      onDone();
      setForm({
        name: "",
        email: "",
        role: "Dispatcher",
        fleet: "Small",
        rating: 5,
        pros: "",
        cons: "",
        anonymous: false,
        wouldRecommend: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Your name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          type="email"
          placeholder="Email (not shown)"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          className="h-10 rounded-md border bg-background px-3"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border bg-background px-3"
          value={form.fleet}
          onChange={(e) =>
            setForm({ ...form, fleet: e.target.value as FleetSize })
          }
        >
          {FLEETS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border bg-background px-3"
          value={String(form.rating)}
          onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} stars
            </option>
          ))}
        </select>
      </div>
      <Textarea
        placeholder="Pros"
        value={form.pros}
        onChange={(e) => setForm({ ...form, pros: e.target.value })}
      />
      <Textarea
        placeholder="Cons"
        value={form.cons}
        onChange={(e) => setForm({ ...form, cons: e.target.value })}
      />
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.anonymous}
            onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
          />
          Post as Anonymous
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.wouldRecommend}
            onChange={(e) =>
              setForm({ ...form, wouldRecommend: e.target.checked })
            }
          />
          Would recommend
        </label>
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Submit review"
        )}
      </Button>
    </form>
  );
}

function LeadForm({
  productId,
  onDone,
}: {
  productId: string;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    message: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ...form }),
      });
      onDone();
      setForm({ name: "", email: "", company: "", role: "", message: "" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Your name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Company"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
        <Input
          placeholder="Role (optional)"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        />
      </div>
      <Textarea
        placeholder="Message"
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
      />
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Request info"
        )}
      </Button>
    </form>
  );
}

/* ---------------- Data fetchers (defensive) ---------------- */

async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch("/api/products", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as Product[]) : [];
  } catch {
    return [];
  }
}

async function fetchReviewsApproved(): Promise<Review[]> {
  try {
    const res = await fetch("/api/reviews?approved=true", {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as Review[]) : [];
  } catch {
    return [];
  }
}
