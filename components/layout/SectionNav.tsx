"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "special-instructions", label: "Special Instructions" },
  { id: "targeting", label: "Targeting" },
  { id: "orchestration", label: "Orchestration" },
  { id: "email-sends", label: "Email Sends" },
  { id: "links", label: "Links & Tagging" },
  { id: "seed-lists", label: "Seed Lists" },
  { id: "qa", label: "QA & Sign-off" },
];

export function SectionNav() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <nav className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-1">
      {SECTIONS.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          className={cn(
            "text-xs px-2 py-1 rounded transition-colors text-right whitespace-nowrap",
            active === id
              ? "text-foreground font-medium bg-accent"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
