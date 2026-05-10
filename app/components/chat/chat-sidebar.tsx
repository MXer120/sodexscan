"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  MessageCircleDashedIcon, BookOpenIcon, WrenchIcon,
  HomeIcon, SparklesIcon,
  ChevronDownIcon, CheckIcon, MoreVerticalIcon,
  Share2Icon, PencilIcon, ArchiveIcon, ArchiveRestoreIcon, Trash2Icon,
  WandSparklesIcon, KeyIcon, PlusIcon, Trash2, Pencil, X, Eye, EyeOff,
  ShieldIcon, CalendarIcon, ClockIcon,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Separator } from "@/app/components/ui/separator";
import { Logo } from "@/app/components/ui/logo";
import { useChatStore } from "@/app/store/chat-store";
import { cn } from "@/app/lib/utils";
import { ApiKeyEntry, KeyStore, STORAGE_KEY, PROVIDERS, loadKeys, saveKeys, maskKey } from "@/app/lib/api-keys";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";
import Link from "next/link";

export type AIView = "chat" | "kb" | "tools" | "schedule";

interface Props {
  currentView: AIView;
  onViewChange: (view: AIView) => void;
  onNewChat?: () => void;
  toolCategory?: string;
  onToolCategoryChange?: (cat: string) => void;
  toolCategories?: { name: string; count: number }[];
}

const teams = [
  { id: "personal", name: "Personal", icon: HomeIcon },
  { id: "work",     name: "Work Team", icon: SparklesIcon },
];

// ─── Centered modal API Key Manager ──────────────────────────────────────────

type ManagerView = "list" | "add" | "edit";

