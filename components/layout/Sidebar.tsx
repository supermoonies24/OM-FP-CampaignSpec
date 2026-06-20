"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Settings, ChevronRight, ChevronDown,
  CalendarDays, Inbox, LogOut, LayoutGrid, FilePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfWeek } from "date-fns";

interface CampaignSummary {
  id: string;
  campaignName: string | null;
  weekOf: string | null;
  productLine: string | null;
  status: string;
  createdAt: string;
  _count: { emailSends: number };
}

const UNSCHEDULED_KEY = "unscheduled";

function formatWeekOf(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "MM/dd/yyyy");
  } catch {
    return dateStr;
  }
}

// Buckets a campaign's Week Of date to the Monday of its calendar week, so dates
// within the same week land in one folder even if entered a day or two apart.
function weekBucketKey(weekOf: string | null): string {
  if (!weekOf) return UNSCHEDULED_KEY;
  try {
    const monday = startOfWeek(parseISO(weekOf), { weekStartsOn: 1 });
    if (isNaN(monday.getTime())) return UNSCHEDULED_KEY;
    return format(monday, "yyyy-MM-dd");
  } catch {
    return UNSCHEDULED_KEY;
  }
}

interface CampaignCardProps {
  campaign: CampaignSummary;
  isActive: boolean;
}

function CampaignCard({ campaign, isActive }: CampaignCardProps) {
  const { colorMap } = useSettings();

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className={cn(
        "block px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-accent",
        isActive && "bg-accent"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {campaign.campaignName || <span className="text-muted-foreground italic">Untitled Campaign</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatWeekOf(campaign.weekOf)}{campaign.weekOf ? " · " : ""}
            {campaign._count.emailSends} send{campaign._count.emailSends !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StatusBadge status={campaign.status} color={colorMap[campaign.status]} />
        </div>
      </div>
    </Link>
  );
}

interface WeekGroupProps {
  groupKey: string;
  label: string;
  campaigns: CampaignSummary[];
  activeCampaignId?: string;
}

function WeekGroup({ groupKey, label, campaigns, activeCampaignId }: WeekGroupProps) {
  const [open, setOpen] = useState(true);
  const Icon = groupKey === UNSCHEDULED_KEY ? Inbox : CalendarDays;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-1 rounded hover:bg-accent/50"
      >
        {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
        <span className="ml-auto text-xs opacity-50">{campaigns.length}</span>
      </button>

      {open && (
        <div className="space-y-0.5 mt-0.5">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} isActive={c.id === activeCampaignId} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [search, setSearch] = useState("");

  const activeCampaignId = pathname.startsWith("/campaigns/")
    ? pathname.split("/campaigns/")[1].split("/")[0]
    : undefined;

  const fetchCampaigns = useCallback(async () => {
    const res = await fetch("/api/campaigns");
    if (res.ok) setCampaigns(await res.json());
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Re-fetch when navigating
  useEffect(() => {
    fetchCampaigns();
  }, [pathname, fetchCampaigns]);

  const filteredCampaigns = campaigns.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.campaignName?.toLowerCase().includes(q) ||
      c.weekOf?.toLowerCase().includes(q) ||
      c.productLine?.toLowerCase().includes(q)
    );
  });

  const weekGroups = useMemo(() => {
    const groups = new Map<string, CampaignSummary[]>();
    for (const c of filteredCampaigns) {
      const key = weekBucketKey(c.weekOf);
      const list = groups.get(key);
      if (list) list.push(c);
      else groups.set(key, [c]);
    }
    const scheduledKeys = [...groups.keys()].filter((k) => k !== UNSCHEDULED_KEY).sort((a, b) => b.localeCompare(a));
    const orderedKeys = groups.has(UNSCHEDULED_KEY) ? [UNSCHEDULED_KEY, ...scheduledKeys] : scheduledKeys;
    return orderedKeys.map((key) => ({
      key,
      label: key === UNSCHEDULED_KEY ? "Unscheduled" : `Week of ${formatWeekOf(key)}`,
      campaigns: groups.get(key)!,
    }));
  }, [filteredCampaigns]);

  async function handleNewCampaign() {
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const campaign = await res.json();
      await fetchCampaigns();
      router.push(`/campaigns/${campaign.id}`);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
  }

  return (
    <div className="w-[280px] shrink-0 flex flex-col h-full border-r bg-sidebar">
      {/* Header */}
      <div className="px-4 py-4 border-b shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
            CS
          </div>
          <span className="font-semibold text-sm">CampaignSpec</span>
        </div>
        <Button onClick={handleNewCampaign} size="sm" className="w-full">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Campaign List, grouped by deployment week */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 pb-4">
          {weekGroups.map((group) => (
            <WeekGroup
              key={group.key}
              groupKey={group.key}
              label={group.label}
              campaigns={group.campaigns}
              activeCampaignId={activeCampaignId}
            />
          ))}

          {filteredCampaigns.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              {search ? "No campaigns match your search." : "No campaigns yet. Create one above."}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-3 border-t shrink-0 space-y-1">
        <Link
          href="/workflow"
          className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded hover:bg-accent"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Workflow Board
        </Link>
        <Link
          href="/intake"
          className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded hover:bg-accent"
        >
          <FilePlus className="h-3.5 w-3.5" />
          New Intake
        </Link>
        <Link
          href="/settings/dropdowns"
          className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded hover:bg-accent"
        >
          <Settings className="h-3.5 w-3.5" />
          Developer Settings
        </Link>
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded hover:bg-accent"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
