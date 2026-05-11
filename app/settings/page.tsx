"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Settings, Eye, Bell, Palette, ChevronRight, Key, EyeOff, Plus, Trash2, Pencil, X, Shield } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { PROVIDERS, loadKeys, saveKeys, maskKey, type ApiKeyEntry, type KeyStore } from "@/app/lib/api-keys";

type Section = "display" | "navigation" | "notifications" | "appearance" | "api-keys";

const navItems = [
  { key: "display"       as Section, label: "Display",      icon: Eye },
  { key: "navigation"    as Section, label: "Navigation",   icon: ChevronRight },
  { key: "notifications" as Section, label: "Notifications",icon: Bell },
  { key: "appearance"    as Section, label: "Appearance",   icon: Palette },
  { key: "api-keys"      as Section, label: "API Keys",     icon: Key },
];

const NAV_TOGGLES = [
  { path: "/tracker",        label: "Scanner",        desc: "Wallet scanner and analysis" },
  { path: "/mainnet",        label: "Leaderboard",    desc: "PnL and volume rankings" },
  { path: "/sopoints",       label: "SoPoints",       desc: "Points and rewards" },
  { path: "/watchlist",      label: "Watchlist",      desc: "Saved wallet list" },
  { path: "/aggregator",     label: "Aggregator",     desc: "Data aggregation tools" },
  { path: "/platform",       label: "Platform",       desc: "Platform statistics" },
  { path: "/incoming",       label: "Incoming",       desc: "Incoming transactions feed" },
  { path: "/reverse-search", label: "Reverse Search", desc: "Search by token or trade" },
];

// ─── Persistent display prefs ─────────────────────────────────────────────────

const DISPLAY_KEY = "display_prefs";

interface DisplayPrefs {
  // Dashboard
  compactStats: boolean;
  autoRefresh: boolean;
  showSparklines: boolean;
  // Scanner
  fullWalletAddress: boolean;
  showTokenLogos: boolean;
  // Leaderboard
  showRankChanges: boolean;
  showWinRate: boolean;
  // Charts
  defaultBarChart: boolean;
  showCumulative: boolean;
  smoothCurves: boolean;
  // AI
  showTokenUsage: boolean;
  streamResponses: boolean;
  autoSaveChats: boolean;
}

const DEFAULTS: DisplayPrefs = {
  compactStats: false,
  autoRefresh: true,
  showSparklines: true,
  fullWalletAddress: false,
  showTokenLogos: true,
  showRankChanges: true,
  showWinRate: true,
  defaultBarChart: true,
  showCumulative: false,
  smoothCurves: false,
  showTokenUsage: false,
  streamResponses: true,
  autoSaveChats: true,
};

function loadPrefs(): DisplayPrefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(DISPLAY_KEY) ?? "{}") }; }
  catch { return DEFAULTS; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span className={cn(
        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  );
}

function SettingRow({ label, desc, checked, onChange, disabled, badge }: {
  label: string; desc?: string; checked: boolean;
  onChange: (v: boolean) => void; disabled?: boolean; badge?: string;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-4 py-3.5 px-4 rounded-lg transition-colors",
      disabled ? "opacity-50" : "hover:bg-muted/40"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {badge && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">{badge}</span>
          )}
        </div>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b bg-muted/30">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-border/60 px-1">{children}</div>
    </div>
  );
}

// ─── API Keys inline manager ──────────────────────────────────────────────────

type ManagerView = "list" | "add" | "edit"

