"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Role = "DO" | "DOM" | "Dispatcher" | "Broker" | "Safety" | "Other";
type FleetSize = "Small" | "Medium" | "Large";

export function ReviewForm({
  productId,
  onPosted,
}: {
  productId: string;
  onPosted?: () => void;
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
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
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Failed to submit");
      onPosted?.();
      alert("Thanks! Your review is pending approval.");
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
    } catch (err: any) {
      alert(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

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
          {["DO", "DOM", "Dispatcher", "Broker", "Safety", "Other"].map((r) => (
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
          {["Small", "Medium", "Large"].map((f) => (
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
        {submitting ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}

export function LeadForm({
  productId,
  onPosted,
}: {
  productId: string;
  onPosted?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    message: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ...form }),
      });
      if (!res.ok) throw new Error("Failed to send");
      onPosted?.();
      alert("Thanks! We’ll be in touch.");
      setForm({ name: "", email: "", company: "", role: "", message: "" });
    } catch (err: any) {
      alert(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

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
        {submitting ? "Sending…" : "Request info"}
      </Button>
    </form>
  );
}
