import { DataSection } from "@/components/settings/DataSection";
import { ThemeSwitch } from "@/components/settings/ThemeSwitch";
import { LanguageSwitch } from "@/components/settings/LanguageSwitch";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Local-first data portability, appearance, and language preferences.
        </p>
      </div>

      <div className="space-y-6">
        <DataSection />
        <ThemeSwitch />
        <LanguageSwitch />
      </div>
    </div>
  );
}
