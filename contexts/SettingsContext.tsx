"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface AppSettings {
  dropdown_brand: string[];
  dropdown_productLineShort: string[];
  dropdown_productLineFull: string[];
  dropdown_audience: string[];
  dropdown_segmentation: string[];
  dropdown_country: string[];
  dropdown_language: string[];
  dropdown_campaignType: string[];
  dropdown_sendType: string[];
  dropdown_emailBuildType: string[];
  dropdown_sendFromName: string[];
  dropdown_sendFromAddress: string[];
  dropdown_audienceSource: string[];
  dropdown_abTestType: string[];
  dropdown_abAudienceSplit: string[];
  dropdown_assetType: string[];
  dropdown_versionType: string[];
  dropdown_emailGroupNum: string[];
  dropdown_status: string[];
  requiredFields: Record<string, boolean>;
  valueColors: Record<string, string>;
}

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
  dropdown_sendFromAddress: ["reply@e.fordpro.com"],
  dropdown_audienceSource: [],
  dropdown_abTestType: [],
  dropdown_abAudienceSplit: [],
  dropdown_assetType: [],
  dropdown_versionType: [],
  dropdown_emailGroupNum: [],
  dropdown_status: [],
  requiredFields: {},
  valueColors: {},
};

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  updateSetting: (key: string, value: unknown) => Promise<void>;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultSettings,
  loading: true,
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
        setSettings({ ...defaultSettings, ...data });
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

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSetting, refetch: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
