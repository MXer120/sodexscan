"use client";

import { ChatMain } from "@/app/components/chat/chat-main";
import { GridPattern } from "@/app/components/ui/grid-pattern";

export default function AIPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="flex-1 overflow-hidden relative">
        <GridPattern className="pointer-events-none" />
        <div className="relative z-10 h-full">
          <ChatMain />
        </div>
      </div>
    </div>
  );
}
