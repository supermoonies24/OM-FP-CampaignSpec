"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Settings, FolderPlus, ChevronRight, ChevronDown,
  Folder, FolderOpen, MoreHorizontal, Pencil, Trash2, FolderInput, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface CampaignSummary {
  id: string;
  campaignName: string | null;
  weekOf: string | null;
  productLine: string | null;
  status: string;
  createdAt: string;
  folderId: string | null;
  _count: { emailSends: number };
}

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderNode[];
}

function formatWeekOf(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "MM/dd/yyyy");
  } catch {
    return dateStr;
  }
}

interface CampaignCardProps {
  campaign: CampaignSummary;
  isActive: boolean;
  folders: FolderNode[];
  onMoveTo: (campaignId: string, folderId: string | null) => void;
}

function CampaignCard({ campaign, isActive, folders, onMoveTo }: CampaignCardProps) {
  const { colorMap } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  return (
    <div className="relative group">
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
      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-50 bg-popover border rounded-md shadow-md min-w-[140px] py-1 text-sm">
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2"
                onClick={() => { setShowMoveMenu(!showMoveMenu); }}
              >
                <FolderInput className="h-3.5 w-3.5" />
                Move to folder
              </button>
              {showMoveMenu && (
                <div className="border-t mt-1 pt-1">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 hover:bg-accent text-xs text-muted-foreground"
                    onClick={() => { onMoveTo(campaign.id, null); setMenuOpen(false); setShowMoveMenu(false); }}
                  >
                    (No folder)
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className="w-full text-left px-3 py-1.5 hover:bg-accent text-xs"
                      onClick={() => { onMoveTo(campaign.id, f.id); setMenuOpen(false); setShowMoveMenu(false); }}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FolderRowProps {
  folder: FolderNode;
  campaigns: CampaignSummary[];
  allFolders: FolderNode[];
  activeCampaignId?: string;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddSubfolder: (parentId: string) => void;
  onMoveCampaign: (campaignId: string, folderId: string | null) => void;
  depth?: number;
}

function FolderRow({
  folder, campaigns, allFolders, activeCampaignId,
  onRename, onDelete, onAddSubfolder, onMoveCampaign, depth = 0,
}: FolderRowProps) {
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const folderCampaigns = campaigns.filter((c) => c.folderId === folder.id);

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <div className="flex items-center gap-1 group py-0.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 flex-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-1 rounded hover:bg-accent/50"
        >
          {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          {open ? <FolderOpen className="h-3.5 w-3.5 shrink-0" /> : <Folder className="h-3.5 w-3.5 shrink-0" />}
          {renaming ? (
            <input
              autoFocus
              className="flex-1 bg-transparent border-b border-primary outline-none text-xs"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => { onRename(folder.id, newName); setRenaming(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { onRename(folder.id, newName); setRenaming(false); } if (e.key === "Escape") setRenaming(false); }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate">{folder.name}</span>
          )}
          <span className="ml-auto text-xs opacity-50">{folderCampaigns.length}</span>
        </button>

        <div className="relative opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-5 z-50 bg-popover border rounded-md shadow-md min-w-[140px] py-1 text-xs">
              <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2"
                onClick={() => { setRenaming(true); setMenuOpen(false); }}>
                <Pencil className="h-3 w-3" /> Rename
              </button>
              <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2"
                onClick={() => { onAddSubfolder(folder.id); setMenuOpen(false); }}>
                <FolderPlus className="h-3 w-3" /> Add subfolder
              </button>
              <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 text-destructive"
                onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}>
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="space-y-0.5 mt-0.5">
          {folderCampaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              isActive={c.id === activeCampaignId}
              folders={allFolders}
              onMoveTo={onMoveCampaign}
            />
          ))}
          {folder.children.map((child) => (
            <FolderRow
              key={child.id}
              folder={child}
              campaigns={campaigns}
              allFolders={allFolders}
              activeCampaignId={activeCampaignId}
              onRename={onRename}
              onDelete={onDelete}
              onAddSubfolder={onAddSubfolder}
              onMoveCampaign={onMoveCampaign}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete folder?"
        description={`Delete "${folder.name}"? Campaigns inside will be moved to uncategorized.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={() => onDelete(folder.id)}
      />
    </div>
  );
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [search, setSearch] = useState("");
  const [newFolderParent, setNewFolderParent] = useState<string | null | undefined>(undefined);
  const [newFolderName, setNewFolderName] = useState("");

  const activeCampaignId = pathname.startsWith("/campaigns/")
    ? pathname.split("/campaigns/")[1].split("/")[0]
    : undefined;

  const fetchCampaigns = useCallback(async () => {
    const res = await fetch("/api/campaigns");
    if (res.ok) setCampaigns(await res.json());
  }, []);

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    if (res.ok) setFolders(await res.json());
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchFolders();
  }, [fetchCampaigns, fetchFolders]);

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

  async function handleRenameFolder(id: string, name: string) {
    await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    fetchFolders();
  }

  async function handleDeleteFolder(id: string) {
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    fetchFolders();
    fetchCampaigns();
  }

  async function handleAddFolder(parentId: string | null) {
    if (!newFolderName.trim()) return;
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim(), parentId }),
    });
    setNewFolderName("");
    setNewFolderParent(undefined);
    fetchFolders();
  }

  async function handleMoveCampaign(campaignId: string, folderId: string | null) {
    await fetch(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    fetchCampaigns();
  }

  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
  }

  // Flatten all folders for move-to menu
  function flattenFolders(nodes: FolderNode[]): FolderNode[] {
    const result: FolderNode[] = [];
    function walk(n: FolderNode) { result.push(n); n.children.forEach(walk); }
    nodes.forEach(walk);
    return result;
  }
  const allFolders = flattenFolders(folders);

  const uncategorized = filteredCampaigns.filter((c) => !c.folderId);
  const campaignsInFolders = new Set(filteredCampaigns.filter((c) => c.folderId).map((c) => c.id));

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

      {/* Campaign List */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 pb-4">
          {/* Folders */}
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              campaigns={filteredCampaigns}
              allFolders={allFolders}
              activeCampaignId={activeCampaignId}
              onRename={handleRenameFolder}
              onDelete={handleDeleteFolder}
              onAddSubfolder={(parentId) => { setNewFolderParent(parentId); setNewFolderName(""); }}
              onMoveCampaign={handleMoveCampaign}
            />
          ))}

          {/* Uncategorized campaigns */}
          {uncategorized.length > 0 && (
            <div className="space-y-0.5">
              {folders.length > 0 && (
                <p className="text-xs text-muted-foreground px-1 pt-2 pb-1 font-medium">Uncategorized</p>
              )}
              {uncategorized.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  isActive={c.id === activeCampaignId}
                  folders={allFolders}
                  onMoveTo={handleMoveCampaign}
                />
              ))}
            </div>
          )}

          {filteredCampaigns.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              {search ? "No campaigns match your search." : "No campaigns yet. Create one above."}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Add folder inline form */}
      {newFolderParent !== undefined && (
        <div className="px-3 py-2 border-t shrink-0">
          <p className="text-xs text-muted-foreground mb-1">New folder name:</p>
          <div className="flex gap-1">
            <Input
              autoFocus
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddFolder(newFolderParent);
                if (e.key === "Escape") setNewFolderParent(undefined);
              }}
              className="h-7 text-xs"
            />
            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleAddFolder(newFolderParent)}>Add</Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setNewFolderParent(undefined)}>✕</Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-3 border-t shrink-0 space-y-1">
        <button
          type="button"
          onClick={() => setNewFolderParent(null)}
          className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded hover:bg-accent"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          New folder
        </button>
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
