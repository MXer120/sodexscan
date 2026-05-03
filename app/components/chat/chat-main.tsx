"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "ai/react";
import { ChatWelcomeScreen } from "./chat-welcome-screen";
import { ChatConversationView } from "./chat-conversation-view";
import { useSessionContext } from "@/app/lib/SessionContext";
import { useChatStore } from "@/app/store/chat-store";

const MAX_CONTEXT = 10;

function toDisplay(messages: ReturnType<typeof useChat>["messages"]) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      content: m.content,
      sender: (m.role === "user" ? "user" : "ai") as "user" | "ai",
      timestamp: new Date(),
    }));
}

function generateChatId(): string {
  return crypto.randomUUID();
}

function useDebounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (...args: T) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), ms);
  };
}

export function ChatMain() {
  const { user, session } = useSessionContext();
  const [selectedModel, setSelectedModel] = useState("communityscan");
  const [includeFullHistory, setIncludeFullHistory] = useState(false);
  const [usePersonalKB, setUsePersonalKB] = useState(false);
  const [chatId, setChatId] = useState<string>(() => generateChatId());

  const setChats = useChatStore((s) => s.setChats);
  const selectChat = useChatStore((s) => s.selectChat);
  const selectedChatId = useChatStore((s) => s.selectedChatId);

  const { messages, input, setInput, setMessages, append, isLoading, error } = useChat({
    api: "/api/chat",
    id: chatId,
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {},
    body: { modelId: selectedModel, includeFullHistory, usePersonalKB },
  });

  // ── Load chat list from history API on mount ──────────────────────────────
  useEffect(() => {
    if (!session?.access_token) return;
    fetch("/api/chat/history", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { id: string; title: string; model: string; updated_at: string }[]) => {
        if (!Array.isArray(data)) return;
        setChats(
          data.map((c) => ({
            id: c.id,
            title: c.title || "Conversation",
            icon: "message-circle-dashed" as const,
            messages: [],
            createdAt: new Date(c.updated_at),
            updatedAt: new Date(c.updated_at),
            isArchived: false,
          }))
        );
      })
      .catch(() => {});
  }, [session?.access_token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load messages when a past chat is selected from the sidebar ───────────
  useEffect(() => {
    if (!selectedChatId || !session?.access_token) return;
    if (selectedChatId === chatId) return; // already viewing this chat

    fetch(`/api/chat/history?id=${selectedChatId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { messages?: ReturnType<typeof useChat>["messages"]; model?: string } | null) => {
        if (!data?.messages?.length) return;
        setChatId(selectedChatId);
        setMessages(data.messages);
        if (data.model) setSelectedModel(data.model);
        setIncludeFullHistory(false);
      })
      .catch(() => {});
  }, [selectedChatId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save conversation after each AI response ──────────────────────────────
  const saveConversation = useDebounce(
    async (msgs: typeof messages, model: string, id: string) => {
      if (!user || !session?.access_token || msgs.length < 2) return;
      try {
        await fetch("/api/chat/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ id, messages: msgs, model }),
        });
      } catch { /* non-critical */ }
    },
    1000
  );

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && !isLoading) {
      saveConversation(messages, selectedModel, chatId);
    }
  }, [messages, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const isConversationStarted = messages.length > 0;
  const displayMessages = toDisplay(messages);
  const contextLimitActive = messages.length > MAX_CONTEXT && !includeFullHistory;

  const lastMessage = messages[messages.length - 1];
  const awaitingFirstToken = isLoading && lastMessage?.role === "user";

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    append({ role: "user", content: input });
    setInput("");
  };

  const handleSendMessage = (content: string) => {
    if (!content.trim() || isLoading) return;
    append({ role: "user", content });
    setInput("");
  };

  const handleReset = () => {
    const newId = generateChatId();
    setChatId(newId);
    setMessages([]);
    setInput("");
    // Deselect in sidebar so clicking the same old chat reloads it
    selectChat("");
  };

  if (isConversationStarted) {
    return (
      <ChatConversationView
        messages={displayMessages}
        totalMessages={messages.length}
        message={input}
        onMessageChange={setInput}
        onSend={handleSendMessage}
        onReset={handleReset}
        isLoading={awaitingFirstToken}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        usePersonalKB={usePersonalKB}
        onPersonalKBChange={setUsePersonalKB}
        error={error?.message}
        contextLimitActive={contextLimitActive}
        onExpandContext={() => setIncludeFullHistory(true)}
      />
    );
  }

  return (
    <ChatWelcomeScreen
      message={input}
      onMessageChange={setInput}
      onSend={handleSend}
      selectedMode="fast"
      onModeChange={() => {}}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      usePersonalKB={usePersonalKB}
      onPersonalKBChange={setUsePersonalKB}
    />
  );
}
