"use client";

import { useState } from "react";
import { Badge } from "@/app/components/ui/badge";
import {
  UploadIcon,
  WrenchIcon,
  LayoutDashboardIcon,
  BarChart3Icon,
  FileTextIcon,
  ImageIcon,
  ZapIcon,
  DatabaseIcon,
  SparklesIcon,
  MessageSquareIcon,
  SearchIcon,
  BotIcon,
  LineChartIcon,
  WalletIcon,
  ArrowRightLeftIcon,
  ShieldCheckIcon,
  SlidersIcon,
  TableIcon,
  CodeIcon,
  TrophyIcon,
  RocketIcon,
  GitMergeIcon,
  BellIcon,
  SendIcon,
  NewspaperIcon,
  LayoutIcon,
  FileBarChart2Icon,
  ShieldAlertIcon,
  CopyIcon,
  RepeatIcon,
  ToggleRightIcon,
  FileEditIcon,
  BookOpenIcon,
  PlusCircleIcon,
  ChevronRightIcon,
  GlobeIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface RoadmapItem {
  icon: React.ElementType;
  title: string;
  description: string;
  status: "planned" | "in-progress" | "done";
  group?: string;
  details?: string[];
}

interface Wave {
  wave: number | string;
  label: string;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  items: RoadmapItem[];
}

const STATUS_LABEL: Record<RoadmapItem["status"], string> = {
  done: "Done",
  "in-progress": "In Progress",
  planned: "Planned",
};

const STATUS_CLASS: Record<RoadmapItem["status"], string> = {
  done: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "in-progress": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  planned: "bg-muted text-muted-foreground border-border",
};

const waves: Wave[] = [
  {
    wave: 1,
    label: "Concept / Early Prototype",
    title: "Foundation",
    subtitle: "Core platform pages, AI chat UI, and multi-model infrastructure",
    color: "text-violet-500",
    bgColor: "bg-violet-500/5",
    borderColor: "border-violet-500/20",
    dotColor: "bg-violet-500",
    items: [
      {
        icon: LayoutIcon,
        title: "Dashboard",
        description: "Main dashboard with customisable grid layout, portfolio overview, and live market widgets.",
        status: "done",
        group: "Platform",
      },
      {
        icon: SearchIcon,
        title: "Scanner / Tracker",
        description: "Wallet tracking and monitoring — search any address, view activity and asset history.",
        status: "done",
        group: "Platform",
      },
      {
        icon: TrophyIcon,
        title: "Leaderboard",
        description: "Top traders ranked by cumulative PnL and volume across 24h / 7d / 30d / all-time windows.",
        status: "done",
        group: "Platform",
        details: [
          "Ranked list of top performing wallets",
          "Multiple time windows: 24h, 7d, 30d, all-time",
          "Click any wallet to open in Scanner",
          "Copy-trade shortcut from the leaderboard row",
        ],
      },
      {
        icon: WalletIcon,
        title: "Watchlist & Alerts",
        description: "Save favourite wallets; configure price and event alerts with notification support.",
        status: "done",
        group: "Platform",
      },
      {
        icon: CopyIcon,
        title: "Copy Trade",
        description: "Early concept — mirror top leaderboard wallets automatically. May be scrapped or significantly reworked.",
        status: "done",
        group: "Platform",
      },
      {
        icon: FileBarChart2Icon,
        title: "Reports",
        description: "Early concept — PnL export and tax report wizard. May be scrapped or significantly reworked.",
        status: "done",
        group: "Platform",
      },
      {
        icon: ShieldAlertIcon,
        title: "Reversearch",
        description: "Search by address fragments and referral code.",
        status: "done",
        group: "Platform",
      },
      {
        icon: MessageSquareIcon,
        title: "AI Chat UI",
        description: "Chat interface with welcome screen, conversation view, model selector, and typing indicator. Mode buttons (Fast, In-depth, Magic AI, Holistic) and file upload are visual placeholders.",
        status: "done",
        group: "AI",
        details: [
          "Welcome screen and persistent conversation view",
          "Model selector per conversation — functional, routes to selected provider",
          "Conversation history saved and loadable from sidebar",
          "Streaming typing indicator (bouncing dots while awaiting first token)",
          "Mode buttons visible but not yet wired to different behaviour",
          "File upload UI present — attachment processing not yet implemented",
        ],
      },
      {
        icon: SparklesIcon,
        title: "Multi-model selector",
        description: "Switch between CommunityScan default, Google Gemini (2.5 Flash, 2.5 Pro, 2.0 Flash, 2.0 Flash Lite) and Groq (Llama 3.3 70B, Llama 4 Scout, Qwen 3 32B, Llama 3.1 8B) per conversation.",
        status: "done",
        group: "AI",
        details: [
          "CommunityScan: default model with internal routing",
          "Google Gemini: 2.5 Flash, 2.5 Pro, 2.0 Flash, 2.0 Flash Lite",
          "Groq: Llama 3.3 70B Versatile, Llama 4 Scout 17B, Qwen 3 32B, GPT OSS 20B, Llama 3.1 8B",
          "Selected model sent to API on every request",
        ],
      },
      {
        icon: DatabaseIcon,
        title: "Knowledge base & system prompt",
        description: "System prompt and knowledge base populated with quickly generated demo data for demonstration purposes.",
        status: "done",
        group: "AI",
        details: [
          "System prompt viewable and editable by admins",
          "Knowledge base entries seeded as demo data — not production-accurate",
          "Top 4 KB chunks injected per request via semantic search",
          "Personal overrides: users can customise their own KB version",
        ],
      },
      {
        icon: ZapIcon,
        title: "Streaming AI responses",
        description: "Token-by-token streaming via Vercel AI SDK useChat hook. Response renders progressively as it arrives.",
        status: "done",
        group: "AI",
        details: [
          "Vercel AI SDK useChat hook driving the stream",
          "Message bubble updates token by token as they arrive",
          "Typing indicator shown while waiting for the first token",
        ],
      },
      {
        icon: WrenchIcon,
        title: "Live tool calling",
        description: "AI invokes registered tools (balance, positions, trades, prices, leaderboard) and returns real data — not hallucinated numbers.",
        status: "in-progress",
        group: "AI",
        details: [
          "Registered tools: balance, open positions, trade history, token price, leaderboard rank",
          "AI decides which tool to call based on user intent",
          "Tool result injected back into context before final answer",
          "Tool registry browsable at /tools",
        ],
      },
    ],
  },
  {
    wave: 2,
    label: "Build Phase I",
    title: "Core Features",
    subtitle: "User-side page completion, SoSoValue API integration, workflow builder, AI configuration, rich AI output, specialised agents",
    color: "text-blue-500",
    bgColor: "bg-blue-500/5",
    borderColor: "border-blue-500/20",
    dotColor: "bg-blue-500",
    items: [
      {
        icon: LineChartIcon,
        title: "Further SoSoValue Integration",
        description: "Deeper SoSoValue API coverage: extended market data, symbols, incoming listings, and leaderboard enrichment building on the existing integration.",
        status: "planned",
        group: "API Integration",
        details: [
          "Token prices and 24h change via SoSoValue REST API",
          "Incoming new listing feed with metadata",
          "Leaderboard data synced on a rolling schedule",
          "Caching layer to avoid redundant API calls",
        ],
      },
      {
        icon: FileEditIcon,
        title: "System Prompt Editor",
        description: "Edit the actual live system prompt powering the AI. Changes apply immediately to new conversations — no redeploy needed.",
        status: "planned",
        group: "AI Config",
        details: [
          "Full text editor showing the real system prompt in use",
          "Changes saved per user — your version, not a global override",
          "Reset to default button to restore original prompt",
          "Live character and token count with cost estimate",
          "Version history: see and restore previous edits",
          "No workarounds — this is the exact text the model receives",
        ],
      },
      {
        icon: BookOpenIcon,
        title: "Knowledge Base Editor",
        description: "View and edit your full knowledge base — the actual content the AI reads. Add, remove, or reorder sections. No abstraction layer.",
        status: "planned",
        group: "AI Config",
        details: [
          "Browse all KB sections: platform docs, crypto concepts, tool routing rules",
          "Edit any section inline — markdown-aware editor",
          "Add custom entries: private trading notes, strategy docs, FAQs",
          "Reorder sections by drag-and-drop to control retrieval priority",
          "Diff view comparing your KB against the default",
          "Each entry shows token count so you control context budget",
          "Changes are your personal version — does not affect other users",
        ],
      },
      {
        icon: ToggleRightIcon,
        title: "Tool Management",
        description: "Enable or disable individual AI tools per session. Review each tool's schema, sample output, and configure which ones the AI can call.",
        status: "planned",
        group: "AI Config",
        details: [
          "List of all registered tools with name, description, and schema",
          "Toggle each tool on/off — disabled tools are invisible to the AI",
          "View the raw JSON schema the model uses to decide when to call a tool",
          "Sample output for each tool so you know what the AI receives",
          "Per-session overrides: change tool availability without editing config",
          "Future: grant or restrict tools per user role",
        ],
      },
      {
        icon: GitMergeIcon,
        title: "Workflow Builder",
        description: "Visual canvas for building automated workflows. Chain triggers, AI steps, and actions. Create custom tools by combining existing ones and routing their outputs.",
        status: "planned",
        group: "Workflow",
        details: [
          "Drag-and-drop canvas: add trigger → analysis → action nodes",
          "Trigger nodes: price threshold, wallet activity, leaderboard move, scheduled time, news keyword",
          "Action nodes: Telegram message, email, webhook, alert creation, copy-trade toggle",
          "AI analysis node: write a prompt, choose a model, wire data in from any upstream node",
          "Custom tool builder: combine two or more existing tools, map their outputs into a merged schema",
          "Tool output configurator: choose which fields to pass downstream, rename keys, apply transforms",
          "Tool settings panel: set timeout, retry count, cache TTL, required vs optional params per tool",
          "Live run panel: test the workflow with real data before saving",
          "Example: 'Fetch wallet balance + fetch open positions → merge into a single wallet summary card'",
          "Example: 'Alert me + summarise news when BTC drops 5%'",
        ],
      },
      {
        icon: PlusCircleIcon,
        title: "Custom Tool Creator",
        description: "Build new tools inside the workflow editor by composing existing tools. Define inputs, combine outputs, and expose the result as a first-class tool the AI can call.",
        status: "planned",
        group: "Workflow",
        details: [
          "Select two or more existing tools as sources",
          "Map each tool's output fields to a unified output schema",
          "Add transformation steps: filter, format, compute derived fields",
          "Name your tool and write a description — the AI uses this to decide when to call it",
          "Save and register: your custom tool appears in the AI tool list and workflow canvas",
          "Edit or version custom tools at any time",
          "Example: combine 'get price' + 'get wallet balance' → 'get wallet USD value' tool",
        ],
      },
      {
        icon: BellIcon,
        title: "Workflow triggers",
        description: "Trigger nodes: price threshold, wallet activity, leaderboard movement, new listing, scheduled time, news keyword match.",
        status: "planned",
        group: "Workflow",
        details: [
          "Price threshold: above/below a target with configurable hysteresis",
          "Wallet activity: any tx, large transfer (configurable $), new position open/close",
          "Leaderboard: wallet enters top N, rank change > X places",
          "New listing: token appears on SoSoValue for the first time",
          "Scheduled: cron-style time trigger (e.g. every day at 09:00 UTC)",
          "News keyword: phrase match against the live news feed",
        ],
      },
      {
        icon: SendIcon,
        title: "Workflow actions",
        description: "Action nodes: Telegram message, email, webhook, AI analysis block, alert creation, copy-trade toggle.",
        status: "planned",
        group: "Workflow",
        details: [
          "Telegram: send a formatted message to a bot or group",
          "Email: send to a configured address with subject template",
          "Webhook: POST JSON payload to any URL",
          "AI analysis: pass data to the AI and include the response in subsequent nodes",
          "Alert creation: auto-create a Sodex alert from workflow data",
          "Copy-trade toggle: enable or disable a followed wallet automatically",
        ],
      },
      {
        icon: NewspaperIcon,
        title: "News feed & AI analysis block",
        description: "Pull crypto news into workflows; AI summarises and scores sentiment. Can be chained with Telegram notifications.",
        status: "planned",
        group: "Workflow",
        details: [
          "Live crypto news feed from SoSoValue",
          "AI summarises each article in 2-3 sentences",
          "Sentiment score: bullish / neutral / bearish with confidence",
          "Filter by keyword, token, or source in workflow",
          "Chain output into a Telegram node to receive daily digests",
        ],
      },
      {
        icon: UploadIcon,
        title: "File analysis — CSV / Excel",
        description: "Attach a trade export to the AI chat. AI reads it, computes PnL, win rate, best/worst trades, and returns a summary.",
        status: "planned",
        group: "Rich Output",
        details: [
          "Supports CSV and Excel (.xlsx) trade exports",
          "Auto-detects column headers: date, symbol, side, size, price, fee",
          "Computes: total PnL, win rate, average trade size, max drawdown",
          "Returns best and worst trades with context",
          "Works with exports from Hyperliquid, Binance, and SoDEX",
        ],
      },
      {
        icon: ImageIcon,
        title: "Image analysis — vision",
        description: "Paste a screenshot of an error, transaction, or external scanner. AI reads and explains it using Gemini or Llama vision.",
        status: "planned",
        group: "Rich Output",
        details: [
          "Paste or drag-drop any image into the chat",
          "AI reads text, charts, and UI elements from the screenshot",
          "Explains error messages, transaction details, or external scanner data",
          "Routes to Gemini 2.0 Flash or Llama vision automatically",
          "Useful for: pending tx screenshots, bridge error popups, external scanner charts",
        ],
      },
      {
        icon: WalletIcon,
        title: "Wallet stats rich cards",
        description: "AI wallet responses render a structured card (balance, PnL, rank, open positions) instead of a plain text answer.",
        status: "planned",
        group: "Rich Output",
        details: [
          "Triggered automatically when AI calls the wallet tool",
          "Card shows: balance, 24h PnL, leaderboard rank, open position count",
          "Collapsible position list inside the card",
          "Copy address button and open-in-scanner shortcut",
        ],
      },
      {
        icon: TableIcon,
        title: "Data tables in AI responses",
        description: "Leaderboard, trade fills, and position lists render as sortable inline tables rather than markdown bullets.",
        status: "planned",
        group: "Rich Output",
        details: [
          "Detects when AI response contains tabular data",
          "Renders as an interactive table with sortable columns",
          "Applies to: leaderboard results, trade history, position lists",
          "Click a row to open detail view or scanner",
          "Export table as CSV from the chat message",
        ],
      },
      {
        icon: UsersIcon,
        title: "Specialised AI Agents",
        description: "Domain-expert agents, each pre-loaded with the right knowledge base, system prompt, and tool set. Examples include:",
        status: "planned",
        group: "Agents",
        details: [
          "Portfolio Agent — full wallet analysis: PnL attribution, drawdown, win-rate breakdown",
          "Market Intelligence Agent — real-time market data, trend detection, and opportunity surfacing",
          "Risk Management Agent — position risk scoring, margin health, exposure across all open trades",
          "On-chain Explorer Agent — EVM transactions, token transfers, contract interaction decoding",
          "SoSo Support Agent — platform support and guidance across SoSoValue, SoDEX, and SSI (possibly split into separate agents per product)",
        ],
      },
      {
        icon: LayoutDashboardIcon,
        title: "Personal Trading Dashboard",
        description: "User-facing dashboard with live equity stats, PnL chart with timeframe switching, calendar heatmap, and tabbed activity table.",
        status: "planned",
        group: "User Pages",
        details: [
          "Three live stat cards: total equity, all-time PnL with leaderboard rank, open position count with uPnL",
          "PnL chart defaulting to 1M with 1W / 1M / 3M / 1Y / ALL timeframe chips",
          "Calendar heatmap view — each day cell coloured green/red by daily PnL",
          "Custom date range picker for arbitrary chart filtering",
          "Activity table tabs: Open Positions, Withdrawals, Transfers, Closed Orders",
          "All data sourced from the connected profile wallet — no manual address entry needed",
          "Skeleton loading states and graceful empty states throughout",
        ],
      },
      {
        icon: SearchIcon,
        title: "Scanner & Wallet Tracker",
        description: "Fully user-facing wallet scanner: search any address, browse positions, PnL history, transfers, and leaderboard rank — no AI required. No sidebar.",
        status: "done",
        group: "User Pages",
        details: [
          "Search by wallet address or saved tag name",
          "Overview tabs: Summary, Open Positions, PnL Chart, Trade History, Transfers",
          "Spot and futures balance breakdown with USD values",
          "Leaderboard rank badge: PnL rank + volume rank",
          "Bookmark wallet to watchlist directly from the scanner header",
          "Copy-trade shortcut and shareable wallet view link",
        ],
      },
      {
        icon: WalletIcon,
        title: "Profile & Wallet Connection",
        description: "User profile page: connect own wallet, manage display preferences, tag wallets, and configure notification settings.",
        status: "done",
        group: "User Pages",
        details: [
          "Tag any wallet with a custom label for easier identification across the platform",
          "Dark / light mode toggle and layout density setting",
          "Notification preferences: in-app, browser push, Telegram",
          "SoPoints balance display and redemption history",
        ],
      },
      {
        icon: WalletIcon,
        title: "Watchlist Management",
        description: "Full watchlist UI: save favourite wallets with tags, view quick-stats per entry, and manage the list from a dedicated page.",
        status: "done",
        group: "User Pages",
        details: [
          "Star any wallet from the scanner or leaderboard to add it instantly",
          "Tag saved wallets with custom labels for grouping",
          "Quick-stats row per entry: 24h PnL, open positions, last active",
          "Sort and filter by tag, performance, or last activity",
          "Bulk remove or archive entries",
        ],
      },
      {
        icon: BellIcon,
        title: "Alerts Center",
        description: "User-facing alerts hub: create and manage price, wallet-event, and leaderboard alerts with a full trigger history.",
        status: "in-progress",
        group: "User Pages",
        details: [
          "Active alerts list: price threshold, wallet event, leaderboard move, new listing",
          "Trigger history log with timestamp and event payload",
          "Inline threshold editing without reopening a create form",
          "Per-alert notification channel: in-app, push, Telegram",
          "Snooze alerts temporarily without deleting them",
        ],
      },
      {
        icon: CopyIcon,
        title: "Copy Trade Interface",
        description: "User copy-trade dashboard: manage followed wallets, review mirrored trades, set risk limits, and track copy-trade PnL.",
        status: "in-progress",
        group: "User Pages",
        details: [
          "List of followed wallets with per-wallet on/off toggle",
          "Set max position size and per-trade risk percentage per wallet",
          "Live copied trades log with entry price and current PnL",
          "Performance summary: copy-trade PnL vs own-trade PnL",
          "Stop-loss and take-profit override configurable per followed wallet",
        ],
      },
      {
        icon: FileBarChart2Icon,
        title: "Reports & PnL Export",
        description: "User-facing reports page: generate PnL summaries, apply date filters, and download CSV or PDF for tax or review purposes.",
        status: "in-progress",
        group: "User Pages",
        details: [
          "Date range selector: custom, quarterly, or yearly",
          "PnL summary: realised, unrealised, fees paid, net result",
          "Trade-by-trade breakdown table with sortable columns",
          "Fee deduction applied automatically to net PnL figure",
          "Export as CSV (accountant-friendly) or formatted PDF",
          "Supports exports from SoDEX account history",
        ],
      },
    ],
  },
  {
    wave: 3,
    label: "Build Phase II",
    title: "Product Completion",
    subtitle: "Security hardening, performance optimisation, UX & final UI adjustments, rich chart blocks, manual power UI, language support, final demo",
    color: "text-orange-500",
    bgColor: "bg-orange-500/5",
    borderColor: "border-orange-500/20",
    dotColor: "bg-orange-500",
    items: [
      {
        icon: BarChart3Icon,
        title: "Price & PnL chart blocks",
        description: "AI responses about prices or PnL history embed a live chart directly in the message bubble — no separate page needed.",
        status: "planned",
        group: "Rich Output",
        details: [
          "Inline chart rendered inside the chat message bubble",
          "Triggered when AI calls price or PnL history tools",
          "Candlestick for price, line chart for PnL over time",
          "Time range selector: 1h, 4h, 1d, 7d, 30d",
          "Hover tooltip showing OHLCV or PnL at each point",
        ],
      },
      {
        icon: BotIcon,
        title: "Deep Search & Think modes",
        description: "Deep Search fans out across multiple tools before responding. Think mode routes to extended-reasoning models (Gemini Flash Thinking).",
        status: "planned",
        group: "Rich Output",
        details: [
          "Deep Search: AI calls all relevant tools in parallel then synthesises",
          "Think mode: routes to Gemini Flash Thinking or equivalent reasoning model",
          "Both modes shown as distinct UI buttons in the input bar",
          "Think mode shows a collapsible reasoning trace in the message",
          "Deep Search shows which tools were called and what they returned",
        ],
      },
      {
        icon: ShieldCheckIcon,
        title: "Risk controls & rate limiting",
        description: "Per-user rate limiting (Upstash Redis), max message length, tool tier access checks, no secret exposure in API responses.",
        status: "planned",
        group: "Security & Knowledge",
        details: [
          "Upstash Redis sliding-window rate limiter per user ID",
          "Max message length enforced before reaching the model",
          "Tool tier checks: some tools require a paid plan",
          "API responses scrubbed — no keys, internal URLs, or raw stack traces",
          "Abuse detection: repeated identical queries flagged",
        ],
      },
      {
        icon: DatabaseIcon,
        title: "External scanner knowledge",
        description: "AI trained on interpreting Hyperliquid, on-chain EVM explorers, and other scanners. Helps users understand data outside Sodex.",
        status: "planned",
        group: "Security & Knowledge",
        details: [
          "KB entries covering Hyperliquid: funding, OI, liquidation levels",
          "EVM explorer interpretation: reading tx receipts, logs, method signatures",
          "Bridge protocol knowledge: common failure modes and fixes",
          "AI can explain any paste from an external scanner with context",
        ],
      },
      {
        icon: ArrowRightLeftIcon,
        title: "Deposit / withdrawal assistant",
        description: "Guided AI flow for bridge issues: step-by-step instructions, common error explanations, SOSO chain specifics, status checks.",
        status: "planned",
        group: "Security & Knowledge",
        details: [
          "Step-by-step guided flow triggered by deposit/withdrawal questions",
          "Covers SOSO bridge, EVM → SOSO, and reverse paths",
          "Explains common errors: stuck tx, wrong chain, insufficient gas",
          "Status check: paste a tx hash, AI reports bridge status",
          "Escalation path: when to contact support vs wait",
        ],
      },
      {
        icon: LayoutDashboardIcon,
        title: "Tool explorer — manual UI",
        description: "Page listing all registered tools. Users run them manually: pick a tool, fill parameters, see structured results. No AI required.",
        status: "planned",
        group: "Manual UI",
        details: [
          "List of all tools with name, description, and parameter schema",
          "Form auto-generated from the JSON schema — fill and run",
          "Structured JSON response displayed with syntax highlighting",
          "Copy result to clipboard or send to AI chat as context",
          "Useful for debugging, demos, and power users",
        ],
      },
      {
        icon: SlidersIcon,
        title: "Wallet inspector UI",
        description: "Manual wallet analysis: paste an address, browse balance, positions, PnL, trades, and EVM holdings in a structured non-AI interface.",
        status: "planned",
        group: "Manual UI",
        details: [
          "Paste any address — no AI involved, direct API calls",
          "Tabs: Balance, Open Positions, Trade History, EVM Holdings",
          "Sortable tables for trade history and positions",
          "PnL summary bar at the top: realised, unrealised, fees paid",
          "Export all tabs as a CSV bundle",
        ],
      },
      {
        icon: RepeatIcon,
        title: "Aggregator & platform polish",
        description: "Aggregator page completion, platform overview refinement, incoming listings UX, and SoPoints reward integration.",
        status: "planned",
        group: "Polish",
        details: [
          "Aggregator page: compare top wallets, tokens, and strategies side-by-side",
          "Incoming listings feed with countdown and market cap data",
          "SoPoints: reward points for using AI features and workflows",
          "Platform overview page refresh with updated screenshots and copy",
          "General UX pass: loading states, empty states, error boundaries",
        ],
      },
      {
        icon: GlobeIcon,
        title: "Language Support",
        description: "Full multi-language interface and AI responses in the user's preferred language. Language selector in profile settings.",
        status: "planned",
        group: "Polish",
        details: [
          "Language selector in profile settings and sidebar popup",
          "UI strings translated into DE, FR, ES, ZH, JP (initial set)",
          "AI responds in the user's chosen language automatically",
          "Language preference persisted per user account",
          "Fallback to English for untranslated strings",
          "RTL layout support planned for AR/HE in a follow-up",
        ],
      },
      {
        icon: ShieldCheckIcon,
        title: "Security Updates",
        description: "Platform-wide security hardening: auth strengthening, endpoint protection, input validation, rate limiting, and audit logging.",
        status: "planned",
        group: "Security",
        details: [
          "JWT / session hardening — short-lived tokens, secure refresh flow, revocation on logout",
          "Per-endpoint rate limiting with Upstash Redis sliding window (distinct limits per tier)",
          "Input sanitization and schema validation at every API boundary",
          "CORS policy locked to allowed origins — no wildcard in production",
          "API responses scrubbed of internal stack traces, keys, and raw DB errors",
          "Audit log: record auth events, tool calls, and admin actions with user ID and timestamp",
          "Dependency audit pass — upgrade packages with known CVEs",
        ],
      },
      {
        icon: ZapIcon,
        title: "Performance Optimisation",
        description: "Bundle splitting, API response caching, lazy loading, query optimisation, and CDN configuration for fast load times.",
        status: "planned",
        group: "Performance",
        details: [
          "Route-level code splitting — only load JS for the current page",
          "Lazy-load heavy components (charts, aggregator canvas) below the fold",
          "Redis caching layer for leaderboard, token price, and wallet data endpoints",
          "Supabase query optimisation: indexes, select projection, avoid N+1 patterns",
          "Image optimisation: WebP conversion, responsive srcset, next/image throughout",
          "CDN static asset caching with long max-age and cache-busting hashes",
          "Lighthouse target: Performance ≥ 85, CLS < 0.1, LCP < 2.5 s on desktop",
        ],
      },
      {
        icon: SlidersIcon,
        title: "UX & Final UI Adjustments",
        description: "Responsive polish, dark/light mode consistency, skeleton coverage, error boundary design, animation refinements, and accessibility pass.",
        status: "planned",
        group: "UX",
        details: [
          "Mobile and tablet responsive audit — fix layout breaks below 768 px",
          "Dark and light mode consistency check across every page and component",
          "Skeleton loading screens on all data-fetching surfaces — no layout shift",
          "Graceful error boundaries with retry actions and user-friendly copy",
          "Micro-animation refinements: transitions, hover states, sheet open/close",
          "Empty state illustrations and copy for zero-data scenarios",
          "Keyboard navigation and focus-ring audit (WCAG AA target)",
          "Toast and alert copy review — consistent tone and actionable messages",
          "Final design QA pass: spacing, font sizes, icon alignment across breakpoints",
        ],
      },
      {
        icon: FileTextIcon,
        title: "Final demo",
        description: "End-to-end demo: live wallet lookup, AI tool calls, rich output, workflow execution, deposit guidance — submission-ready.",
        status: "planned",
        group: "Polish",
        details: [
          "Live wallet lookup with rich card output",
          "AI tool call trace visible in the UI",
          "Workflow execution from trigger to Telegram message",
          "Deposit assistant walkthrough with real bridge scenario",
          "Recorded backup video in case of live demo issues",
        ],
      },
    ],
  },
  {
    wave: "D",
    label: "Demo Day",
    title: "Launch",
    subtitle: "Final presentations, judge review, result announcement, and follow-up collaboration",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/5",
    borderColor: "border-emerald-500/20",
    dotColor: "bg-emerald-500",
    items: [
      {
        icon: TrophyIcon,
        title: "Live demo presentation",
        description: "Full walkthrough: real wallet data, AI tool calls, rich output blocks, workflow automation, and deposit assistant — all live.",
        status: "planned",
        details: [
          "Scripted demo run: wallet lookup → AI insight → workflow trigger",
          "Rich output: wallet card, inline chart, data table all shown live",
          "Workflow demo: price alert fires, Telegram message received on stage",
          "Deposit assistant: bridge error explained step-by-step",
          "Q&A with judges backed by live data queries",
        ],
      },
      {
        icon: RocketIcon,
        title: "Post-hackathon production release",
        description: "If selected: production hardening, multi-tenant support, expanded knowledge base, and public launch of CommunityScan AI.",
        status: "planned",
        details: [
          "Multi-tenant auth: each user gets isolated KB and tool config",
          "Production infra: auto-scaling, CDN, uptime monitoring",
          "Expanded KB: full Sodex docs, community trading guides",
          "Public beta waitlist and onboarding flow",
          "Billing tier integration for tool access",
        ],
      },
      {
        icon: CodeIcon,
        title: "API playground & developer docs",
        description: "Public API playground for developers to call registered tools directly. Documentation for building integrations on top of CommunityScan.",
        status: "planned",
        details: [
          "Interactive API playground — run any tool from the browser",
          "OpenAPI spec auto-generated from tool schemas",
          "Authentication: API key management per developer account",
          "Rate limits and quota displayed in the playground",
          "Code examples in TypeScript, Python, and curl",
        ],
      },
    ],
  },
];

type SelectedItem = { item: RoadmapItem; waveMeta: Wave } | null;

function RoadmapCard({
  item,
  waveMeta,
  onClick,
}: {
  item: RoadmapItem;
  waveMeta: Wave;
  onClick?: () => void;
}) {
  const clickable = !!onClick && !!(item.details?.length);
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); } : undefined}
      className={cn(
        "group w-full text-left flex gap-3 p-4 rounded-xl border border-border bg-card transition-all",
        clickable
          ? "hover:bg-accent/30 hover:border-border/80 cursor-pointer"
          : "cursor-default"
      )}
    >
      <div className="shrink-0 mt-0.5">
        <div className={cn("size-8 rounded-lg bg-muted flex items-center justify-center transition-colors", clickable && "group-hover:bg-accent")}>
          <item.icon className="size-4 text-muted-foreground" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium leading-snug">{item.title}</p>
          <span
            className={cn(
              "shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border",
              STATUS_CLASS[item.status]
            )}
          >
            {STATUS_LABEL[item.status]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.description}</p>
      </div>
      {clickable && (
        <ChevronRightIcon className="shrink-0 size-3.5 mt-1 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors self-start" />
      )}
    </div>
  );
}


