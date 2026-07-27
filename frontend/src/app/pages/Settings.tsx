import { useEffect, useState, useCallback, useRef } from "react";
import { Save, Globe, Hash, GripVertical, Plus, X } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getSettings, updateSettings, listNumberingConfigs, updateNumberingConfig, getNextReferencePreview, type SettingsData, type NumberingConfig, type EntityType } from "../api";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../context/LanguageContext";
import { FormField, inputCls, selectCls } from "../components/shared/FormField";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
];

const ENTITY_LABELS: Record<EntityType, string> = {
  quote: "settings.quote",
  invoice: "settings.invoice",
  order: "settings.order",
  purchaseOrder: "settings.purchaseOrder",
  delivery: "settings.delivery",
  client: "settings.client",
  ticket: "settings.ticket",
};

const RESET_OPTIONS = [
  { value: "never", labelKey: "settings.never" },
  { value: "yearly", labelKey: "settings.yearly" },
  { value: "monthly", labelKey: "settings.monthly" },
];

const FORMAT_TOKENS = [
  { value: "{PREFIX}", label: "{PREFIX}" },
  { value: "{YEAR}", label: "{YEAR}" },
  { value: "{MONTH}", label: "{MONTH}" },
  { value: "{NUMBER}", label: "{NUMBER}" },
];

const FORMAT_SEPARATORS = [
  { value: "", label: "—" },
  { value: "-", label: "-" },
  { value: "/", label: "/" },
  { value: ".", label: "." },
  { value: " ", label: "space" },
];

type FormatPart = { type: "token"; value: string; id: string } | { type: "separator"; value: string; id: string };

function parseFormat(format: string): FormatPart[] {
  const parts: FormatPart[] = [];
  const tokenRegex = /\{PREFIX\}|\{YEAR\}|\{MONTH\}|\{NUMBER\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let id = 0;
  while ((match = tokenRegex.exec(format)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "separator", value: format.slice(lastIndex, match.index), id: `sep-${id++}` });
    }
    parts.push({ type: "token", value: match[0], id: `token-${id++}` });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < format.length) {
    parts.push({ type: "separator", value: format.slice(lastIndex), id: `sep-${id++}` });
  }
  if (parts.length === 0) {
    parts.push({ type: "token", value: "{PREFIX}", id: `token-${id++}` });
  }
  return parts;
}

function buildFormat(parts: FormatPart[]): string {
  return parts.map((p) => p.value).join("");
}

