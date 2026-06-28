"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview", segment: "" },
  { key: "tracker", label: "Tracker", segment: "/tracker" },
  { key: "brief", label: "Brief", segment: "/brief" },
  { key: "timeline", label: "Timeline", segment: "/timeline" },
  { key: "comms", label: "Comms", segment: "/comms" },
  { key: "specForm", label: "Spec Form", segment: "/spec-form" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

export function CampaignTabs({ campaignId, active }: { campaignId: string; active: TabKey }) {
  return (
    <nav className="flex items-center gap-1">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/workflow/${campaignId}${tab.segment}`}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md transition-colors",
            tab.key === active
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
