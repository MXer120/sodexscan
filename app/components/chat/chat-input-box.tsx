"use client";

import { useRef } from "react";
import {
  PaperclipIcon,
  CircleDashedIcon,
  BrainIcon,
  BookOpenIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowUpIcon,
  ImageIcon,
  FileTextIcon,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { AiLogo } from "@/app/components/ui/ai-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/app/components/ui/dropdown-menu";
import { cn } from "@/app/lib/utils";
import { toast } from "sonner";

export type ModelProvider = "communityscan" | "google" | "groq";

export interface AiModel {
  id: string;
  label: string;
  provider: ModelProvider;
  description: string;
}

export const AI_MODELS: AiModel[] = [
  { id: "communityscan",                            label: "CommunityScan",       provider: "communityscan", description: "Default" },
  { id: "llama-3.3-70b-versatile",                  label: "Llama 3.3 70B",       provider: "groq",          description: "Fast" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct",label: "Llama 4 Scout",        provider: "groq",          description: "New" },
  { id: "qwen/qwen3-32b",                           label: "Qwen 3 32B",           provider: "groq",          description: "Reasoning" },
  { id: "openai/gpt-oss-20b",                       label: "GPT OSS 20B",          provider: "groq",          description: "Efficient" },
  { id: "llama-3.1-8b-instant",                     label: "Llama 3.1 8B",         provider: "groq",          description: "Ultra fast" },
  { id: "gemini-2.5-flash",                         label: "Gemini 2.5 Flash",     provider: "google",        description: "Best free" },
  { id: "gemini-2.5-pro",                           label: "Gemini 2.5 Pro",       provider: "google",        description: "Most capable" },
  { id: "gemini-2.0-flash",                         label: "Gemini 2.0 Flash",     provider: "google",        description: "Fast · free" },
  { id: "gemini-2.0-flash-lite",                    label: "Gemini 2.0 Flash Lite",provider: "google",        description: "Lightweight" },
];

interface ChatInputBoxProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  usePersonalKB?: boolean;
  onPersonalKBChange?: (v: boolean) => void;
  showTools?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onFileSelect?: (file: File, type: "image" | "file") => void;
  queue?: string[];
  onQueueRemove?: (index: number) => void;
}

export function ChatInputBox({
  message, onMessageChange, onSend, selectedModel, onModelChange,
  usePersonalKB = false, onPersonalKBChange,
  showTools = true, placeholder = "Ask anything...", disabled = false, onFileSelect,
  queue, onQueueRemove,
}: ChatInputBoxProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentModel = AI_MODELS.find((m) => m.id === selectedModel) ?? AI_MODELS[0];
  const csModel     = AI_MODELS.filter((m) => m.provider === "communityscan");
  const groqModels  = AI_MODELS.filter((m) => m.provider === "groq");
  const googleModels = AI_MODELS.filter((m) => m.provider === "google");

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onFileSelect) {
      onFileSelect(file, type);
    } else {
      toast.success(`${type === "image" ? "Image" : "File"} "${file.name}" attached`);
    }
    e.target.value = "";
  };

  return (
    <div className="rounded-2xl border border-border bg-secondary dark:bg-card p-1">
      <div className="rounded-xl border border-border dark:border-transparent bg-card dark:bg-secondary">
        <Textarea
          placeholder={placeholder}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          disabled={disabled}
          className="min-h-[120px] resize-none border-0 bg-transparent px-4 py-3 text-base placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
          onKeyDown={(e) => {
            if (e.key === "Escape" && queue && queue.length > 0) {
              e.preventDefault();
              onQueueRemove?.(queue.length - 1);
              return;
            }
            if (e.key === "ArrowUp" && !message && queue && queue.length > 0) {
              e.preventDefault();
              onMessageChange(queue[queue.length - 1]);
              onQueueRemove?.(queue.length - 1);
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (message.trim() && !disabled) onSend();
            }
          }}
        />

        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
          {/* Left: upload + tools */}
          <div className="flex items-center gap-1.5">
            {/* Upload dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 rounded-full border border-border dark:border-input text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <PaperclipIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-44">
                <DropdownMenuItem
                  onSelect={() => setTimeout(() => imageInputRef.current?.click(), 0)}
                  className="gap-2 cursor-pointer"
                >
                  <ImageIcon className="size-4" />
                  Upload Image
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setTimeout(() => fileInputRef.current?.click(), 0)}
                  className="gap-2 cursor-pointer"
                >
                  <FileTextIcon className="size-4" />
                  Upload File
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChosen(e, "image")}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,.txt,.json"
              className="hidden"
              onChange={(e) => handleFileChosen(e, "file")}
            />

            {showTools && (
              <>
                {/* Deep Search — coming soon */}
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-sm font-medium border border-border dark:border-input bg-card dark:bg-secondary text-muted-foreground/50 cursor-not-allowed"
                >
                  <CircleDashedIcon className="size-3.5" />
                  <span className="hidden sm:inline whitespace-nowrap">Deep Search</span>
                  <span className="hidden sm:inline text-[10px] opacity-60">soon</span>
                </button>

                {/* My KB toggle */}
                {onPersonalKBChange && (
                  <button
                    type="button"
                    onClick={() => onPersonalKBChange(!usePersonalKB)}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-sm font-medium border transition-colors",
                      usePersonalKB
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15"
                        : "border-border dark:border-input bg-card dark:bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    title={usePersonalKB ? "Using your personal KB" : "Using shared KB"}
                  >
                    <BookOpenIcon className="size-3.5" />
                    <span className="hidden sm:inline">{usePersonalKB ? "My KB" : "Shared KB"}</span>
                  </button>
                )}

                {/* Think — coming soon */}
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-sm font-medium border border-border dark:border-input bg-card dark:bg-secondary text-muted-foreground/50 cursor-not-allowed"
                >
                  <BrainIcon className="size-3.5" />
                  <span className="hidden sm:inline whitespace-nowrap">Think</span>
                  <span className="hidden sm:inline text-[10px] opacity-60">soon</span>
                </button>
              </>
            )}
          </div>

          {/* Right: model selector + send */}
          <div className="flex items-center gap-2">
            {showTools && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors outline-none"
                  >
                    <AiLogo className="size-5 mt-0 shrink-0" />
                    <span className="hidden sm:inline max-w-[140px] truncate">
                      {currentModel.label}
                    </span>
                    <ChevronDownIcon className="size-3.5 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {/* CommunityScan */}
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">CommunityScan</DropdownMenuLabel>
                  {csModel.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onSelect={() => onModelChange(model.id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="flex-1 text-sm">{model.label}</span>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Default</span>
                      {selectedModel === model.id && <CheckIcon className="size-3.5 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  {/* Groq */}
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Groq</DropdownMenuLabel>
                  {groqModels.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onSelect={() => onModelChange(model.id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="flex-1 text-sm">{model.label}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                      {selectedModel === model.id && <CheckIcon className="size-3.5 ml-1 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  {/* Google */}
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Google Gemini</DropdownMenuLabel>
                  {googleModels.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onSelect={() => onModelChange(model.id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="flex-1 text-sm">{model.label}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                      {selectedModel === model.id && <CheckIcon className="size-3.5 ml-1 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              size="icon-sm"
              onClick={onSend}
              disabled={!message.trim() || disabled}
              className="size-7 rounded-full"
            >
              <ArrowUpIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