function DraggableToken({ token, onRemove }: { token: { type: "token"; value: string; id: string }; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: token.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className="inline-flex items-center gap-1 bg-white border border-zinc-200 rounded-md px-2 py-1 shadow-sm">
      <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600">
        <GripVertical className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
      <span className="text-xs font-mono font-semibold text-zinc-700">{token.value}</span>
      <button type="button" onClick={onRemove} className="text-zinc-400 hover:text-red-500 transition-colors">
        <X className="w-3 h-3" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function SeparatorChip({ part, onChange }: { part: { type: "separator"; value: string; id: string }; onChange: (value: string) => void }) {
  const { setNodeRef } = useSortable({ id: part.id });

  return (
    <div ref={setNodeRef} className="inline-flex items-center">
      <select
        value={part.value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 text-xs font-medium text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-md px-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
      >
        {FORMAT_SEPARATORS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}

function FormatBuilder({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [parts, setParts] = useState<FormatPart[]>(() => parseFormat(value));
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 2 } }));

  useEffect(() => {
    setParts(parseFormat(value));
  }, [value]);

  const updateParts = (next: FormatPart[]) => {
    setParts(next);
    onChange(buildFormat(next));
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = parts.findIndex((p) => p.id === active.id);
    const newIndex = parts.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = [...parts];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    updateParts(next);
  };

  const addToken = (tokenValue: string) => {
    const newId = `token-${Date.now()}`;
    updateParts([...parts, { type: "token", value: tokenValue, id: newId }]);
  };

  const removeToken = (id: string) => {
    updateParts(parts.filter((p) => p.id !== id));
  };

  const updateSeparator = (id: string, value: string) => {
    updateParts(parts.map((p) => (p.id === id ? { ...p, value } : p)));
  };

  const tokenItems = parts.filter((p): p is { type: "token"; value: string; id: string } => p.type === "token");
  const tokens = tokenItems.map((t) => t.id);

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={tokens} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap items-center gap-1.5">
            {parts.map((part, idx) => {
              if (part.type === "token") {
                return (
                  <span key={part.id} className="inline-flex items-center">
                    <DraggableToken token={part} onRemove={() => removeToken(part.id)} />
                    {idx < parts.length - 1 && parts[idx + 1]?.type === "separator" && (
                      <SeparatorChip part={parts[idx + 1]} onChange={(v) => updateSeparator(parts[idx + 1].id, v)} />
                    )}
                  </span>
                );
              }
              return null;
            })}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (() => {
            const part = parts.find((p) => p.id === activeId);
            if (!part || part.type !== "token") return null;
            return (
              <div className="inline-flex items-center gap-1 bg-white border border-zinc-200 rounded-md px-2 py-1 shadow-md opacity-90">
                <GripVertical className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                <span className="text-xs font-mono font-semibold text-zinc-700">{part.value}</span>
              </div>
            );
          })() : null}
        </DragOverlay>
      </DndContext>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Tokens</span>
        {FORMAT_TOKENS.map((tok) => (
          <button
            key={tok.value}
            type="button"
            onClick={() => addToken(tok.value)}
            className="inline-flex items-center gap-1 bg-white border border-zinc-200 rounded-md px-2 py-1 text-xs font-mono text-zinc-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-3 h-3" strokeWidth={1.75} />
            {tok.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-zinc-500">Generated format: <span className="font-mono font-semibold text-zinc-700">{value}</span></p>
    </div>
  );
}

export default function SettingsPage() {
  const { token } = useAuth();
  const { t, setLanguage } = useLanguage();
  const user = useAuth().user;
  const isAdmin = user?.role === "admin";

  const [data, setData] = useState<SettingsData>({ timezone: "UTC", language: "en" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [numberingConfigs, setNumberingConfigs] = useState<NumberingConfig[]>([]);
  const [numberingLoading, setNumberingLoading] = useState(false);
  const [numberingSaving, setNumberingSaving] = useState(false);
  const [numberingError, setNumberingError] = useState("");
  const [numberingSuccess, setNumberingSuccess] = useState("");
  const [numberingLoadError, setNumberingLoadError] = useState("");
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const formatHistoryRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getSettings(token)
      .then((s) => { setData(s); setLanguage(s.language); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, setLanguage]);

  useEffect(() => {
    if (!token || !isAdmin) return;
    setNumberingLoading(true);
    setNumberingLoadError("");
    listNumberingConfigs(token)
      .then((r) => setNumberingConfigs(r.configs))
      .catch((err) => setNumberingLoadError(err instanceof Error ? err.message : "Failed to load numbering configs"))
      .finally(() => setNumberingLoading(false));
  }, [token, isAdmin]);

  const handlePreview = useCallback(async (entityType: EntityType, cfg?: NumberingConfig) => {
    try {
      const config = cfg || numberingConfigs.find((c) => c.entityType === entityType);
      const res = await getNextReferencePreview(token, entityType, {
        format: config?.format,
        prefix: config?.prefix,
        padding: config?.padding,
        resetFrequency: config?.resetFrequency,
      });
      setPreviews((p) => ({ ...p, [entityType]: res.preview }));
    } catch {
      setPreviews((p) => ({ ...p, [entityType]: "—" }));
    }
  }, [token, numberingConfigs]);

  useEffect(() => {
    // Refresh previews automatically when formats change
    const prev = formatHistoryRef.current;
    formatHistoryRef.current = Object.fromEntries(numberingConfigs.map((cfg) => [cfg.entityType, cfg.format]));
    const timer = setTimeout(() => {
      numberingConfigs.forEach((cfg) => {
        if (cfg.format && prev[cfg.entityType] !== cfg.format) {
          handlePreview(cfg.entityType, cfg);
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [numberingConfigs, handlePreview]);

  const handlePrefsSubmit = async (e: React.FormEvent) => {
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

  const handleNumberingSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNumberingError(""); setNumberingSuccess(""); setNumberingSaving(true);
    try {
      const updates = await Promise.all(
        numberingConfigs.map((cfg) =>
          updateNumberingConfig(token, cfg.entityType, {
            prefix: cfg.prefix,
            format: cfg.format,
            padding: cfg.padding,
            resetFrequency: cfg.resetFrequency,
          })
        )
      );
      setNumberingConfigs(updates.map((r) => r.config));
      setNumberingSuccess(t("settings.numberingSaved"));
    } catch (err) { setNumberingError(err instanceof Error ? err.message : t("settings.numberingSaveFailed")); }
    finally { setNumberingSaving(false); }
  };

  const updateConfig = (entityType: EntityType, patch: Partial<NumberingConfig>) => {
    setNumberingConfigs((prev) => prev.map((c) => (c.entityType === entityType ? { ...c, ...patch } : c)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
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

        <form onSubmit={handlePrefsSubmit} className="space-y-5">
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

      {isAdmin && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
              <Hash className="w-5 h-5 text-zinc-500" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">{t("settings.numbering")}</h2>
              <p className="text-xs text-zinc-500">{t("settings.numberingDescription")}</p>
            </div>
          </div>

          {numberingLoadError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{numberingLoadError}</p>
          )}

          {numberingLoading ? (
            <div className="flex items-center justify-center py-10">
              <span className="w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : numberingConfigs.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6">{t("common.noResults")}</p>
          ) : (
            <form onSubmit={handleNumberingSave} className="space-y-4">
              <div className="space-y-3">
                {numberingConfigs.map((cfg) => (
                  <div key={cfg.entityType} className="rounded-xl border border-zinc-100 bg-zinc-50/40 p-4">
                    <div className="mb-3">
                      <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">{t(ENTITY_LABELS[cfg.entityType])}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 mb-1">{t("settings.prefix")}</label>
                        <input className={inputCls} value={cfg.prefix} onChange={(e) => updateConfig(cfg.entityType, { prefix: e.target.value })} />
                      </div>
                      <div className="lg:col-span-4">
                        <label className="block text-[11px] font-medium text-zinc-500 mb-1">{t("settings.format")}</label>
                        <FormatBuilder value={cfg.format} onChange={(format) => updateConfig(cfg.entityType, { format })} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 mb-1">{t("settings.padding")}</label>
                        <input type="number" className={inputCls} value={cfg.padding} onChange={(e) => updateConfig(cfg.entityType, { padding: parseInt(e.target.value) || 1 })} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 mb-1">{t("settings.resetFrequency")}</label>
                        <select className={inputCls} value={cfg.resetFrequency} onChange={(e) => updateConfig(cfg.entityType, { resetFrequency: e.target.value as "never" | "yearly" | "monthly" })}>
                          {RESET_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-xs text-zinc-500">{t("settings.preview")}:</span>
                      <span className="text-xs text-zinc-800 font-mono bg-white border border-zinc-200 rounded-md px-2 py-1 min-w-[12rem]">{previews[cfg.entityType] || "—"}</span>
                      <button type="button" onClick={() => handlePreview(cfg.entityType, cfg)} className="text-[11px] text-blue-500 hover:text-blue-600 font-medium whitespace-nowrap">Preview</button>
                    </div>
                  </div>
                ))}
              </div>

              {numberingError && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{numberingError}</p>}
              {numberingSuccess && <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{numberingSuccess}</p>}

              <button type="submit" disabled={numberingSaving} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                {numberingSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" strokeWidth={1.75} />}
                {t("settings.saveNumbering")}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
