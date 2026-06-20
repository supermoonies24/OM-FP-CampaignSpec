"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Sidebar } from "@/components/layout/Sidebar";
import { SectionNav } from "@/components/layout/SectionNav";
import { CampaignHeader } from "@/components/layout/CampaignHeader";
import { OverviewSection } from "@/components/sections/OverviewSection";
import { SpecialInstructionsSection } from "@/components/sections/SpecialInstructionsSection";
import { TargetingSection } from "@/components/sections/TargetingSection";
import { OrchestrationSection } from "@/components/sections/OrchestrationSection";
import { LinksSection, type LinkRow } from "@/components/sections/LinksSection";
import { SeedListsSection, type SeedEntry } from "@/components/sections/SeedListsSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSettings, getDefaultDropdownValue, type AppSettings } from "@/contexts/SettingsContext";

export interface EmailSendFormValues {
  id?: string;
  emailNumber: number;
  productLine?: string | null;
  description?: string | null;
  audience?: string | null;
  segmentation?: string | null;
  country?: string | null;
  language?: string | null;
  versionType?: string | null;
  emailGroupNum?: number | null;
  figmaFileName?: string | null;
  isTest?: boolean | null;
  subjectLine?: string | null;
  preheader?: string | null;
}

export interface CampaignFormValues {
  weekOf?: string;
  brand?: string;
  businessUnit?: string;
  childProd?: string;
  country?: string;
  language?: string;
  emailBuildType?: string;
  figmaLink?: string;
  figmaFileName?: string;
  campaignName?: string;
  productLine?: string;
  audience?: string;
  segmentation?: string;
  campaignType?: string;
  sendType?: string;
  numSends?: number;
  sendFromName?: string;
  sendFromAddress?: string;
  desiredSendDate?: string;
  desiredSendTime?: string;
  sto?: boolean;
  miroUrl?: string;
  status?: string;
  abTest?: boolean;
  abTestType?: string;
  abAudienceSplit?: string;
  contentBlock?: boolean;
  contentBlockProductLine?: string;
  contentBlockProductName?: string;
  contentBlockName?: string;
  contentBlockDesc?: string;
  contentBlockFigmaLink?: string;
  notes?: string;
  segmentationDesc?: string;
  audienceSource?: string;
  seg1Field?: string;
  seg1Condition?: string;
  seg1Value?: string;
  seg2Field?: string;
  seg2Condition?: string;
  seg2Value?: string;
  seg3Field?: string;
  seg3Condition?: string;
  seg3Value?: string;
  seg4Field?: string;
  seg4Condition?: string;
  seg4Value?: string;
  seg5Field?: string;
  seg5Condition?: string;
  seg5Value?: string;
  seg6Field?: string;
  seg6Condition?: string;
  seg6Value?: string;
  seg7Field?: string;
  seg7Condition?: string;
  seg7Value?: string;
  seg8Field?: string;
  seg8Condition?: string;
  seg8Value?: string;
  seg9Field?: string;
  seg9Condition?: string;
  seg9Value?: string;
  seg10Field?: string;
  seg10Condition?: string;
  seg10Value?: string;
  engagementSplits?: string;
  orchestrationDesc?: string;
}

type DropdownSettingsKey = Exclude<keyof AppSettings, "requiredFields">;

// Maps form fields to the dropdown they're sourced from, so a value marked as the
// "default" in Dev Settings can pre-fill new campaigns/sends instead of starting blank.
const FIELD_DROPDOWN_MAP: Partial<Record<keyof CampaignFormValues, DropdownSettingsKey>> = {
  brand: "dropdown_brand",
  productLine: "dropdown_productLineShort",
  audience: "dropdown_audience",
  segmentation: "dropdown_segmentation",
  country: "dropdown_country",
  language: "dropdown_language",
  campaignType: "dropdown_campaignType",
  sendType: "dropdown_sendType",
  emailBuildType: "dropdown_emailBuildType",
  sendFromName: "dropdown_sendFromName",
  sendFromAddress: "dropdown_sendFromAddress",
  audienceSource: "dropdown_audienceSource",
  abTestType: "dropdown_abTestType",
  abAudienceSplit: "dropdown_abAudienceSplit",
  contentBlockProductLine: "dropdown_productLineFull",
};

const SEND_DROPDOWN_MAP: Partial<Record<keyof EmailSendFormValues, DropdownSettingsKey>> = {
  productLine: "dropdown_productLineShort",
  audience: "dropdown_audience",
  segmentation: "dropdown_segmentation",
  country: "dropdown_country",
  language: "dropdown_language",
  versionType: "dropdown_versionType",
};

