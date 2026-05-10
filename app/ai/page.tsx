"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChatMain } from "@/app/components/chat/chat-main";
import { ChatSidebar, type AIView } from "@/app/components/chat/chat-sidebar";
import { SidebarKB } from "@/app/components/chat/sidebar-kb";
import { GridPattern } from "@/app/components/ui/grid-pattern";
import ToolsPage from "@/app/components/tools/ToolsPage";
import Link from "next/link";
import { PanelLeftIcon, PlusIcon, ZapIcon, CalendarClockIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";

export default function AIPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize view from URL param (supports /ai?view=tools redirect from /tools)
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
              setView(v);
              if (v !== "tools") setToolCategory("all");
              // Keep URL in sync
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
          {view === "chat"  && <ChatMain />}
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

function ScheduleMainView() {
  const [showForm, setShowForm] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [date, setDate]       = useState("");
  const [time, setTime]       = useState("");
  const [repeat, setRepeat]   = useState("none");
  const [days, setDays]       = useState<string[]>([]);

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
          <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-semibold">New Scheduled Prompt</h2>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prompt</label>
              <textarea
                className="w-full h-24 rounded-lg border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="What should the AI do? e.g. Summarise today's BTC ETF flows and top wallet movers"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</label>
                <input type="date"
                  className="w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</label>
                <input type="time"
                  className="w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>

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