export default function RoadmapPage() {
  const [selected, setSelected] = useState<SelectedItem>(null);

  const allItems = waves.flatMap((w) => w.items);
  const doneCount = allItems.filter((i) => i.status === "done").length;
  const inProgressCount = allItems.filter((i) => i.status === "in-progress").length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main scrollable content */}
      <div className={cn(
        "flex-1 overflow-y-auto transition-all duration-200 min-w-0",
      )}>
      <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="text-xs">Product Roadmap</Badge>
            <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
              {doneCount} done
            </Badge>
            <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30 bg-amber-500/5">
              {inProgressCount} in progress
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">CommunityScan AI</h1>
          <p className="text-muted-foreground max-w-2xl">
            Three build phases — from early prototype to a full AI-powered trading assistant with workflow automation, rich output, and a manual power UI.
          </p>
        </div>

        {/* Wave sections */}
        <div className="space-y-14">
          {waves.map((wave) => {
            const doneInWave = wave.items.filter((i) => i.status === "done").length;
            const pct = Math.round((doneInWave / wave.items.length) * 100);

            // Build grouped item list with dividers
            const groupedNodes: React.ReactNode[] = [];
            let currentGroup = "";
            wave.items.forEach((item) => {
              const g = item.group ?? "";
              if (g && g !== currentGroup) {
                currentGroup = g;
                groupedNodes.push(
                  <div
                    key={`divider-${g}`}
                    className="col-span-full flex items-center gap-2.5 pt-2 first:pt-0"
                  >
                    <span className={cn("text-[10px] font-semibold uppercase tracking-widest shrink-0", wave.color)}>
                      {g}
                    </span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                );
              }
              groupedNodes.push(
                <RoadmapCard
                  key={item.title}
                  item={item}
                  waveMeta={wave}
                  onClick={item.details?.length ? () => setSelected({ item, waveMeta: wave }) : undefined}
                />
              );
            });

            return (
              <section key={String(wave.wave)}>
                {/* Wave header */}
                <div className={cn("rounded-xl border p-5 mb-5", wave.bgColor, wave.borderColor)}>
                  <div className="flex items-start gap-4">
                    <span className={cn("text-5xl font-black tracking-tighter shrink-0 leading-none", wave.color)}>
                      W{wave.wave}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <h2 className={cn("text-base font-semibold", wave.color)}>{wave.title}</h2>
                        <span className="text-xs text-muted-foreground">— {wave.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{wave.subtitle}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {doneInWave}/{wave.items.length}
                      </span>
                      <div className="mt-1.5 w-20 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", wave.dotColor)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature cards with group dividers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupedNodes}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      </div>

      {/* Inline detail panel — inside the content area, not overlaying */}
      {selected && (
        <div className="w-[340px] shrink-0 border-l border-border overflow-y-auto bg-background/80 backdrop-blur-sm">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b border-border bg-background/90 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <selected.item.icon className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">{selected.item.title}</span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="size-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="px-5 pt-4 pb-8 space-y-5">
            {/* Status + wave */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                STATUS_CLASS[selected.item.status]
              )}>
                {STATUS_LABEL[selected.item.status]}
              </span>
              <span className={cn("text-xs font-semibold", selected.waveMeta.color)}>
                W{selected.waveMeta.wave} — {selected.waveMeta.title}
              </span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {selected.item.description}
            </p>

            {selected.item.details && selected.item.details.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  What&apos;s included
                </p>
                <ul className="space-y-2">
                  {selected.item.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className={cn("mt-1.5 size-1.5 rounded-full shrink-0", selected.waveMeta.dotColor)} />
                      <span className="leading-relaxed">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className={cn("rounded-lg border p-3", selected.waveMeta.bgColor, selected.waveMeta.borderColor)}>
              <p className={cn("text-xs font-medium", selected.waveMeta.color)}>
                W{selected.waveMeta.wave} · {selected.waveMeta.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{selected.waveMeta.subtitle}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
