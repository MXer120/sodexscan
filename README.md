# CommunityScan Sodex

Real-time data intelligence layer for Sodex Mainnet — wallet tracking, leaderboards, PnL analysis, AI-powered insights, and alert automation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui + Radix UI |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| AI | Vercel AI SDK — CommunityScan model, Groq, Google Gemini |
| Charts | Recharts, Lightweight Charts (TradingView) |
| State | Zustand + TanStack Query |
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
- **Leaderboard** — weekly & all-time futures / spot / total rankings via Sodex API
- **SoPoints** — community points system with weekly snapshots
- **Watchlist** — save wallets for quick access
- **Alerts** — price & volume alerts delivered via Telegram
- **AI Chat** — multi-model AI assistant with live on-chain data blocks (ETF flows, top traders, referrals)
- **Tools** — curated external scanner directory
- **Roadmap** — public feature roadmap
- **Copy Trade** — copy trade interface (WIP)
- **Aggregator** — drag-and-drop multi-widget dashboard
- **Reports** — trade export and analysis

---

## Deployment

Deploy to [Vercel](https://vercel.com):

1. Push to GitHub (MXer120/sodexscan)
2. Import project in Vercel
3. Add all environment variables in the Vercel dashboard
4. Set up cron jobs in `vercel.json` or Vercel dashboard matching `/api/cron/*` routes
5. Configure the Supabase `SITE_URL` and redirect URLs for OAuth
