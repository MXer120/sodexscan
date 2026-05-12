# CommunityScan Sodex

Real-time data intelligence layer for Sodex Mainnet — wallet tracking, PnL analysis, AI-powered insights, and alert automation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui + Radix UI |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| AI | Vercel AI SDK (`ai` v4, `@ai-sdk/groq`, `@ai-sdk/google`) |
| Charts | Recharts (data viz) + Lightweight Charts / TradingView (price charts) |
| State | Zustand (client state) + TanStack Query v5 (server state / caching) |
| Animations | Framer Motion |
| Alerts | Telegram Bot API |
| Analytics | Vercel Analytics + Speed Insights |
| Deployment | Vercel |

---

## Setup

### 1. Prerequisites

- Node.js 18+
- npm or yarn
- A [Supabase](https://supabase.com) project

### 2. Clone & install

```bash
git clone https://github.com/MXer120/sodexscan.git
cd sodexscan
npm install
```

### 3. Environment variables

Create `.env.local` in the project root with the following keys:

```env
# ── Supabase ──────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never expose to client

# ── App ───────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── AI providers ──────────────────────────────────────────
GROQ_API_KEY=gsk_...
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
# Optional key pool rotation (up to _10)
GOOGLE_GENERATIVE_AI_API_KEY_2=AIza...

# ── SoSoValue API ─────────────────────────────────────────
SOSOVALUE_API_KEY=your-sosovalue-key

# ── Telegram bot ──────────────────────────────────────────
TELEGRAM_BOT_TOKEN=your-bot-token
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=communityscan_bot

# ── Cron security ─────────────────────────────────────────
CRON_SECRET=a-long-random-secret
```

> **Never commit `.env.local`** — it is in `.gitignore`.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Build for production

```bash
npm run build
npm start
```

---

## Project Structure

```
sodexscan/
├── app/
│   ├── ai/                  # CommunityScan AI chat interface
│   ├── alerts/              # Price & volume alert management
│   ├── api/                 # Route handlers (chat, crons, telegram, sosovalue, …)
│   ├── auth/callback/       # OAuth redirect handler
│   ├── components/          # All React components
│   │   ├── AppSidebar.tsx   # Main navigation sidebar
│   │   ├── Auth.tsx         # Login / signup form
│   │   ├── AuthModal.tsx    # Modal wrapper for Auth
│   │   ├── Profile.tsx      # User profile page
│   │   ├── chat/            # AI chat components
│   │   ├── dashboard/       # Dashboard widgets & header
│   │   ├── tools/           # Tools catalog
│   │   └── ui/              # shadcn/ui primitives
│   ├── hooks/               # React query hooks
│   ├── lib/                 # Supabase clients, AI libs, utils
│   ├── roadmap/             # Public roadmap page
│   ├── tools/               # Tools page (public)
│   ├── tracker/             # Scanner / wallet tracker (public)
│   └── layout.tsx           # Root layout
├── middleware.ts             # Next.js edge middleware
├── public/                  # Static assets
└── supabase/                # DB migrations
```

---

## Authentication & Access

| Page | Anonymous | Logged in |
|---|---|---|
| Dashboard (`/`) | ✅ | ✅ |
| Scanner (`/tracker`) | ✅ | ✅ |
| Tools (`/tools`) | ✅ | ✅ |
| Roadmap (`/roadmap`) | ✅ | ✅ |
| Leaderboard, SoPoints, etc. | ✅ | ✅ |
| AI (`/ai`) | Sign-in prompt | ✅ |
| Profile (`/profile`) | Sign-in prompt | ✅ |
| Admin (`/admin`) | — | Owner role only |

Auth state is managed by `SessionContext` (Supabase `onAuthStateChange`). The login/signup modal is triggered globally via `openAuthModal()` or the `openAuthModal` custom event.

---

## Supabase Migrations

Migrations live in `supabase/migrations/`. Apply them via:

```bash
npx supabase db push
```

Or use the Supabase dashboard SQL editor.

---

## Key Features

- **Scanner** — real-time wallet tracking, PnL, trade history, funding, positions

- **CommunityScan AI** — multi-model chat interface built on the Vercel AI SDK. Requires login.
  - **Models** — CommunityScan (custom), Groq (Llama), Google Gemini; switchable per session with per-model rate limiting and key pool rotation
  - **Live data blocks** — structured responses embed real on-chain data inline: ETF inflow charts, top trader tables with win rates and sparklines, referral stats, PnL charts, copyable wallet addresses
  - **System prompt** — custom instructions per model that shape response style, tool availability, and data format; non-prescriptive to avoid hallucination
  - **Knowledge Base** — shared platform KB plus personal notes; content is embedded with Google Gemini embeddings (`gemini-embedding-2`) and retrieved via vector similarity search; users can suggest edits (reviewed before going live)
  - **Tools** — AI-accessible tool catalog integrated into the chat interface; tools can be invoked directly from the AI or browsed in the Tools view within `/ai`
  - **Workflow** — scheduled prompts connect to the Workflow Builder for multi-step automations, conditional logic, and webhook integrations
  - **Scheduled prompts** — configure one-off or recurring AI queries (daily/weekly/custom days) with results delivered to Telegram or Discord
  - **Chat history** — searchable conversation history with omnisearch in the AI sidebar
  - **Queue & streaming** — requests queue when a model is at capacity; responses stream token-by-token with a live plan tracker showing tool execution steps

- **Alerts** — price & volume alerts with 15 alert types across 5 categories, delivered via Telegram bot

- **Tools** — browsable catalog of on-chain and DeFi tools, accessible publicly at `/tools` and within the AI interface at `/ai?view=tools`

- **Aggregator** — drag-and-drop multi-widget dashboard with custom layouts

- **Copy Trade** — copy trade interface (prototype)
