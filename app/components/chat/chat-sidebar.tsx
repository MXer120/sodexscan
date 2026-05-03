"use client";

import { useState } from "react";
import {
  MessageCircleDashedIcon, BookOpenIcon, WrenchIcon,
  HomeIcon, SparklesIcon,
  ChevronDownIcon, CheckIcon, MoreVerticalIcon,
  Share2Icon, PencilIcon, ArchiveIcon, ArchiveRestoreIcon, Trash2Icon,
  WandSparklesIcon,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Separator } from "@/app/components/ui/separator";
import { Logo } from "@/app/components/ui/logo";
import { useChatStore } from "@/app/store/chat-store";
import { cn } from "@/app/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";
import Link from "next/link";

export type AIView = "chat" | "kb" | "tools";

interface Props {
  currentView: AIView;
  onViewChange: (view: AIView) => void;
  toolCategory?: string;
  onToolCategoryChange?: (cat: string) => void;
  toolCategories?: { name: string; count: number }[];
}

const teams = [
  { id: "personal", name: "Personal", icon: HomeIcon },
  { id: "work",     name: "Work Team", icon: SparklesIcon },
];

export function ChatSidebar({
  currentView, onViewChange,
  toolCategory = "all", onToolCategoryChange, toolCategories = [],
}: Props) {
  const [selectedTeam, setSelectedTeam] = useState("personal");
  const { chats, selectedChatId, selectChat, archiveChat, unarchiveChat, deleteChat } = useChatStore();

  const recentChats   = chats.filter(c => !c.isArchived);
  const archivedChats = chats.filter(c => c.isArchived);

  const navItems = [
    { id: "chat"  as AIView, icon: MessageCircleDashedIcon, label: "Chat" },
    { id: "kb"    as AIView, icon: BookOpenIcon,            label: "Knowledge Base" },
    { id: "tools" as AIView, icon: WrenchIcon,              label: "Tools" },
  ];

  return (
    <div className="flex h-full w-full flex-col bg-sidebar border-r border-sidebar-border">

      {/* Header — team selector */}
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
          <Input placeholder="Search anything" className="pl-9 pr-10 h-[34px] bg-muted/50" />
          <div className="absolute right-2 flex items-center justify-center size-5 rounded bg-muted text-xs text-muted-foreground">/</div>
        </div>
      </div>

      {/* Nav items */}
      <div className="px-3 pb-2 space-y-0.5">
        {navItems.map(({ id, icon: Icon, label }) => (
          <Button
            key={id}
            variant={currentView === id ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-2 px-2",
              currentView === id && "bg-accent"
            )}
            onClick={() => onViewChange(id)}
          >
            <Icon className="size-4" />
            <span className="text-sm">{label}</span>
          </Button>
        ))}
      </div>

      <Separator />

      {/* Context-aware list: tool categories or chat history */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {currentView === "tools" ? (
          <div className="p-3 space-y-0.5">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Categories
            </p>
            {/* All categories button */}
            <button
              onClick={() => onToolCategoryChange?.("all")}
              className={cn(
                "w-full text-left rounded-lg px-3 py-2 hover:bg-accent transition-colors",
                toolCategory === "all" && "bg-accent"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">All categories</span>
                <span className="text-xs text-muted-foreground">
                  {toolCategories.reduce((s, c) => s + c.count, 0)}
                </span>
              </div>
            </button>
            {toolCategories.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">Loading…</p>
            )}
            {toolCategories.map(cat => (
              <button
                key={cat.name}
                onClick={() => onToolCategoryChange?.(cat.name)}
                className={cn(
                  "w-full text-left rounded-lg px-3 py-2 hover:bg-accent transition-colors",
                  toolCategory === cat.name && "bg-accent"
                )}
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

      {/* Footer promo */}
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
          <Button size="sm"
            className="relative w-fit h-[30px] px-3 overflow-hidden bg-white text-black hover:bg-white/90 shadow-[0px_1px_2px_0px_rgba(8,8,8,0.2),inset_0px_1px_1px_0px_rgba(255,255,255,0.2)]"
            asChild>
            <Link href="https://www.communityscan-sodex.com" target="_blank" rel="noopener noreferrer">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(205,175,250,1),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(164,252,245,1),transparent_50%)]" />
              <span className="relative z-10 font-medium text-xs">communityscan-sodex.com</span>
            </Link>
          </Button>
        </div>
      </div>
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
