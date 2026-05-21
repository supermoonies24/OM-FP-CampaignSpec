"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequiredFieldsEditor } from "@/components/settings/RequiredFieldsEditor";
import { useSettings } from "@/contexts/SettingsContext";

export default function RequiredFieldsPage() {
  const { settings, updateSetting } = useSettings();
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocal(settings.requiredFields ?? {});
  }, [settings.requiredFields]);

  async function handleSave() {
    setSaving(true);
    await updateSetting("requiredFields", local);
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
          <nav className="w-48 shrink-0 space-y-1">
            <Link href="/settings/dropdowns" className="flex items-center gap-2 text-sm px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              Dropdown Values
            </Link>
            <Link href="/settings/required-fields" className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-accent font-medium">
              Required Fields
            </Link>
          </nav>

          <div className="flex-1">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Required Fields</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Toggle which fields must be filled before saving. Required fields are enforced on manual Save.
              </p>
            </div>

            <RequiredFieldsEditor requiredFields={local} onChange={setLocal} />
          </div>
        </div>
      </div>
    </div>
  );
}
