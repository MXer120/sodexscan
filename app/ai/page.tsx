"use client";

import { useState, useCallback } from "react";
import { ChatMain } from "@/app/components/chat/chat-main";
import { ChatSidebar, type AIView } from "@/app/components/chat/chat-sidebar";
import { SidebarKB } from "@/app/components/chat/sidebar-kb";
import { GridPattern } from "@/app/components/ui/grid-pattern";
import ToolsPage from "@/app/components/tools/ToolsPage";
import { PanelLeftIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";

export default function AIPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState<AIView>("chat");

  // Tool category state — shared between sidebar and ToolsPage
  const [toolCategory, setToolCategory] = useState<string>("all");
  const [toolCategories, setToolCategories] = useState<{ name: string; count: number }[]>([]);

  const handleCategoriesLoaded = useCallback(
    (cats: { name: string; count: number }[]) => setToolCategories(cats),
    []
  );

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
            onViewChange={(v) => { setView(v); if (v !== "tools") setToolCategory("all"); }}
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
              />
            </div>
          )}
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