function buildDefaultSend(emailNumber: number, settings: AppSettings): EmailSendFormValues {
  return {
    emailNumber,
    productLine: getDefaultDropdownValue(settings.dropdown_productLineShort) ?? null,
    description: null,
    audience: getDefaultDropdownValue(settings.dropdown_audience) ?? null,
    segmentation: getDefaultDropdownValue(settings.dropdown_segmentation) ?? null,
    country: getDefaultDropdownValue(settings.dropdown_country) ?? null,
    language: getDefaultDropdownValue(settings.dropdown_language) ?? null,
    versionType: getDefaultDropdownValue(settings.dropdown_versionType) ?? "No",
    emailGroupNum: emailNumber,
    figmaFileName: null,
    isTest: false,
    subjectLine: null,
    preheader: null,
  };
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [sends, setSends] = useState<EmailSendFormValues[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [seeds, setSeeds] = useState<SeedEntry[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defaultsAppliedRef = useRef(false);

  const { settings, loading: settingsLoading } = useSettings();
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const form = useForm<CampaignFormValues>({
    defaultValues: { brand: "Ford Pro", numSends: 1, sendFromAddress: "reply@e.fordpro.com", status: "draft" },
  });

  const { watch, reset, setValue } = form;
  const values = watch();

  // Load campaign data
  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/campaigns/${id}`);
      if (!res.ok) { router.push("/campaigns"); return; }
      const data = await res.json();

      const { emailSends, links: rawLinks, seedLists, ...fields } = data;
      reset(fields);
      setSends(emailSends.length > 0 ? emailSends : [buildDefaultSend(1, settingsRef.current)]);
      setLinks(rawLinks);
      setSeeds(seedLists);
      setLoading(false);
      setIsDirty(false);
      setLastSaved(data.updatedAt ? new Date(data.updatedAt) : null);
    }
    load();
  }, [id, reset, router]);

  // Mark dirty on any form change
  useEffect(() => {
    const sub = watch(() => setIsDirty(true));
    return () => sub.unsubscribe();
  }, [watch]);

  // Backfill any still-empty fields with their marked dropdown default. Runs once
  // both the campaign and the settings have finished loading, since either can win the race.
  useEffect(() => {
    if (loading || settingsLoading || defaultsAppliedRef.current) return;
    defaultsAppliedRef.current = true;

    const current = form.getValues();
    for (const [field, key] of Object.entries(FIELD_DROPDOWN_MAP) as [keyof CampaignFormValues, DropdownSettingsKey][]) {
      if (current[field]) continue;
      const def = getDefaultDropdownValue(settings[key]);
      if (def) setValue(field, def as never);
    }

    setSends((prev) => prev.map((send) => {
      const updated = { ...send };
      for (const [field, key] of Object.entries(SEND_DROPDOWN_MAP) as [keyof EmailSendFormValues, DropdownSettingsKey][]) {
        if (updated[field]) continue;
        const def = getDefaultDropdownValue(settings[key]);
        if (def) (updated[field] as unknown) = def;
      }
      return updated;
    }));
  }, [loading, settingsLoading, settings, form, setValue]);

  // Sync sends count to numSends
  useEffect(() => {
    const numSends = values.numSends ?? 1;
    setSends((prev) => {
      if (prev.length === numSends) return prev;
      if (prev.length < numSends) {
        const extras = Array.from({ length: numSends - prev.length }, (_, i) =>
          buildDefaultSend(prev.length + i + 1, settings)
        );
        return [...prev, ...extras];
      }
      // reducing: keep existing, trim
      return prev.slice(0, numSends);
    });
  }, [values.numSends, settings]);

  const save = useCallback(async () => {
    const formData = form.getValues();

    // Save campaign core
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    // Save email sends
    await fetch(`/api/email-sends/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sends }),
    });

    // Save links
    for (const link of links) {
      if (link.id) {
        await fetch(`/api/links/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: link.id, ...link }),
        });
      } else {
        const res = await fetch(`/api/links/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(link),
        });
        if (res.ok) {
          const saved = await res.json();
          setLinks((prev) => prev.map((l) => (l === link ? { ...l, id: saved.id } : l)));
        }
      }
    }

    // Save seed lists
    for (const seed of seeds) {
      if (seed.id) {
        await fetch(`/api/seed-lists/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: seed.id, ...seed }),
        });
      } else {
        const res = await fetch(`/api/seed-lists/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(seed),
        });
        if (res.ok) {
          const saved = await res.json();
          setSeeds((prev) => prev.map((s) => (s === seed ? { ...s, id: saved.id } : s)));
        }
      }
    }

    setLastSaved(new Date());
    setIsDirty(false);
  }, [form, id, sends, links, seeds]);

  // Auto-save every 30 seconds when dirty
  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => { save(); }, 30000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [isDirty, save]);

  // Warn on navigation when dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function handleSendChange(index: number, field: keyof EmailSendFormValues, value: unknown) {
    setSends((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    setIsDirty(true);
  }

  function handleLinksChange(updated: LinkRow[]) {
    setLinks(updated);
    setIsDirty(true);
  }

  function handleSeedsChange(updated: SeedEntry[]) {
    setSeeds(updated);
    setIsDirty(true);
  }

  const orchestrationFirst = (values.numSends ?? 1) > 1;

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading campaign…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <CampaignHeader
          id={id}
          campaignName={values.campaignName ?? null}
          status={values.status ?? "draft"}
          miroUrl={values.miroUrl ?? null}
          lastSaved={lastSaved}
          isDirty={isDirty}
          values={values}
          sends={sends}
          links={links}
          seeds={seeds}
          onSave={save}
          onNameChange={(name) => { setValue("campaignName", name, { shouldDirty: true }); }}
          onStatusChange={(s) => { setValue("status", s, { shouldDirty: true }); }}
        />

        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-12 pr-24">
            <OverviewSection form={form} />
            <Separator />
            {orchestrationFirst && (
              <>
                <OrchestrationSection
                  form={form}
                  sends={sends}
                  onSendChange={handleSendChange}
                  weekOf={values.weekOf}
                />
                <Separator />
              </>
            )}
            <SpecialInstructionsSection form={form} />
            <Separator />
            <TargetingSection form={form} />
            <Separator />
            {!orchestrationFirst && (
              <>
                <OrchestrationSection
                  form={form}
                  sends={sends}
                  onSendChange={handleSendChange}
                  weekOf={values.weekOf}
                />
                <Separator />
              </>
            )}
            <LinksSection
              numSends={values.numSends ?? 1}
              links={links}
              onLinksChange={handleLinksChange}
            />
            <Separator />
            <SeedListsSection seeds={seeds} onSeedsChange={handleSeedsChange} />
            <div className="h-16" />
          </div>
        </div>
      </div>

      <SectionNav orchestrationFirst={orchestrationFirst} />
    </div>
  );
}
