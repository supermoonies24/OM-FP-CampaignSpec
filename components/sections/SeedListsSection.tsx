"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SeedEntry {
  id?: string;
  listType: "onemagnify" | "client" | "all_seeds";
  firstName: string;
  email: string;
}

interface SeedListsSectionProps {
  seeds: SeedEntry[];
  onSeedsChange: (seeds: SeedEntry[]) => void;
}

const COLUMNS: { key: SeedEntry["listType"]; label: string }[] = [
  { key: "onemagnify", label: "OneMagnify" },
  { key: "client", label: "Client" },
  { key: "all_seeds", label: "All Seeds" },
];

export function SeedListsSection({ seeds, onSeedsChange }: SeedListsSectionProps) {
  function addRow(listType: SeedEntry["listType"]) {
    onSeedsChange([...seeds, { listType, firstName: "", email: "" }]);
  }

  function updateRow(idx: number, field: "firstName" | "email", value: string) {
    onSeedsChange(seeds.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function deleteRow(idx: number) {
    onSeedsChange(seeds.filter((_, i) => i !== idx));
  }

  return (
    <section id="seed-lists" className="scroll-mt-20">
      <h2 className="text-lg font-semibold mb-4">Test & Seed Lists</h2>

      <div className="grid grid-cols-3 gap-6">
        {COLUMNS.map(({ key, label }) => {
          const colSeeds = seeds.map((s, idx) => ({ ...s, _idx: idx })).filter((s) => s.listType === key);

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">{label}</h3>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addRow(key)}>
                  <Plus className="h-3 w-3" />
                  Add Row
                </Button>
              </div>

              {colSeeds.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No entries yet.</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-1 text-xs text-muted-foreground font-medium pb-1 border-b">
                    <span>First Name</span>
                    <span>Email</span>
                    <span />
                  </div>
                  {colSeeds.map(({ _idx, listType: _lt, ...entry }) => (
                    <div key={_idx} className="grid grid-cols-[1fr_1fr_auto] gap-1 items-center">
                      <Input
                        value={entry.firstName}
                        onChange={(e) => updateRow(_idx, "firstName", e.target.value)}
                        placeholder="First Name"
                        className="h-7 text-xs"
                      />
                      <Input
                        value={entry.email}
                        onChange={(e) => updateRow(_idx, "email", e.target.value)}
                        placeholder="email@example.com"
                        className="h-7 text-xs"
                        type="email"
                      />
                      <button
                        type="button"
                        onClick={() => deleteRow(_idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
