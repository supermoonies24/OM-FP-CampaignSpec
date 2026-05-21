"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownEditor } from "@/components/settings/DropdownEditor";
import { useSettings } from "@/contexts/SettingsContext";

const DROPDOWN_DEFS: { key: string; label: string }[] = [
  { key: "dropdown_productLineShort", label: "Product Line (Short)" },
  { key: "dropdown_productLineFull", label: "Product Line (Full — Content Block)" },
  { key: "dropdown_audience", label: "Audience" },
  { key: "dropdown_segmentation", label: "Segmentation" },
  { key: "dropdown_country", label: "Country" },
  { key: "dropdown_language", label: "Language" },
  { key: "dropdown_campaignType", label: "Campaign Type" },
  { key: "dropdown_sendType", label: "Send Type" },
  { key: "dropdown_emailBuildType", label: "Email Build Type" },
  { key: "dropdown_sendFromName", label: "Send From Name" },
  { key: "dropdown_sendFromAddress", label: "Send From Address" },
  { key: "dropdown_audienceSource", label: "Audience Source" },
  { key: "dropdown_abTestType", label: "A/B Test Type" },
  { key: "dropdown_abAudienceSplit", label: "A/B Audience Split" },
  { key: "dropdown_assetType", label: "Asset Type (Links)" },
  { key: "dropdown_versionType", label: "Version Type" },
  { key: "dropdown_emailGroupNum", label: "Email Group #" },
  { key: "dropdown_status", label: "Status Values" },
];

export default function DropdownSettingsPage() {
  const { settings, updateSetting } = useSettings();
  const [local, setLocal] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const init: Record<string, string[]> = {};
    for (const { key } of DROPDOWN_DEFS) {
      init[key] = (settings as unknown as Record<string, string[]>)[key] ?? [];
    }
    setLocal(init);
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    for (const [key, value] of Object.entries(local)) {
      await updateSetting(key, value);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-6 py-4 flex items-center gap-4">
        <Link href="/campaigns" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h1 className="font-semibold">Developer Settings</h1>
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Sidebar nav */}
          <nav className="w-48 shrink-0 space-y-1">
            <Link href="/settings/dropdowns" className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-accent font-medium">
              Dropdown Values
            </Link>
            <Link href="/settings/required-fields" className="flex items-center gap-2 text-sm px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              Required Fields
            </Link>
          </nav>

          {/* Content */}
          <div className="flex-1">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Dropdown Values</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Edit, add, remove, or reorder values for every dropdown in the app. Drag items to reorder.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {DROPDOWN_DEFS.map(({ key, label }) => (
                <DropdownEditor
                  key={key}
                  label={label}
                  values={local[key] ?? []}
                  onChange={(vals) => setLocal((prev) => ({ ...prev, [key]: vals }))}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
