"use client";

import { useCallback, useEffect, useState } from "react";
import { useSessionContext } from "@/app/lib/SessionContext";
import {
  PlusIcon, CheckIcon, XIcon, ChevronDownIcon, ChevronRightIcon,
  SendIcon, PencilIcon, Trash2Icon, ClockIcon, FolderPlusIcon,
  TagIcon, RotateCcwIcon, ShieldIcon, BookOpenIcon, WrenchIcon,
  ExternalLinkIcon, FlaskConicalIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/app/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
interface KBChunk   { id: string; source_id: string; doc_type: string; title: string | null; content: string; tags: string[] }
interface UserEntry { id: string; source_id: string | null; category: string; title: string; content: string; tags: string[]; created_at: string }
interface ToolRow   { id: string; namespace: string; description: string; example: string | null }
interface Submission { id: string; title: string | null; content: string; status: "pending"|"approved"|"denied"; reviewer_note: string | null; created_at: string; user_id: string }

interface MergedEntry {
  sharedId: string; source_id: string; doc_type: string;
  sharedTitle: string; sharedContent: string; sharedTags: string[];
  override: UserEntry | null;
}

const DOC_LABEL: Record<string, string> = {
  doc: "Docs", faq: "FAQ", glossary: "Glossary", announcement: "Announcements", spec: "Specs",
};

type Tab = "system" | "knowledge" | "tools" | "mine" | "review";

// ── Component ────────────────────────────────────────────────────────────────
export function SidebarKB() {
  const { session, isOwner, isMod } = useSessionContext();
  const isAdmin = isOwner || isMod;
  const token   = session?.access_token;
  const authH   = { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" };

  const [tab, setTab] = useState<Tab>("system");

  // ── System prompt ──────────────────────────────────────────────────────────
  const [systemPrompt, setSystemPrompt]       = useState("");
  const [systemPromptDraft, setSystemPromptDraft] = useState("");
  const [editingSystem, setEditingSystem]     = useState(false);
  const [systemUpdatedAt, setSystemUpdatedAt] = useState<string | null>(null);

  // ── Knowledge base ─────────────────────────────────────────────────────────
  const [chunks,    setChunks]   = useState<KBChunk[]>([]);
  const [overrides, setOverrides] = useState<UserEntry[]>([]);
  const [personalOwn, setPersonalOwn] = useState<UserEntry[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // ── Tools ──────────────────────────────────────────────────────────────────
  const [tools, setTools] = useState<ToolRow[]>([]);

  const [loading, setSaving_] = useState(false); // reused for any async op
  const [saving,  setSaving]  = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  // Edit states
  const [editingMerged, setEditingMerged] = useState<MergedEntry | null>(null);
  const [editingOwn, setEditingOwn]       = useState<UserEntry | "new" | null>(null);
  const [draftTitle, setDraftTitle]       = useState("");
  const [draftContent, setDraftContent]   = useState("");
  const [draftCategory, setDraftCategory] = useState("");
  const [draftTags, setDraftTags]         = useState("");

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // System prompt
    fetch("/api/ai-config?key=system_prompt")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setSystemPrompt(d.value); setSystemUpdatedAt(d.updated_at); } });
    // KB chunks
    fetch("/api/kb").then(r => r.ok ? r.json() : []).then(setChunks);
    // Tools
    fetch("/api/ai-config").then(() => {}); // warmup
    if (token) {
      fetch("/api/kb/personal", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then((d: UserEntry[]) => {
          setOverrides(d.filter(e => e.source_id));
          setPersonalOwn(d.filter(e => !e.source_id));
        });
    }
  }, [token]);

  useEffect(() => {
    supabaseAdmin_tools();
  }, []);

  async function supabaseAdmin_tools() {
    fetch("/api/ai-tools").then(r => r.ok ? r.json() : []).then(setTools).catch(() => {});
  }

  const loadSubmissions = useCallback(() => {
    if (!token) return;
    fetch("/api/kb/submissions", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(setSubmissions).catch(() => {});
  }, [token]);

  useEffect(() => { if (tab === "review" || tab === "mine") loadSubmissions(); }, [tab, loadSubmissions]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const overrideMap = Object.fromEntries(overrides.map(o => [o.source_id!, o]));
  const merged: MergedEntry[] = chunks.map(c => ({
    sharedId: c.id, source_id: c.source_id, doc_type: c.doc_type,
    sharedTitle: c.title ?? c.source_id, sharedContent: c.content, sharedTags: c.tags,
    override: overrideMap[c.source_id] ?? null,
  }));
  const kbGrouped = merged.reduce<Record<string, MergedEntry[]>>((acc, m) => {
    (acc[m.doc_type] = acc[m.doc_type] ?? []).push(m); return acc;
  }, {});
  const toolsByNS = tools.reduce<Record<string, ToolRow[]>>((acc, t) => {
    (acc[t.namespace] = acc[t.namespace] ?? []).push(t); return acc;
  }, {});
  const personalGrouped = personalOwn.reduce<Record<string, UserEntry[]>>((acc, e) => {
    (acc[e.category] = acc[e.category] ?? []).push(e); return acc;
  }, {});
  const pending = submissions.filter(s => s.status === "pending");
  const mySubs  = submissions.filter(s => !isAdmin);

  // ── System prompt save ─────────────────────────────────────────────────────
  async function saveSystemPrompt() {
    setSaving(true);
    try {
      const res = await fetch("/api/ai-config", {
        method: "PATCH", headers: authH,
        body: JSON.stringify({ key: "system_prompt", value: systemPromptDraft }),
      });
      if (res.ok) { const d = await res.json(); setSystemPrompt(d.value); setSystemUpdatedAt(d.updated_at); setEditingSystem(false); }
    } finally { setSaving(false); }
  }

  // ── KB overrides ───────────────────────────────────────────────────────────
  function startEditMerged(m: MergedEntry) {
    setEditingMerged(m);
    setDraftTitle(m.override?.title ?? m.sharedTitle);
    setDraftContent(m.override?.content ?? m.sharedContent);
    setDraftTags((m.override?.tags ?? m.sharedTags).join(", "));
    setDraftCategory(m.doc_type);
  }

  async function saveMergedEdit() {
    if (!editingMerged) return;
    setSaving(true);
    const tags = draftTags.split(",").map(t=>t.trim()).filter(Boolean);
    try {
      if (editingMerged.override) {
        const res = await fetch("/api/kb/personal", {
          method: "PATCH", headers: authH,
          body: JSON.stringify({ id: editingMerged.override.id, title: draftTitle, content: draftContent, tags, category: draftCategory }),
        });
        if (res.ok) { const d = await res.json(); setOverrides(prev => prev.map(o => o.id===d.id ? d : o)); }
      } else {
        const res = await fetch("/api/kb/personal", {
          method: "POST", headers: authH,
          body: JSON.stringify({ source_id: editingMerged.source_id, category: draftCategory, title: draftTitle, content: draftContent, tags }),
        });
        if (res.ok) { const d = await res.json(); setOverrides(prev => [d, ...prev]); }
      }
      setEditingMerged(null);
    } finally { setSaving(false); }
  }

  async function resetOverride(m: MergedEntry) {
    if (!m.override || !confirm("Reset to shared KB version?")) return;
    await fetch(`/api/kb/personal?id=${m.override.id}`, { method: "DELETE", headers: authH });
    setOverrides(prev => prev.filter(o => o.id !== m.override!.id));
  }

  // ── Personal own entries ───────────────────────────────────────────────────
  async function saveOwn() {
    const tags = draftTags.split(",").map(t=>t.trim()).filter(Boolean);
    setSaving(true);
    try {
      if (editingOwn === "new") {
        const res = await fetch("/api/kb/personal", {
          method: "POST", headers: authH,
          body: JSON.stringify({ category: draftCategory||"General", title: draftTitle, content: draftContent, tags }),
        });
        if (res.ok) { const d = await res.json(); setPersonalOwn(prev => [d, ...prev]); }
      } else if (editingOwn) {
        const res = await fetch("/api/kb/personal", {
          method: "PATCH", headers: authH,
          body: JSON.stringify({ id: editingOwn.id, category: draftCategory||"General", title: draftTitle, content: draftContent, tags }),
        });
        if (res.ok) { const d = await res.json(); setPersonalOwn(prev => prev.map(x=>x.id===d.id?d:x)); }
      }
      setEditingOwn(null);
    } finally { setSaving(false); }
  }

  async function deleteOwn(id: string) {
    if (!confirm("Delete?")) return;
    await fetch(`/api/kb/personal?id=${id}`, { method: "DELETE", headers: authH });
    setPersonalOwn(prev => prev.filter(e=>e.id!==id));
  }

  async function submitForReview(title: string, content: string, tags: string[], chunkId?: string, sourceId?: string) {
    setSaving(true);
    try {
      await fetch("/api/kb", {
        method: "POST", headers: authH,
        body: JSON.stringify({ chunk_id: chunkId, source_id: sourceId, title, content, tags }),
      });
      alert("Submitted for review!");
    } finally { setSaving(false); }
  }

  async function review(id: string, status: "approved"|"denied") {
    setSaving(true);
    try {
      await fetch("/api/kb/submissions", {
        method: "PATCH", headers: authH,
        body: JSON.stringify({ id, status, note: reviewNote }),
      });
      setSubmissions(prev => prev.map(s => s.id===id ? {...s, status} : s));
      setReviewNote("");
    } finally { setSaving(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "system",    label: "System",    icon: ShieldIcon    },
    { id: "knowledge", label: "Knowledge", icon: BookOpenIcon  },
    { id: "tools",     label: "Tools",     icon: WrenchIcon    },
    { id: "mine",      label: "Mine",      icon: TagIcon       },
    ...(isAdmin ? [{ id: "review" as Tab, label: pending.length ? `Review (${pending.length})` : "Review", icon: ClockIcon }] : []),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0 overflow-x-auto no-scrollbar">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); setEditingMerged(null); setEditingOwn(null); setEditingSystem(false); }}
            className={cn("flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-medium whitespace-nowrap transition-colors",
              tab === id ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Icon className="size-3" />{label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* ── SYSTEM PROMPT ──────────────────────────────────────────── */}
        {tab === "system" && !editingSystem && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <FlaskConicalIcon className="size-3 shrink-0 text-amber-500" />
              <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-tight">
                Quickly generated data for demonstration purposes.
              </p>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">System Prompt</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The base instructions injected at the start of every conversation.
                  {systemUpdatedAt && ` Last updated ${new Date(systemUpdatedAt).toLocaleDateString()}.`}
                </p>
              </div>
              {isAdmin && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"
                  onClick={() => { setSystemPromptDraft(systemPrompt); setEditingSystem(true); }}>
                  <PencilIcon className="size-3" /> Edit
                </Button>
              )}
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {systemPrompt || "Loading…"}
              </pre>
            </div>
            {!isAdmin && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Only admins can edit the system prompt.
              </p>
            )}
          </div>
        )}

        {tab === "system" && editingSystem && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setEditingSystem(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
              <p className="text-sm font-medium">Edit System Prompt</p>
            </div>
            <Textarea
              value={systemPromptDraft}
              onChange={e => setSystemPromptDraft(e.target.value)}
              className="min-h-[400px] text-xs font-mono resize-none"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingSystem(false)}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={saveSystemPrompt}
                disabled={saving || !systemPromptDraft.trim()}>
                <CheckIcon className="size-3.5" /> Save
              </Button>
            </div>
          </div>
        )}

        {/* ── KNOWLEDGE BASE ─────────────────────────────────────────── */}
        {tab === "knowledge" && !editingMerged && (
          <div className="p-4 space-y-6">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <FlaskConicalIcon className="size-3 shrink-0 text-amber-500" />
              <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-tight">
                Quickly generated data for demonstration purposes.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {chunks.length} entries · top 4 injected per request via semantic search.
              Your customizations override the shared versions for your sessions.
            </p>
            {Object.entries(kbGrouped).map(([type, items]) => (
              <div key={type}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {DOC_LABEL[type] ?? type}
                </h3>
                <div className="space-y-1.5">
                  {items.map(m => {
                    const title   = m.override?.title   ?? m.sharedTitle;
                    const content = m.override?.content ?? m.sharedContent;
                    const tags    = m.override?.tags    ?? m.sharedTags;
                    return (
                      <div key={m.sharedId} className="rounded-xl border border-border overflow-hidden">
                        <button onClick={() => setExpanded(expanded===m.sharedId ? null : m.sharedId)}
                          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-accent/50 transition-colors">
                          {expanded===m.sharedId ? <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground"/>
                                                 : <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground"/>}
                          <span className="text-sm font-medium flex-1">{title}</span>
                          {m.override && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">edited</span>}
                        </button>
                        {expanded===m.sharedId && (
                          <div className="px-4 pb-4 border-t border-border bg-muted/20 space-y-3">
                            <p className="text-sm text-muted-foreground leading-relaxed pt-3 whitespace-pre-wrap">{content}</p>
                            {tags.length > 0 && <div className="flex flex-wrap gap-1">{tags.map(t=><Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>}
                            {token && (
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => startEditMerged(m)}>
                                  <PencilIcon className="size-3" /> {m.override ? "Edit mine" : "Customize"}
                                </Button>
                                {m.override && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => resetOverride(m)}>
                                    <RotateCcwIcon className="size-3" /> Reset
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                  onClick={() => submitForReview(title, content, tags, m.sharedId, m.source_id)} disabled={saving}>
                                  <SendIcon className="size-3" /> Suggest to shared
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {chunks.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Knowledge base is empty.</p>}
          </div>
        )}

        {tab === "knowledge" && editingMerged && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setEditingMerged(null)} className="text-muted-foreground hover:text-foreground"><XIcon className="size-4"/></button>
              <p className="text-sm font-medium truncate">Customize: {editingMerged.sharedTitle}</p>
            </div>
            <Input value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} placeholder="Title" className="h-9 text-sm"/>
            <Textarea value={draftContent} onChange={e=>setDraftContent(e.target.value)} placeholder="Content…" className="min-h-[220px] text-sm resize-none"/>
            <Input value={draftTags} onChange={e=>setDraftTags(e.target.value)} placeholder="Tags (comma separated)" className="h-9 text-sm"/>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingMerged(null)}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={saveMergedEdit} disabled={saving || !draftContent.trim()}>
                <CheckIcon className="size-3.5"/> Save my version
              </Button>
            </div>
          </div>
        )}

        {/* ── TOOLS ──────────────────────────────────────────────────── */}
        {tab === "tools" && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Live Tool Calling</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tools.length > 0 ? `${tools.length} tools registered` : "Tools registered"} — the top 6 most relevant are automatically injected per request based on semantic similarity to your query.
              </p>
            </div>
            <Button asChild className="w-full gap-2" variant="outline">
              <Link href="/tools" target="_blank">
                <ExternalLinkIcon className="size-4" />
                View registered tools
              </Link>
            </Button>
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Namespaces</p>
              {Object.keys(toolsByNS).length === 0 && (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
              {Object.entries(toolsByNS).map(([ns, items]) => (
                <div key={ns} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-foreground">{ns}</span>
                  <span className="text-xs text-muted-foreground">{items.length} tools</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MINE ───────────────────────────────────────────────────── */}
        {tab === "mine" && !editingOwn && (
          <div className="p-4 space-y-4">
            {overrides.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <PencilIcon className="size-3"/> Modified KB entries ({overrides.length})
                </h3>
                {overrides.map(o => (
                  <div key={o.id} className="rounded-xl border border-primary/30 overflow-hidden bg-primary/5">
                    <button onClick={() => setExpanded(expanded===o.id ? null : o.id)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-accent/50 transition-colors">
                      {expanded===o.id ? <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground"/>
                                       : <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground"/>}
                      <span className="text-sm font-medium flex-1">{o.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">edited</span>
                    </button>
                    {expanded===o.id && (
                      <div className="px-4 pb-4 border-t border-border bg-muted/20 space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed pt-3 whitespace-pre-wrap">{o.content}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => { const m = merged.find(x=>x.source_id===o.source_id); if(m) { startEditMerged(m); setTab("knowledge"); } }}>
                            <PencilIcon className="size-3"/> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground"
                            onClick={() => { const m = merged.find(x=>x.source_id===o.source_id); if(m) resetOverride(m); }}>
                            <RotateCcwIcon className="size-3"/> Reset
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FolderPlusIcon className="size-3"/> Personal entries
              </h3>
              <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => {
                setEditingOwn("new"); setDraftTitle(""); setDraftContent(""); setDraftCategory(""); setDraftTags("");
              }}><PlusIcon className="size-3"/> Add</Button>
            </div>

            {Object.entries(personalGrouped).map(([cat, items]) => (
              <div key={cat} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><TagIcon className="size-3"/>{cat}</p>
                {items.map(e => (
                  <div key={e.id} className="rounded-xl border border-border overflow-hidden">
                    <button onClick={() => setExpanded(expanded===e.id ? null : e.id)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-accent/50 transition-colors">
                      {expanded===e.id ? <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground"/>
                                       : <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground"/>}
                      <span className="text-sm font-medium flex-1">{e.title}</span>
                    </button>
                    {expanded===e.id && (
                      <div className="px-4 pb-4 border-t border-border bg-muted/20 space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed pt-3 whitespace-pre-wrap">{e.content}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => { setEditingOwn(e); setDraftTitle(e.title); setDraftContent(e.content); setDraftCategory(e.category); setDraftTags(e.tags.join(", ")); }}>
                            <PencilIcon className="size-3"/> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => submitForReview(e.title, e.content, e.tags)} disabled={saving}>
                            <SendIcon className="size-3"/> Submit to shared
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs gap-1 ml-auto" onClick={() => deleteOwn(e.id)}>
                            <Trash2Icon className="size-3"/>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {personalOwn.length === 0 && overrides.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No personal customizations yet.</p>
            )}
            {mySubs.length > 0 && (
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ClockIcon className="size-3"/> Submitted for review
                </p>
                {mySubs.map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                      s.status==="pending"?"bg-yellow-500":s.status==="approved"?"bg-green-500":"bg-red-500")}/>
                    <span className="text-xs flex-1 truncate">{s.title ?? "Untitled"}</span>
                    <span className="text-xs text-muted-foreground capitalize">{s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "mine" && editingOwn && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setEditingOwn(null)} className="text-muted-foreground hover:text-foreground"><XIcon className="size-4"/></button>
              <p className="text-sm font-medium">{editingOwn==="new" ? "New entry" : `Edit: ${(editingOwn as UserEntry).title}`}</p>
            </div>
            <Input value={draftCategory} onChange={e=>setDraftCategory(e.target.value)} placeholder="Category" className="h-9 text-sm"/>
            <Input value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} placeholder="Title" className="h-9 text-sm"/>
            <Textarea value={draftContent} onChange={e=>setDraftContent(e.target.value)} placeholder="Content…" className="min-h-[200px] text-sm resize-none"/>
            <Input value={draftTags} onChange={e=>setDraftTags(e.target.value)} placeholder="Tags (comma separated)" className="h-9 text-sm"/>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingOwn(null)}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={saveOwn} disabled={saving || !draftTitle.trim() || !draftContent.trim()}>
                <CheckIcon className="size-3.5"/> Save
              </Button>
            </div>
          </div>
        )}

        {/* ── REVIEW ─────────────────────────────────────────────────── */}
        {tab === "review" && isAdmin && (
          <div className="p-4 space-y-3">
            {pending.length === 0 && (
              <div className="text-center py-10 space-y-2">
                <ClockIcon className="size-8 mx-auto text-muted-foreground opacity-40"/>
                <p className="text-sm text-muted-foreground">No pending submissions.</p>
              </div>
            )}
            {pending.map(s => (
              <div key={s.id} className="rounded-xl border border-border p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">{s.title ?? "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">{s.content}</p>
                </div>
                <Input placeholder="Optional note…" className="h-8 text-xs" value={reviewNote} onChange={e=>setReviewNote(e.target.value)}/>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => review(s.id, "approved")} disabled={saving}>
                    <CheckIcon className="size-3.5"/> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1 gap-1.5"
                    onClick={() => review(s.id, "denied")} disabled={saving}>
                    <XIcon className="size-3.5"/> Deny
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