function InlineApiKeyManager() {
  const [keys, setKeys] = useState<KeyStore>(loadKeys)
  const [view, setView] = useState<ManagerView>("list")
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0].id)
  const [editingEntry, setEditingEntry] = useState<{ providerId: string; entry: ApiKeyEntry } | null>(null)
  const [labelInput, setLabelInput] = useState("")
  const [keyInput, setKeyInput] = useState("")
  const [revealId, setRevealId] = useState<string | null>(null)

  const persist = (next: KeyStore) => { setKeys(next); saveKeys(next) }

  const handleAdd = () => {
    if (!keyInput.trim()) return
    const next = { ...keys }
    const entry: ApiKeyEntry = {
      id: Math.random().toString(36).slice(2),
      label: labelInput.trim() || `Key ${((next[selectedProvider]?.length ?? 0) + 1)}`,
      key: keyInput.trim(),
      addedAt: Date.now(),
    }
    next[selectedProvider] = [...(next[selectedProvider] ?? []), entry]
    persist(next)
    setLabelInput(""); setKeyInput(""); setView("list")
  }

  const handleEdit = () => {
    if (!editingEntry || !keyInput.trim()) return
    const next = { ...keys }
    next[editingEntry.providerId] = (next[editingEntry.providerId] ?? []).map(e =>
      e.id === editingEntry.entry.id
        ? { ...e, label: labelInput.trim() || e.label, key: keyInput.trim() }
        : e
    )
    persist(next)
    setEditingEntry(null); setLabelInput(""); setKeyInput(""); setView("list")
  }

  const handleDelete = (providerId: string, entryId: string) => {
    const next = { ...keys }
    next[providerId] = (next[providerId] ?? []).filter(e => e.id !== entryId)
    if (!next[providerId].length) delete next[providerId]
    persist(next)
  }

  const startEdit = (providerId: string, entry: ApiKeyEntry) => {
    setEditingEntry({ providerId, entry })
    setSelectedProvider(providerId)
    setLabelInput(entry.label)
    setKeyInput(entry.key)
    setView("edit")
  }

  const activeProv = PROVIDERS.find(p => p.id === selectedProvider)
  const totalKeys = Object.values(keys).reduce((s, arr) => s + arr.length, 0)

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">API Keys</h2>
          {totalKeys > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold">{totalKeys}</span>
          )}
        </div>
        {view === "list" && (
          <button
            onClick={() => { setLabelInput(""); setKeyInput(""); setEditingEntry(null); setView("add") }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-3" /> Add Key
          </button>
        )}
        {view !== "list" && (
          <button onClick={() => setView("list")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-3.5" /> Cancel
          </button>
        )}
      </div>

      <div className="p-5">
        {view === "list" && (
          <div className="space-y-6">
            {PROVIDERS.map(provider => {
              const entries = keys[provider.id] ?? []
              return (
                <div key={provider.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-2 rounded-full shrink-0" style={{ background: provider.color }} />
                    <span className="text-xs font-semibold" style={{ color: provider.color }}>{provider.name}</span>
                    <span className="text-xs text-muted-foreground">— {provider.desc}</span>
                  </div>
                  {entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-4 opacity-60">{provider.hint}</p>
                  ) : (
                    <div className="space-y-1.5 pl-4">
                      {entries.map(entry => (
                        <div key={entry.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors group">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{entry.label}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {revealId === entry.id ? entry.key : maskKey(entry.key)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => setRevealId(revealId === entry.id ? null : entry.id)}
                              className="p-1.5 rounded hover:bg-muted transition-colors" title={revealId === entry.id ? "Hide" : "Show"}>
                              {revealId === entry.id
                                ? <EyeOff className="size-3.5 text-muted-foreground" />
                                : <Eye className="size-3.5 text-muted-foreground" />}
                            </button>
                            <button onClick={() => startEdit(provider.id, entry)}
                              className="p-1.5 rounded hover:bg-muted transition-colors">
                              <Pencil className="size-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleDelete(provider.id, entry.id)}
                              className="p-1.5 rounded hover:bg-muted transition-colors">
                              <Trash2 className="size-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border">
              <Shield className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Keys are stored in your browser only and never sent to CommunityScan servers — they&apos;re forwarded directly to the respective AI provider for your requests.
              </p>
            </div>
          </div>
        )}

        {(view === "add" || view === "edit") && (
          <div className="space-y-5 max-w-md">
            {view === "add" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provider</p>
                <div className="space-y-1.5">
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => setSelectedProvider(p.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors border",
                        selectedProvider === p.id
                          ? "bg-accent border-border"
                          : "bg-muted/30 border-transparent hover:bg-muted/60"
                      )}>
                      <div className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
                      <span className="text-sm font-medium flex-1">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.desc}</span>
                    </button>
                  ))}
                </div>
                {activeProv && (
                  <p className="text-xs text-muted-foreground px-1">
                    {activeProv.hint}{" "}
                    <a
                      href={activeProv.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 text-primary font-medium hover:opacity-70 transition-opacity"
                    >
                      here
                    </a>
                  </p>
                )}
              </div>
            )}
            {view === "edit" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40">
                <div className="size-2 rounded-full" style={{ background: PROVIDERS.find(p => p.id === selectedProvider)?.color }} />
                <span className="text-sm font-medium">{PROVIDERS.find(p => p.id === selectedProvider)?.name}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Label (optional)</p>
              <input
                className="w-full h-9 rounded-lg border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Production key"
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">API Key</p>
              <input
                className="w-full h-9 rounded-lg border bg-background px-3 text-sm font-mono placeholder:font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={PROVIDERS.find(p => p.id === selectedProvider)?.placeholder ?? "your-api-key"}
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                type="password"
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={view === "add" ? handleAdd : handleEdit}
                disabled={!keyInput.trim()}
                className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {view === "add" ? "Save Key" : "Update Key"}
              </button>
              <button onClick={() => setView("list")}
                className="px-4 h-9 rounded-lg border bg-muted text-sm font-medium hover:bg-muted/80 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState<Section>("display");
  const [prefs, setPrefs] = useState<DisplayPrefs>(DEFAULTS);
  const [navVisibility, setNavVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const s = searchParams.get('section') as Section | null
    if (s && ['display','navigation','notifications','appearance','api-keys'].includes(s)) {
      setActiveSection(s)
    }
  }, [searchParams])

  useEffect(() => {
    setPrefs(loadPrefs());
    try {
      const stored = localStorage.getItem("navVisibility");
      if (stored) setNavVisibility(JSON.parse(stored));
    } catch {}
  }, []);

  const setPref = (key: keyof DisplayPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(DISPLAY_KEY, JSON.stringify(next));
  };

  const handleNavToggle = (path: string, visible: boolean) => {
    const updated = { ...navVisibility, [path]: visible };
    setNavVisibility(updated);
    localStorage.setItem("navVisibility", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("navVisibilityChanged"));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="size-9 rounded-lg bg-muted flex items-center justify-center">
          <Settings className="size-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your preferences and account configuration</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-48 shrink-0 hidden sm:block">
          <div className="sticky top-6 space-y-0.5">
            {navItems.map((item) => {
              const active = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Mobile tabs */}
          <div className="flex gap-1 flex-wrap sm:hidden">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  activeSection === item.key
                    ? "bg-foreground text-background border-transparent"
                    : "text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* ── Display ── */}
          {activeSection === "display" && (
            <div className="space-y-5">
              <SectionCard title="Dashboard">
                <SettingRow
                  label="Compact stat cards"
                  desc="Reduce padding in the three summary cards for a denser layout"
                  checked={prefs.compactStats}
                  onChange={v => setPref("compactStats", v)}
                />
                <SettingRow
                  label="Auto-refresh data"
                  desc="Refresh wallet balance and PnL every 30 seconds"
                  checked={prefs.autoRefresh}
                  onChange={v => setPref("autoRefresh", v)}
                />
                <SettingRow
                  label="Show sparklines"
                  desc="Mini charts on stat cards showing 7-day trend"
                  checked={prefs.showSparklines}
                  onChange={v => setPref("showSparklines", v)}
                  disabled
                  badge="Soon"
                />
              </SectionCard>

              <SectionCard title="Scanner">
                <SettingRow
                  label="Full wallet addresses"
                  desc="Show complete addresses instead of truncated 0x1234…abcd format"
                  checked={prefs.fullWalletAddress}
                  onChange={v => setPref("fullWalletAddress", v)}
                />
                <SettingRow
                  label="Show token logos"
                  desc="Display token icons next to symbol names in position tables"
                  checked={prefs.showTokenLogos}
                  onChange={v => setPref("showTokenLogos", v)}
                  disabled
                  badge="Soon"
                />
              </SectionCard>

              <SectionCard title="Leaderboard">
                <SettingRow
                  label="Rank change arrows"
                  desc="Show ↑ ↓ indicators next to rank number for weekly movement"
                  checked={prefs.showRankChanges}
                  onChange={v => setPref("showRankChanges", v)}
                />
                <SettingRow
                  label="Win rate column"
                  desc="Add a win rate % column to leaderboard tables"
                  checked={prefs.showWinRate}
                  onChange={v => setPref("showWinRate", v)}
                />
              </SectionCard>

              <SectionCard title="Charts">
                <SettingRow
                  label="Bar chart as default"
                  desc="Open PnL charts in bar view instead of line view"
                  checked={prefs.defaultBarChart}
                  onChange={v => setPref("defaultBarChart", v)}
                />
                <SettingRow
                  label="Show cumulative overlay"
                  desc="Always show the cumulative PnL line on top of daily bars"
                  checked={prefs.showCumulative}
                  onChange={v => setPref("showCumulative", v)}
                />
                <SettingRow
                  label="Smooth curves"
                  desc="Use bezier interpolation on line and area charts"
                  checked={prefs.smoothCurves}
                  onChange={v => setPref("smoothCurves", v)}
                />
              </SectionCard>

              <SectionCard title="AI">
                <SettingRow
                  label="Show token usage"
                  desc="Display input/output token counts below each AI message"
                  checked={prefs.showTokenUsage}
                  onChange={v => setPref("showTokenUsage", v)}
                />
                <SettingRow
                  label="Stream responses"
                  desc="Show AI response word-by-word as it generates"
                  checked={prefs.streamResponses}
                  onChange={v => setPref("streamResponses", v)}
                />
                <SettingRow
                  label="Auto-save conversations"
                  desc="Persist chat history across sessions automatically"
                  checked={prefs.autoSaveChats}
                  onChange={v => setPref("autoSaveChats", v)}
                />
              </SectionCard>
            </div>
          )}

          {/* ── Navigation ── */}
          {activeSection === "navigation" && (
            <SectionCard title="Navigation Visibility">
              {NAV_TOGGLES.map((item) => (
                <SettingRow
                  key={item.path}
                  label={item.label}
                  desc={item.desc}
                  checked={navVisibility[item.path] !== false}
                  onChange={(v) => handleNavToggle(item.path, v)}
                />
              ))}
            </SectionCard>
          )}

          {/* ── Notifications ── */}
          {activeSection === "notifications" && (
            <div className="space-y-5">
              <SectionCard title="In-App Notifications">
                <SettingRow
                  label="Position alerts"
                  desc="When watched wallets open or close positions"
                  checked={true}
                  onChange={() => {}}
                />
                <SettingRow
                  label="Price alerts"
                  desc="When a tracked symbol moves ≥5%"
                  checked={true}
                  onChange={() => {}}
                />
                <SettingRow
                  label="Maintenance alerts"
                  desc="When the Sodex gateway becomes unreachable"
                  checked={true}
                  onChange={() => {}}
                />
              </SectionCard>

              <div className="rounded-xl border bg-card px-5 py-4 flex items-start gap-3">
                <Bell className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Telegram & Discord alerts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure Telegram bot and Discord webhook connections in your{" "}
                    <a href="/profile" className="text-primary hover:underline">Profile → Alerts</a>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Appearance ── */}
          {activeSection === "appearance" && (
            <div className="space-y-5">
              <SectionCard title="Theme">
                <SettingRow
                  label="Dark mode"
                  desc="Follows your OS preference by default"
                  checked={true}
                  onChange={() => {}}
                  disabled
                  badge="System"
                />
              </SectionCard>

              <SectionCard title="Density">
                <SettingRow
                  label="Compact tables"
                  desc="Reduce row padding in leaderboard and scanner tables"
                  checked={false}
                  onChange={() => {}}
                  disabled
                  badge="Soon"
                />
                <SettingRow
                  label="Reduced motion"
                  desc="Disable transition animations across the interface"
                  checked={false}
                  onChange={() => {}}
                  disabled
                  badge="Soon"
                />
              </SectionCard>
            </div>
          )}

          {/* ── API Keys ── */}
          {activeSection === "api-keys" && (
            <div className="space-y-5">
              <InlineApiKeyManager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
