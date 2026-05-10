"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChatMain } from "@/app/components/chat/chat-main";
import { ChatSidebar, type AIView } from "@/app/components/chat/chat-sidebar";
import { SidebarKB } from "@/app/components/chat/sidebar-kb";
import { GridPattern } from "@/app/components/ui/grid-pattern";
import ToolsPage from "@/app/components/tools/ToolsPage";
import Link from "next/link";
import { PanelLeftIcon, PlusIcon, ZapIcon, CalendarClockIcon, FlaskConicalIcon, CheckIcon, ChevronDownIcon } from "lucide-react";
import { AI_MODELS } from "@/app/components/chat/chat-input-box";
import { AiLogo } from "@/app/components/ui/ai-logo";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";

export default function AIPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize view from URL param (supports /ai?view=tools redirect from /tools)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatKey, setChatKey] = useState(0);
  const [view, setView] = useState<AIView>(() => {
    const v = searchParams.get("view");
    return (v === "chat" || v === "kb" || v === "tools" || v === "schedule") ? v : "chat";
  });

  const [toolCategory, setToolCategory] = useState<string>("all");
  const [toolCategories, setToolCategories] = useState<{ name: string; count: number }[]>([]);

  const handleCategoriesLoaded = useCallback(
    (cats: { name: string; count: number }[]) => setToolCategories(cats),
    []
  );

  // Tool routing within /ai — keeps view=tools in the URL
  const handleOpenTool = useCallback((id: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("view", "tools");
    sp.set("tool", id);
    router.replace(`/ai?${sp.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleCloseTool = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("tool");
    router.replace(`/ai?${sp.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* Sidebar */}
      <div className={cn(
        "shrink-0 border-r border-border transition-all duration-200 overflow-hidden",
        sidebarOpen ? "w-64" : "w-0"
      )}>
        {sidebarOpen && (
          <ChatSidebar
            currentView={view}
            onViewChange={(v) => {
              if (v === "chat") setChatKey(k => k + 1); // always open a fresh chat
              setView(v);
              if (v !== "tools") setToolCategory("all");
              const sp = new URLSearchParams(searchParams.toString());
              sp.set("view", v);
              sp.delete("tool");
              router.replace(`/ai?${sp.toString()}`, { scroll: false });
            }}
            toolCategory={toolCategory}
            onToolCategoryChange={setToolCategory}
            toolCategories={toolCategories}
          />
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <GridPattern className="pointer-events-none" />

        <div className="absolute top-3 left-3 z-20">
          <Button variant="ghost" size="icon-sm" className="size-7 rounded-md"
            onClick={() => setSidebarOpen(v => !v)}>
            <PanelLeftIcon className="size-4" />
          </Button>
        </div>

        <div className="relative z-10 h-full">
          {view === "chat"  && <ChatMain key={chatKey} />}
          {view === "kb"    && <KBMainView />}
          {view === "tools" && (
            <div className="h-full overflow-y-auto">
              <ToolsPage
                categoryFilter={toolCategory}
                onCategoriesLoaded={handleCategoriesLoaded}
                basePath="/ai"
                extraParams={{ view: "tools" }}
                onOpenTool={handleOpenTool}
                onCloseTool={handleCloseTool}
              />
            </div>
          )}
          {view === "schedule" && <ScheduleMainView />}
        </div>
      </div>
    </div>
  );
}

// ── Inline brand icons (lucide has no Telegram/Discord) ──────────────────────
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.67l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.983.889z"/>
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function ScheduleMainView() {
  const [showForm, setShowForm] = useState(false);
  const [prompt,   setPrompt]  = useState("");
  const [date,     setDate]    = useState("");
  const [time,     setTime]    = useState("");
  const [repeat,   setRepeat]  = useState("none");
  const [days,     setDays]    = useState<string[]>([]);
  const [model,    setModel]   = useState("communityscan");

  const currentModel  = AI_MODELS.find(m => m.id === model) ?? AI_MODELS[0];
  const csModels      = AI_MODELS.filter(m => m.provider === "communityscan");
  const groqModels    = AI_MODELS.filter(m => m.provider === "groq");
  const googleModels  = AI_MODELS.filter(m => m.provider === "google");
  const [telegram, setTelegram] = useState(false);
  const [discord,  setDiscord]  = useState(false);

  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const REPEAT_OPTS = [
    { val: "none",   label: "Once"   },
    { val: "daily",  label: "Daily"  },
    { val: "weekly", label: "Weekly" },
    { val: "custom", label: "Custom" },
  ];

  const handleSave = () => {
    toast.info("Scheduled prompts — coming soon", {
      description: "This feature is currently in development.",
      position: "top-right",
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* Preview banner */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3.5">
          <FlaskConicalIcon className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-amber-500">Preview — Scheduled prompts are not yet active</p>
            <p className="text-xs text-muted-foreground">
              You can configure schedules now, but they will not run until this feature officially launches.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Scheduled Prompts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automate AI queries to run at specific times or on a recurring schedule.
            </p>
          </div>
          <Button onClick={() => setShowForm(v => !v)} className="shrink-0">
            <PlusIcon className="size-4 mr-2" />
            New Schedule
          </Button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="rounded-xl border bg-card p-5 space-y-5 shadow-sm">
            <h2 className="text-sm font-semibold">New Scheduled Prompt</h2>

            {/* Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prompt</label>
              <textarea
                className="w-full h-24 rounded-lg border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="What should the AI do? e.g. Summarise today's BTC ETF flows and top wallet movers"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</label>
                <input type="date"
                  className="w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Time <span className="normal-case text-[10px] font-normal bg-muted px-1.5 py-0.5 rounded ml-0.5">UTC</span>
                </label>
                <input type="time"
                  className="w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>

            {/* Repeat */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Repeat</label>
              <div className="flex gap-2 flex-wrap">
                {REPEAT_OPTS.map(({ val, label }) => (
                  <button key={val} onClick={() => { setRepeat(val); setDays([]); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      repeat === val
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {repeat === "custom" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Days</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS.map(d => (
                    <button key={d}
                      onClick={() => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        days.includes(d)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      )}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Model */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Model</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full h-9 rounded-lg border bg-background px-3 text-sm flex items-center gap-2 hover:bg-muted/40 transition-colors focus:outline-none focus:ring-2 focus:ring-ring text-left">
                    <AiLogo className="size-4 shrink-0 mt-0" />
                    <span className="flex-1 truncate">{currentModel.label}</span>
                    {currentModel.description && (
                      <span className="text-[11px] text-muted-foreground shrink-0">{currentModel.description}</span>
                    )}
                    <ChevronDownIcon className="size-3.5 text-muted-foreground shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72" align="start">
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">CommunityScan</DropdownMenuLabel>
                  {csModels.map(m => (
                    <DropdownMenuItem key={m.id} onSelect={() => setModel(m.id)} className="flex items-center gap-2 cursor-pointer">
                      <AiLogo className="size-4 mt-0 shrink-0" />
                      <span className="flex-1 text-sm">{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.description}</span>
                      {model === m.id && <CheckIcon className="size-3.5 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Groq</DropdownMenuLabel>
                  {groqModels.map(m => (
                    <DropdownMenuItem key={m.id} onSelect={() => setModel(m.id)} className="flex items-center gap-2 cursor-pointer">
                      <span className="flex-1 text-sm">{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.description}</span>
                      {model === m.id && <CheckIcon className="size-3.5 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Google Gemini</DropdownMenuLabel>
                  {googleModels.map(m => (
                    <DropdownMenuItem key={m.id} onSelect={() => setModel(m.id)} className="flex items-center gap-2 cursor-pointer">
                      <span className="flex-1 text-sm">{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.description}</span>
                      {model === m.id && <CheckIcon className="size-3.5 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Delivery */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Deliver response to
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setTelegram(v => !v)}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
                    telegram
                      ? "border-[#229ED9]/60 bg-[#229ED9]/10 text-[#229ED9]"
                      : "border-transparent bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                >
                  <TelegramIcon />
                  Send to Telegram
                  {telegram && <CheckIcon className="size-3 ml-0.5" />}
                </button>
                <button
                  onClick={() => setDiscord(v => !v)}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
                    discord
                      ? "border-[#5865F2]/60 bg-[#5865F2]/10 text-[#5865F2]"
                      : "border-transparent bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                >
                  <DiscordIcon />
                  Send to Discord
                  {discord && <CheckIcon className="size-3 ml-0.5" />}
                </button>
              </div>
              {(telegram || discord) && (
                <p className="text-[11px] text-muted-foreground px-0.5">
                  Connect your {[telegram && "Telegram", discord && "Discord"].filter(Boolean).join(" and ")} in{" "}
                  <Link href="/profile" className="text-primary hover:underline">Profile → Alerts</Link> to receive responses.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} className="flex-1">Schedule</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <ZapIcon className="size-3 text-muted-foreground shrink-0" />
              <Link href="/workflow" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Configure with Workflow for advanced automation →
              </Link>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!showForm && (
          <div className="rounded-xl border bg-card/50 flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
              <CalendarClockIcon className="size-7 text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold">No scheduled prompts yet</h3>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Create recurring AI queries that run automatically — daily ETF summaries, weekly leaderboard reports, and more.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <PlusIcon className="size-3.5 mr-1.5" />
              Create first schedule
            </Button>
          </div>
        )}

        {/* Workflow CTA */}
        <div className="flex items-start gap-3 rounded-xl border bg-muted/30 px-4 py-4">
          <ZapIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-medium">Connect to Workflow for advanced automation</p>
            <p className="text-xs text-muted-foreground">
              Build multi-step automations, conditional logic, and webhook integrations in the{" "}
              <Link href="/workflow" className="text-primary hover:underline">Workflow Builder →</Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function KBMainView() {
  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto px-4 py-8 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse shared platform knowledge or manage your personal notes.
          Suggest edits to the shared KB — changes are reviewed before going live.
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border bg-card/50">
        <SidebarKB />
      </div>
    </div>
  );
}
