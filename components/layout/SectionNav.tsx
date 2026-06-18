"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getSectionColor } from "@/lib/sectionColors";

const BASE_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "special-instructions", label: "Special Instructions" },
  { id: "targeting", label: "Targeting" },
  { id: "orchestration", label: "Orchestration" },
  { id: "links", label: "Links & Tagging" },
  { id: "seed-lists", label: "Seed Lists" },
];

interface SectionNavProps {
  orchestrationFirst?: boolean;
}

export function SectionNav({ orchestrationFirst }: SectionNavProps) {
  const [active, setActive] = useState("overview");

  const sections = useMemo(
    () =>
      orchestrationFirst
        ? [
            BASE_SECTIONS[0],
            BASE_SECTIONS.find((s) => s.id === "orchestration")!,
            ...BASE_SECTIONS.filter((s) => s.id !== "overview" && s.id !== "orchestration"),
          ]
        : BASE_SECTIONS,
    [orchestrationFirst]
  );

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

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-1">
      {sections.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          style={active === id ? { color: getSectionColor(id) } : undefined}
          className={cn(
            "text-xs px-2 py-1 rounded transition-colors text-right whitespace-nowrap",
            active === id
              ? "font-semibold bg-accent"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
