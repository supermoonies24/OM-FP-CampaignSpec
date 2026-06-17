"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useSettings } from "@/contexts/SettingsContext";

export interface LinkRow {
  id?: string;
  emailNumber: number;
  ctaName: string;
  assetType: string;
  alias: string;
  baseUrl: string;
}

interface LinksSectionProps {
  numSends: number;
  links: LinkRow[];
  onLinksChange: (links: LinkRow[]) => void;
}

function LinkGroupRow({
  link, index, onChange, onDelete, assetTypes,
}: {
  link: LinkRow;
  index: number;
  onChange: (field: keyof LinkRow, value: string) => void;
  onDelete: () => void;
  assetTypes: string[];
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
      <Input
        placeholder="CTA Name"
        value={link.ctaName}
        onChange={(e) => onChange("ctaName", e.target.value)}
        className="h-8 text-sm"
      />
      <Select value={link.assetType} onValueChange={(v) => onChange("assetType", v)}>
        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Asset type" /></SelectTrigger>
        <SelectContent>
          {assetTypes.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        placeholder="Alias — tag 4 content"
        value={link.alias}
        onChange={(e) => onChange("alias", e.target.value)}
        className="h-8 text-sm"
      />
      <Input
        placeholder="Base URL"
        value={link.baseUrl}
        onChange={(e) => onChange("baseUrl", e.target.value)}
        className="h-8 text-sm"
        type="url"
      />
      <button
        type="button"
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive transition-colors p-1"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function LinksSection({ numSends, links, onLinksChange }: LinksSectionProps) {
  const { settings } = useSettings();

  function addLink(emailNumber: number) {
    onLinksChange([...links, { emailNumber, ctaName: "", assetType: "", alias: "", baseUrl: "" }]);
  }

  function updateLink(idx: number, field: keyof LinkRow, value: string) {
    const updated = links.map((l, i) => i === idx ? { ...l, [field]: value } : l);
    onLinksChange(updated);
  }

  function deleteLink(idx: number) {
    onLinksChange(links.filter((_, i) => i !== idx));
  }

  return (
    <section id="links" className="scroll-mt-20">
      <SectionHeading id="links" title="Links & GA Tagging" />

      <div className="space-y-6">
        {Array.from({ length: numSends }, (_, i) => {
          const emailNum = i + 1;
          const groupLinks = links.map((l, idx) => ({ ...l, _idx: idx })).filter((l) => l.emailNumber === emailNum);

          return (
            <div key={emailNum}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">Email {emailNum} Links</h3>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addLink(emailNum)}>
                  <Plus className="h-3 w-3" />
                  Add Link
                </Button>
              </div>

              {groupLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No links added yet.</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground font-medium pb-1 border-b">
                    <span>CTA Name</span>
                    <span>Asset Type</span>
                    <span>Alias (tag 4)</span>
                    <span>Base URL</span>
                    <span />
                  </div>
                  {groupLinks.map(({ _idx, ...link }) => (
                    <LinkGroupRow
                      key={_idx}
                      link={link as LinkRow}
                      index={_idx}
                      onChange={(field, value) => updateLink(_idx, field, value)}
                      onDelete={() => deleteLink(_idx)}
                      assetTypes={settings.dropdown_assetType}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
