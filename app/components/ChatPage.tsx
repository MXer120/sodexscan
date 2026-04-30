"use client";

import { ChatMain } from "@/app/components/chat/chat-main";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { GridPattern } from "@/app/components/ui/grid-pattern";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="hidden md:flex absolute top-4 right-4 gap-2 z-20">
        <ThemeToggle />
      </div>

      <div className="flex md:hidden items-center justify-end border-b border-border px-4 h-14 bg-background z-20">
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <GridPattern className="pointer-events-none" />
        <div className="relative z-10 h-full">
          <ChatMain />
        </div>
      </div>
    </div>
  );
}