function ApiKeyManager({ onClose }: { onClose: () => void }) {
  const [keys, setKeys] = useState<KeyStore>(loadKeys);
  const [view, setView] = useState<ManagerView>("list");
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0].id);
  const [editingEntry, setEditingEntry] = useState<{ providerId: string; entry: ApiKeyEntry } | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [revealId, setRevealId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const persist = (next: KeyStore) => { setKeys(next); saveKeys(next); };

  const handleAdd = () => {
    if (!keyInput.trim()) return;
    const next = { ...keys };
    const entry: ApiKeyEntry = {
      id: Math.random().toString(36).slice(2),
      label: labelInput.trim() || `Key ${((next[selectedProvider]?.length ?? 0) + 1)}`,
      key: keyInput.trim(),
      addedAt: Date.now(),
    };
    next[selectedProvider] = [...(next[selectedProvider] ?? []), entry];
    persist(next);
    setLabelInput(""); setKeyInput(""); setView("list");
  };

  const handleEdit = () => {
    if (!editingEntry || !keyInput.trim()) return;
    const next = { ...keys };
    next[editingEntry.providerId] = (next[editingEntry.providerId] ?? []).map(e =>
      e.id === editingEntry.entry.id
        ? { ...e, label: labelInput.trim() || e.label, key: keyInput.trim() }
        : e
    );
    persist(next);
    setEditingEntry(null); setLabelInput(""); setKeyInput(""); setView("list");
  };

  const handleDelete = (providerId: string, entryId: string) => {
    const next = { ...keys };
    next[providerId] = (next[providerId] ?? []).filter(e => e.id !== entryId);
    if (!next[providerId].length) delete next[providerId];
    persist(next);
  };

  const startEdit = (providerId: string, entry: ApiKeyEntry) => {
    setEditingEntry({ providerId, entry });
    setSelectedProvider(providerId);
    setLabelInput(entry.label);
    setKeyInput(entry.key);
    setView("edit");
  };

  const startAdd = () => {
    setLabelInput(""); setKeyInput("");
    setEditingEntry(null);
    setView("add");
  };

  const totalKeys = Object.values(keys).reduce((s, arr) => s + arr.length, 0);
  const activeProv = PROVIDERS.find(p => p.id === selectedProvider);

  if (typeof window === "undefined") return null;

  return createPortal(
    // Backdrop with blur tint (dark & light mode aware)
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.09) 100%)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel — same gradient card style as promo element */}
      <div
        ref={panelRef}
        className="relative w-full max-w-[360px] mx-4 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: "var(--sidebar, hsl(var(--card)))" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10 pointer-events-none" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
            {view === "list" ? (
              <>
                <div className="flex items-center gap-2">
                  <KeyIcon className="size-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold">API Keys</span>
                  {totalKeys > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold">
                      {totalKeys}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={startAdd}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <PlusIcon className="size-3" /> Add
                  </button>
                  <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 transition-colors">
                    <X className="size-3.5 text-muted-foreground" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold">
                  {view === "add" ? "Add API Key" : "Edit API Key"}
                </span>
                <button onClick={() => setView("list")} className="p-1.5 rounded hover:bg-white/10 transition-colors">
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              </>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: "min(420px, 70vh)" }}>

            {/* ── List view ── */}
            {view === "list" && (
              <div className="p-3 space-y-1">
                {PROVIDERS.map(provider => {
                  const entries = keys[provider.id] ?? [];
                  return (
                    <div key={provider.id}>
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <div className="size-2 rounded-full shrink-0" style={{ background: provider.color }} />
                        <span className="text-[11px] font-semibold flex-1" style={{ color: provider.color }}>
                          {provider.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{provider.desc}</span>
                      </div>
                      {entries.length === 0 ? (
                        <div className="flex items-center gap-2 px-2.5 py-1.5 ml-4 opacity-40">
                          <span className="text-[11px] text-muted-foreground">No key — {provider.hint}</span>
                        </div>
                      ) : (
                        entries.map(entry => (
                          <div key={entry.id}
                            className="flex items-center gap-2 px-2.5 py-2 ml-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group mb-1"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium truncate">{entry.label}</p>
                              <p className="text-[10px] text-muted-foreground font-mono tracking-wide">
                                {revealId === entry.id ? entry.key : maskKey(entry.key)}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => setRevealId(revealId === entry.id ? null : entry.id)}
                                className="p-1 rounded hover:bg-white/10"
                                title={revealId === entry.id ? "Hide" : "Reveal"}
                              >
                                {revealId === entry.id
                                  ? <EyeOff className="size-3 text-muted-foreground" />
                                  : <Eye className="size-3 text-muted-foreground" />
                                }
                              </button>
                              <button onClick={() => startEdit(provider.id, entry)} className="p-1 rounded hover:bg-white/10">
                                <Pencil className="size-3 text-muted-foreground" />
                              </button>
                              <button onClick={() => handleDelete(provider.id, entry.id)} className="p-1 rounded hover:bg-white/10">
                                <Trash2 className="size-3 text-red-400" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}

                {totalKeys === 0 && (
                  <div className="text-center py-5 space-y-2">
                    <KeyIcon className="size-6 text-muted-foreground mx-auto opacity-30" />
                    <p className="text-xs text-muted-foreground">No API keys added yet.</p>
                    <button onClick={startAdd} className="text-xs text-primary hover:underline">
                      Add your first key →
                    </button>
                  </div>
                )}

                {/* Security note */}
                <div className="flex items-start gap-2 mt-3 px-2 py-2.5 rounded-lg bg-white/5 border border-white/10">
                  <ShieldIcon className="size-3 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Keys are stored in your browser only and never sent to CommunityScan servers — they&apos;re forwarded directly to the respective AI provider for your requests.
                  </p>
                </div>
              </div>
            )}

            {/* ── Add / Edit view ── */}
            {(view === "add" || view === "edit") && (
              <div className="p-4 space-y-4">

                {/* Provider selector (add only) */}
                {view === "add" && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Provider</p>
                    <div className="space-y-1">
                      {PROVIDERS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedProvider(p.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors border",
                            selectedProvider === p.id
                              ? "bg-white/15 border-white/20"
                              : "bg-white/5 border-transparent hover:bg-white/10"
                          )}
                        >
                          <div className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
                          <span className="text-xs font-medium flex-1">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">{p.desc}</span>
                          {selectedProvider === p.id && <CheckIcon className="size-3 text-primary shrink-0" />}
                        </button>
                      ))}
                    </div>
                    {activeProv && (
                      <p className="text-[10px] text-muted-foreground px-1">{activeProv.hint}</p>
                    )}
                  </div>
                )}

                {view === "edit" && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                    <div className="size-2 rounded-full shrink-0"
                      style={{ background: PROVIDERS.find(p => p.id === selectedProvider)?.color }} />
                    <span className="text-xs font-medium">
                      {PROVIDERS.find(p => p.id === selectedProvider)?.name}
                    </span>
                  </div>
                )}

                {/* Label */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Label (optional)</p>
                  <input
                    className="w-full h-9 rounded-lg border border-white/15 bg-white/10 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60"
                    placeholder="e.g. Production key"
                    value={labelInput}
                    onChange={e => setLabelInput(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                {/* Key */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">API Key</p>
                  <input
                    className="w-full h-9 rounded-lg border border-white/15 bg-white/10 px-3 text-sm font-mono placeholder:font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60"
                    placeholder={PROVIDERS.find(p => p.id === selectedProvider)?.placeholder ?? "your-api-key"}
                    value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={view === "add" ? handleAdd : handleEdit}
                    disabled={!keyInput.trim()}
                    className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {view === "add" ? "Save Key" : "Update Key"}
                  </button>
                  <button
                    onClick={() => setView("list")}
                    className="px-4 h-9 rounded-lg bg-white/10 text-sm font-medium hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export function ChatSidebar({
  currentView, onViewChange, onNewChat,
  toolCategory = "all", onToolCategoryChange, toolCategories = [],
}: Props) {
  const [selectedTeam, setSelectedTeam] = useState("personal");
  const { chats, selectedChatId, selectChat, archiveChat, unarchiveChat, deleteChat } = useChatStore();
  const [keyManagerOpen, setKeyManagerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const recentChats   = chats.filter(c => !c.isArchived);
  const archivedChats = chats.filter(c => c.isArchived);

  const navItems = [
    { id: "chat"     as AIView, icon: MessageCircleDashedIcon, label: "Chat" },
    { id: "kb"       as AIView, icon: BookOpenIcon,            label: "Knowledge Base" },
    { id: "tools"    as AIView, icon: WrenchIcon,              label: "Tools" },
    { id: "schedule" as AIView, icon: CalendarIcon,            label: "Schedule" },
  ];

  const closeManager = useCallback(() => setKeyManagerOpen(false), []);

  const [keyCount, setKeyCount] = useState(0);
  useEffect(() => {
    const update = () => {
      try {
        const store: KeyStore = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
        setKeyCount(Object.values(store).reduce((s, a) => s + a.length, 0));
      } catch {}
    };
    update();
  }, [keyManagerOpen]);

  const q = searchQuery.trim().toLowerCase();

  const chatResults = q
    ? [...recentChats, ...archivedChats].filter(c =>
        c.title.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];

  const toolResults = q
    ? (toolCategories ?? []).filter(c =>
        c.name.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const isSearching = q.length > 0;

  return (
    <div className="flex h-full w-full flex-col bg-sidebar border-r border-sidebar-border">

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2.5 px-2 h-10">
              <Logo className="size-6" />
              <span className="font-semibold text-sm">CommunityScan AI</span>
              <ChevronDownIcon className="size-3 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {teams.map(team => {
              const Icon = team.icon;
              return (
                <DropdownMenuItem key={team.id} onClick={() => setSelectedTeam(team.id)} className="gap-2">
                  <Icon className="size-4" />
                  <span className="flex-1">{team.name}</span>
                  {selectedTeam === team.id && <CheckIcon className="size-4" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative flex items-center">
          <svg className="absolute left-3 size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <Input
            placeholder="Search anything"
            className="pl-9 pr-10 h-[34px] bg-muted/50"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button onClick={() => setSearchQuery("")}
              className="absolute right-2 flex items-center justify-center size-5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <X className="size-3.5" />
            </button>
          ) : (
            <div className="absolute right-2 flex items-center justify-center size-5 rounded bg-muted text-xs text-muted-foreground">/</div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="px-3 pb-2 space-y-0.5">
        {navItems.map(({ id, icon: Icon, label }) => (
          <Button
            key={id}
            variant={currentView === id ? "secondary" : "ghost"}
            className={cn("w-full justify-start gap-2 px-2", currentView === id && "bg-accent")}
            onClick={() => {
              if (id === "chat" && onNewChat) {
                onNewChat();
              } else {
                onViewChange(id);
              }
            }}
          >
            <Icon className="size-4" />
            <span className="text-sm">{label}</span>
          </Button>
        ))}
      </div>

      <Separator />

      {/* Context list */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isSearching ? (
          <div className="p-3 space-y-4">
            {chatResults.length === 0 && toolResults.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No results for &quot;{searchQuery}&quot;</p>
            )}
            {chatResults.length > 0 && (
              <div className="space-y-1">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Chats</p>
                {chatResults.map(chat => (
                  <button key={chat.id}
                    onClick={() => { setSearchQuery(""); selectChat(chat.id); onViewChange("chat"); }}
                    className="w-full text-left rounded-lg px-3 py-2 hover:bg-accent transition-colors flex items-center gap-2">
                    <MessageCircleDashedIcon className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{chat.title}</span>
                  </button>
                ))}
              </div>
            )}
            {toolResults.length > 0 && (
              <div className="space-y-1">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tools</p>
                {toolResults.map(cat => (
                  <button key={cat.name}
                    onClick={() => { setSearchQuery(""); onToolCategoryChange?.(cat.name); onViewChange("tools"); }}
                    className="w-full text-left rounded-lg px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <WrenchIcon className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm">{cat.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{cat.count}</span>
                  </button>
                ))}
              </div>
            )}
            {chatResults.length === 0 && toolResults.length > 0 || chatResults.length > 0 && (
              <div>
                <button onClick={() => { setSearchQuery(""); onViewChange("kb"); }}
                  className="w-full text-left rounded-lg px-3 py-2 hover:bg-accent transition-colors flex items-center gap-2 text-muted-foreground/60">
                  <BookOpenIcon className="size-3.5 shrink-0" />
                  <span className="text-xs">Search &quot;{searchQuery}&quot; in Knowledge Base →</span>
                </button>
              </div>
            )}
          </div>
        ) : currentView === "tools" ? (
          <div className="p-3 space-y-0.5">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Categories</p>
            <button
              onClick={() => onToolCategoryChange?.("all")}
              className={cn("w-full text-left rounded-lg px-3 py-2 hover:bg-accent transition-colors", toolCategory === "all" && "bg-accent")}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">All categories</span>
                <span className="text-xs text-muted-foreground">{toolCategories.reduce((s, c) => s + c.count, 0)}</span>
              </div>
            </button>
            {toolCategories.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">Loading…</p>}
            {toolCategories.map(cat => (
              <button
                key={cat.name}
                onClick={() => onToolCategoryChange?.(cat.name)}
                className={cn("w-full text-left rounded-lg px-3 py-2 hover:bg-accent transition-colors", toolCategory === cat.name && "bg-accent")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">{cat.count}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {recentChats.length > 0 && (
              <div className="space-y-1">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent</p>
                {recentChats.map(chat => (
                  <ChatRow key={chat.id} chat={chat} isActive={selectedChatId === chat.id}
                    onSelect={() => { selectChat(chat.id); onViewChange("chat"); }}
                    onArchive={() => archiveChat(chat.id)}
                    onDelete={() => deleteChat(chat.id)} />
                ))}
              </div>
            )}
            {archivedChats.length > 0 && (
              <div className="space-y-1">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Archived</p>
                {archivedChats.map(chat => (
                  <ChatRow key={chat.id} chat={chat} isActive={selectedChatId === chat.id}
                    onSelect={() => { selectChat(chat.id); onViewChange("chat"); }}
                    onUnarchive={() => unarchiveChat(chat.id)}
                    onDelete={() => deleteChat(chat.id)} />
                ))}
              </div>
            )}
            {recentChats.length === 0 && archivedChats.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No conversations yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-sidebar-border">
        <div className="rounded-lg bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10 p-3.5 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <WandSparklesIcon className="size-4" />
              <span className="text-sm font-semibold">CommunityScan</span>
            </div>
            <p className="text-xs text-muted-foreground leading-tight">
              The premier data intelligence layer for Sodex Mainnet trading activity.
            </p>
          </div>
          <button
            onClick={() => setKeyManagerOpen(v => !v)}
            className="relative w-fit h-[30px] px-3 overflow-hidden rounded-md bg-white text-black hover:bg-white/90 shadow-[0px_1px_2px_0px_rgba(8,8,8,0.2),inset_0px_1px_1px_0px_rgba(255,255,255,0.2)] flex items-center gap-1.5 transition-colors"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(205,175,250,1),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(164,252,245,1),transparent_50%)]" />
            <KeyIcon className="relative z-10 size-3" />
            <span className="relative z-10 font-medium text-xs">API Keys</span>
            {keyCount > 0 && (
              <span className="relative z-10 flex items-center justify-center size-4 rounded-full bg-black/10 text-[9px] font-bold">
                {keyCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {keyManagerOpen && <ApiKeyManager onClose={closeManager} />}
    </div>
  );
}

function ChatRow({ chat, isActive, onSelect, onArchive, onUnarchive, onDelete }: {
  chat: { id: string; title: string };
  isActive: boolean;
  onSelect: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn("group/item relative flex items-center rounded-md overflow-hidden", isActive && "bg-sidebar-accent")}>
      <Button variant="ghost"
        className={cn("flex-1 justify-start gap-2 px-2 text-left h-auto py-1.5 min-w-0 pr-8",
          isActive ? "hover:bg-sidebar-accent" : "hover:bg-accent")}
        onClick={onSelect}>
        <MessageCircleDashedIcon className="size-4 shrink-0" />
        <span className="text-sm truncate min-w-0">{chat.title}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon-sm"
            className="absolute right-1 size-7 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100 transition-opacity">
            <MoreVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" side="right" align="start">
          <DropdownMenuItem className="gap-2"><Share2Icon className="size-4 text-muted-foreground" />Share</DropdownMenuItem>
          <DropdownMenuItem className="gap-2"><PencilIcon className="size-4 text-muted-foreground" />Rename</DropdownMenuItem>
          {onArchive && (
            <DropdownMenuItem className="gap-2" onClick={onArchive}>
              <ArchiveIcon className="size-4 text-muted-foreground" />Archive
            </DropdownMenuItem>
          )}
          {onUnarchive && (
            <DropdownMenuItem className="gap-2" onClick={onUnarchive}>
              <ArchiveRestoreIcon className="size-4 text-muted-foreground" />Unarchive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" className="gap-2" onClick={onDelete}>
            <Trash2Icon className="size-4" />Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
