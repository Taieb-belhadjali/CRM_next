import { useEffect, useState } from "react";
import { Save, Globe } from "lucide-react";
import { getSettings, updateSettings, type SettingsData } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../context/LanguageContext";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
];

export default function SettingsPage() {
  const { token } = useAuth();
  const { t, setLanguage } = useLanguage();
  const [data, setData] = useState<SettingsData>({ timezone: "UTC", language: "en" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getSettings(token)
      .then((s) => { setData(s); setLanguage(s.language); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, setLanguage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      const updated = await updateSettings(token, data);
      setData(updated);
      setLanguage(updated.language);
      setSuccess(t("settings.settingsSaved"));
    } catch (err) { setError(err instanceof Error ? err.message : t("errors.saveFailed")); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-zinc-500" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{t("settings.preferences")}</h2>
            <p className="text-xs text-zinc-500">{t("settings.timezoneAndLanguageSettings")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label={t("settings.timezone")}>
            <select className={selectCls} value={data.timezone} onChange={(e) => setData((d) => ({ ...d, timezone: e.target.value }))}>
              <option value="UTC">UTC</option>
              <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
            </select>
          </FormField>
          <FormField label={t("settings.language")}>
            <select className={selectCls} value={data.language} onChange={(e) => setData((d) => ({ ...d, language: e.target.value }))}>
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </FormField>

          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}

          <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" strokeWidth={1.75} />}
            {t("settings.saveSettings")}
          </button>
        </form>
      </div>
    </div>
  );
}
