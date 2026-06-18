"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { getValueColor } from "@/lib/valueColors";

export interface DropdownValue {
  value: string;
  color: string;
  isDefault?: boolean;
}

export function getDefaultDropdownValue(values: DropdownValue[]): string | undefined {
  return values.find((v) => v.isDefault)?.value;
}

export interface AppSettings {
  dropdown_brand: DropdownValue[];
  dropdown_productLineShort: DropdownValue[];
  dropdown_productLineFull: DropdownValue[];
  dropdown_audience: DropdownValue[];
  dropdown_segmentation: DropdownValue[];
  dropdown_country: DropdownValue[];
  dropdown_language: DropdownValue[];
  dropdown_campaignType: DropdownValue[];
  dropdown_sendType: DropdownValue[];
  dropdown_emailBuildType: DropdownValue[];
  dropdown_sendFromName: DropdownValue[];
  dropdown_sendFromAddress: DropdownValue[];
  dropdown_audienceSource: DropdownValue[];
  dropdown_abTestType: DropdownValue[];
  dropdown_abAudienceSplit: DropdownValue[];
  dropdown_assetType: DropdownValue[];
  dropdown_versionType: DropdownValue[];
  dropdown_emailGroupNum: DropdownValue[];
  dropdown_status: DropdownValue[];
  requiredFields: Record<string, boolean>;
}

const DROPDOWN_KEYS = [
  "dropdown_brand", "dropdown_productLineShort", "dropdown_productLineFull",
  "dropdown_audience", "dropdown_segmentation", "dropdown_country", "dropdown_language",
  "dropdown_campaignType", "dropdown_sendType", "dropdown_emailBuildType",
  "dropdown_sendFromName", "dropdown_sendFromAddress", "dropdown_audienceSource",
  "dropdown_abTestType", "dropdown_abAudienceSplit", "dropdown_assetType",
  "dropdown_versionType", "dropdown_emailGroupNum", "dropdown_status",
] as const;

const defaultSettings: AppSettings = {
  dropdown_brand: [],
  dropdown_productLineShort: [],
  dropdown_productLineFull: [],
  dropdown_audience: [],
  dropdown_segmentation: [],
  dropdown_country: [],
  dropdown_language: [],
  dropdown_campaignType: [],
  dropdown_sendType: [],
  dropdown_emailBuildType: [],
  dropdown_sendFromName: [],
  dropdown_sendFromAddress: [{ value: "reply@e.fordpro.com", color: getValueColor("reply@e.fordpro.com") }],
  dropdown_audienceSource: [],
  dropdown_abTestType: [],
  dropdown_abAudienceSplit: [],
  dropdown_assetType: [],
  dropdown_versionType: [],
  dropdown_emailGroupNum: [],
  dropdown_status: [],
  requiredFields: {},
};

// Older settings stored dropdown values as plain string[]. Upgrade them in place
// so the rest of the app can assume DropdownValue[] everywhere.
function normalizeDropdownValue(raw: unknown): DropdownValue[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) =>
    typeof item === "string" ? { value: item, color: getValueColor(item) } : (item as DropdownValue)
  );
}

function normalizeSettings(data: Record<string, unknown>): Partial<AppSettings> {
  const normalized: Record<string, unknown> = { ...data };
  for (const key of DROPDOWN_KEYS) {
    if (key in normalized) normalized[key] = normalizeDropdownValue(normalized[key]);
  }
  return normalized as Partial<AppSettings>;
}

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  colorMap: Record<string, string>;
  updateSetting: (key: string, value: unknown) => Promise<void>;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultSettings,
  loading: true,
  colorMap: {},
  updateSetting: async () => {},
  refetch: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...defaultSettings, ...normalizeSettings(data) });
      }
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(async (key: string, value: unknown) => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const key of DROPDOWN_KEYS) {
      for (const item of settings[key]) map[item.value] = item.color;
    }
    return map;
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, colorMap, updateSetting, refetch: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
