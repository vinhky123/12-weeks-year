"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { SettingsDto, Theme, AppLocale } from "@/lib/contracts";
import { apiFetch } from "@/components/common/api";

interface SettingsContextValue {
  settings: SettingsDto | null;
  theme: Theme;
  locale: AppLocale;
  loading: boolean;
  setTheme: (theme: Theme) => Promise<void>;
  setLocale: (locale: AppLocale) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [theme, setThemeState] = useState<Theme>("system");
  const [locale, setLocaleState] = useState<AppLocale>("en");
  const [loading, setLoading] = useState(true);

  // Apply theme to document.documentElement
  const applyTheme = useCallback((currentTheme: Theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (currentTheme === "dark") {
      root.classList.add("dark");
    } else if (currentTheme === "light") {
      root.classList.remove("dark");
    } else {
      // system
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ settings: SettingsDto }>("/api/settings");
      setSettings(res.settings);
      setThemeState(res.settings.theme);
      setLocaleState(res.settings.locale);
      applyTheme(res.settings.theme);
    } catch {
      // Graceful fallback to default system/en
      applyTheme("system");
    } finally {
      setLoading(false);
    }
  }, [applyTheme]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Listen to system theme changes when in system mode
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme]);

  const setTheme = async (newTheme: Theme) => {
    const prevTheme = theme;
    setThemeState(newTheme);
    applyTheme(newTheme);

    try {
      const res = await apiFetch<{ settings: SettingsDto }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ theme: newTheme }),
      });
      setSettings(res.settings);
    } catch (err) {
      // Rollback on error
      setThemeState(prevTheme);
      applyTheme(prevTheme);
      throw err;
    }
  };

  const setLocale = async (newLocale: AppLocale) => {
    const prevLocale = locale;
    setLocaleState(newLocale);

    try {
      const res = await apiFetch<{ settings: SettingsDto }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ locale: newLocale }),
      });
      setSettings(res.settings);
    } catch (err) {
      // Rollback on error
      setLocaleState(prevLocale);
      throw err;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        theme,
        locale,
        loading,
        setTheme,
        setLocale,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    // Default safe fallback if rendered outside provider
    return {
      settings: null,
      theme: "system",
      locale: "en",
      loading: false,
      setTheme: async () => {},
      setLocale: async () => {},
      refreshSettings: async () => {},
    };
  }
  return context;
}
