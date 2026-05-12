# Changelog

---

## W3



---

## W2



---

## W1 — Foundation  ·  Jan 21 – May 12, 2026

### Project setup & infrastructure
Initial Next.js project bootstrapped with Supabase sync deployment. Vercel Web Analytics and Speed Insights integrated from the start. App rebranded to CommunityScan Sodex. Google OAuth added alongside email/password auth, including OAuth-required legal pages (Privacy Policy, Impressum, T&C, DSGVO). Supabase security hardened over time: 52 linter warnings resolved, RLS enabled on all tables, search_path locked, missing FK indexes added.

### Scanner
Core wallet tracker built from scratch. Scanner V2 delivered a full redesign: coin logos, Tier 1/Tier 2 data loading distinction for faster time-to-first-data, sticky headers, asset view, realtime updates, and full mobile responsiveness. Funding tab added with correct fee field, direction from sign, and infinite scroll. Spot trades merged into a combined tab. Market widget added with sorting and combined view. Liquidation price logic updated to include MMR. Transfer overview and delta display added. PnL chart scale and colour breakpoints fixed.

### Leaderboard & SoPoints
Leaderboard migrated from CSV to Supabase, then replaced entirely with the official Sodex API as the source of truth. Weekly and all-time views cover futures, spot, and total. Leaderboard bloat fixed (262 MB → 27 MB via vacuum and reindex). No-op upserts suppressed with a BEFORE UPDATE trigger. "Your Row" added using the Sodex rank API with skeleton shimmer while loading. Weekly sync runs oldest-first in batches of 150, with a Saturday 00:00 UTC cron and automatic export to GitHub for historical preservation. SoPoints page built with overview, weekly estimate, legacy view, and a personal competitiveness score. Sodex-owned wallets excluded from all rankings.

### AI (v1)
First AI chat implementation shipped across three optimisation passes. PnL Calendar added with weekly, monthly, and yearly views including a popup detail overlay.

### Alert system
Full alerts page built with 15 alert types across 5 categories. Telegram bot integrated with server-side token, correct webhook URL, and a keep-warm GET handler. Live price feed and realtime sync on the alerts page. Mark/mid/bid/ask price type selector added.

### Aggregator
Drag-and-drop multi-widget dashboard built with hotkeys, horizontal grid increments, an assistant panel, tutorial, edit mode, and performance mode. Global templates and platform updater added. Realtime widget sync and admin page navbar config wired up.

### Auth & permissions
Wallet Tags and Groups system added to the profile page with own-wallet linking. Permission consistency enforced and cached in localStorage for 6 hours. Admin nav hidden for non-mods. Page auth enforced from `page_config`. Account-level blocking implemented at the data layer.

### Design system
Design System page added with a full Dashboard preview, KPI cards, interactive components, and full theme isolation. Sidebar design system deployed with DS tokens and component updates.

### Platform & UX
Platform Calculator and Size/Growth projection added. Quick access to ~40 external scanners added. Smooth page transitions and skeleton mesh across all pages. Mobile: full mobile support, bottom navbar, command palette (cmdk) with quick search and suggestions, enhanced search bar. Announcement bar built with multiple display types. Notifications and share button added. Reverse Search V1 shipped. Coin logo matching fixed across all pages.

### CommunityScan AI (W1 → W3 overhaul)
AI renamed from "AI Assistant" to CommunityScan AI. Full chat interface rebuilt with:
- **Live data blocks** — ETF inflow chart (composed chart, green inflows, cumulative calc), TopTraders with real win rates and sparklines, referral stats, PnL chart, copyable wallet addresses
- **Plan tracker** — top-right overlay showing tool execution steps (running / done / warning / failed), updating live during streaming
- **Queue & stop** — toolbar collapsed into More menu, stop button, queue bubble
- **Scheduling** — model selector (CommunityScan / Groq / Google Gemini), Telegram & Discord delivery, 24h/AM-PM time picker, preview banner
- **Google key pool rotation** — supports up to 10 keys (`GOOGLE_GENERATIVE_AI_API_KEY_2..10`)
- **Chat history & omnisearch** — persistent history with full-text search in the AI sidebar
- **Error handling** — actual retry-after time from upstream, minimal limit error UI, example responses on error

### Auth & access (final state)
Maintenance gate removed — site open to all visitors. Sidebar reflects real login state: shows actual user email and working logout when logged in, "Sign In" button when logged out. `/ai` page requires login and shows a sign-in prompt to anonymous visitors. Tools page (`/tools`) publicly accessible without login. Leaderboard, SoPoints, Platform, and Design System pages removed (redirect to home). Aggregator, Alerts, Watchlist, Copy Trade, and Reports marked as prototypes with an amber banner.
