"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Simple data — swap with real vendor logos later */
const VENDORS = [
  { name: "SkySoft", short: "SS" },
  { name: "QuoteFlow", short: "QF" },
  { name: "FlyExchange", short: "FX" },
  { name: "AeroSuite", short: "AS" },
  { name: "JetOps", short: "JO" },
  { name: "Nimbus", short: "NB" },
  { name: "VectorAir", short: "VA" },
  { name: "LiftLab", short: "LL" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-background">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-24 pb-12 overflow-hidden">
        {/* glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[620px] h-[620px] rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-[420px] h-[420px] rounded-full bg-purple-500/20 blur-3xl" />
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
          Daniels’ Aviation Tools
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
          Explore the best scheduling, quoting, and marketplace solutions —
          reviewed by real operators and brokers.
        </p>
        <Link href="/products">
          <Button
            size="lg"
            className="rounded-full px-10 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition"
          >
            Browse Products
          </Button>
        </Link>
      </section>

      {/* Logos Marquee */}
      <section className="relative py-10 border-t border-border/40">
        <h2 className="sr-only">Trusted vendors</h2>
        <Marquee speed={28}>
          {VENDORS.map((v) => (
            <LogoPill key={v.name} label={v.name} short={v.short} />
          ))}
        </Marquee>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border/40">
        © {new Date().getFullYear()} Daniels Aviation Tools. All rights
        reserved.
      </footer>

      {/* marquee styles */}
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .marquee-track {
          animation: marquee linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------- tiny components ---------- */

function Marquee({
  children,
  speed = 24, // seconds per loop (lower is faster)
}: {
  children: React.ReactNode;
  speed?: number;
}) {
  // we duplicate the row so it loops seamlessly
  return (
    <div
      className="relative overflow-hidden group select-none"
      aria-label="Vendor logos"
    >
      <div
        className="marquee-track flex items-center gap-6 md:gap-10 py-2"
        style={{
          width: "200%",
          animationDuration: `${speed}s`,
        }}
      >
        <Row>{children}</Row>
        <Row ariaHidden>{children}</Row>
      </div>

      {/* pause on hover */}
      <style jsx>{`
        .group:hover .marquee-track {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

function Row({
  children,
  ariaHidden = false,
}: {
  children: React.ReactNode;
  ariaHidden?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-6 md:gap-10 w-1/2 justify-around"
      aria-hidden={ariaHidden}
    >
      {children}
    </div>
  );
}

function LogoPill({ label, short }: { label: string; short: string }) {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <div className="h-9 w-9 rounded-xl grid place-items-center bg-muted text-foreground/80 text-sm font-semibold">
        {short}
      </div>
      <span className="text-sm md:text-base text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
