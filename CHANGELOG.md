# Changelog

All notable changes to CommunityScan Sodex. Ordered newest-first.

---

## [Unreleased] — 2026-05-12

### Changed
- **Auth — sidebar now reflects real login state**: `AppSidebar` reads `user` from `SessionContext`; footer shows actual email when logged in and a "Sign In" button when logged out. Both the workspace-dropdown logout and the footer-dropdown logout now call `supabase.auth.signOut()` and redirect to `/`.
- **Auth — AI page requires login**: `/ai` shows a sign-in prompt for anonymous visitors; the full chat/tools/KB/schedule interface is only shown to authenticated users.
- **Middleware — maintenance gate removed**: `middleware.ts` previously blocked all visitors without a `mnt-verified=1` cookie and redirected them to `/maintenance`. That gate has been disabled; the site is now open to everyone. The middleware file is kept (passes through all requests) so it can be re-enabled easily.

---

## 2026-05-10

### Fixed
- Roadmap: rename SoSoValue item, adjust statuses, remove wallet connection detail (`d35df94`)

### Added
- Enable RLS on `ai_rate_limit_log` table (`ffea9ba`)
- Open admin page to all users; bypass rate limits for own API keys; add buildathon role (`afe2b32`)

### Removed
- Unused Discord bot directory (`73677a6`)

### Fixed
- Use `text-primary` colour for "here" link so it is visually distinct (`003c01b`)
- Hint text reads "Get your free API key here" (`e485d52`)
- Show API key link as underlined "here" text for visibility (`f8cea04`)

### Added
- Clickable API key links for Groq and Google AI in settings (`68c67fb`)

### Fixed
- `style` prop on Sk skeleton in `ReferralAnalysisBlock` and `EtfInflowsBlock` (`a9d667c`, `0c9f200`)
- Pass `symbol/from/to` to `get_trades` to satisfy TypeScript inferred type (`49f7f3c`)

### Added
- AI chat blocks overhaul — TopTraders, referral, previews, plan module (`5d750dd`)

### Fixed
- ETF fallback example matches perfect response; system prompt non-prescriptive (`8dd395e`)
- ETF bar `maxBarSize` restored; skeleton deterministic heights; plan optional (`688941c`)

### Added
- TopTraders real win rate + sparklines; 2-block ETF example; skeleton loading (`4ac1fd6`)
- Example response on AI error — full chat with live blocks (`d813a18`)
- Live block previews on examples — no AI required (`a6fa950`)

### Fixed
- Wrap `??` and `||` mixed expression in parens (syntax error) (`922fa5e`)

### Added
- Google key pool rotation (`GOOGLE_GENERATIVE_AI_API_KEY_2..10`) (`26c5e2e`)

### Fixed
- Propagate actual retry-after from upstream quota errors (`f9a3782`, `f92882c`)
- Plan states (failed/warning/done), streaming updates, TS build error (`70ac395`)

### Added
- Copyable addresses, `pnl_chart` block, plan top-right, zod fix, KB green logo (`a4f879c`)

### Fixed
- Minimal limit error — model name, reset time, "Add API key" button only (`0850b7e`)

### Added
- AI plan tracker; KB green logo; green input border; referral prompt fix (`be593d8`)

### Fixed
- Referral example scope + `get_referral_stats` planned tool detail (`06f5400`)
- Input typeable during generation; welcome screen redesign (`f845d93`)
- Chat history loading + omnisearch in AI sidebar (`d9a1691`)

### Added
- ETF block full redesign — composed chart, green inflows, overflow tabs, full controls button (`38aac39`)

### Fixed
- ETF block — cumulative calc, combined default view, header stat (`99aa49a`)

### Added
- Collapse toolbar tools into More menu; stop button; queue bubble redesign (`6dbb4b9`)

### Fixed
- Chat flicker on nav; custom 24h/AM-PM time picker in schedule (`5e13c85`)
- Schedule model dropdown styled; UTC time label; Chat nav always opens new chat (`0fbbe8f`)

### Added
- Schedule page — model selector, Telegram/Discord delivery, preview banner (`491b52a`)
- AI chat blocks, ETF/SoSoValue integration, schedule page, queue & history fixes (`c05cf8b`)
- Replace leaderboard DB with official API; add spot stats; AI agents; profile popup (`6865720`)

### Removed
- `/scripts` directory; added to `.gitignore` (`fe3684d`)
- `/docs` directory; added to `.gitignore` (`3a7cd2c`)
- Dev tooling and AI config files from repo (`46135c1`)

### Fixed
- Sign into Supabase alongside maintenance bypass so app auth is set in one step (`01778c4`)
- Switch to supabase-js `createClient` with `localStorage` persistence (`bb40b5f`)
- Global auth modal in layout; remove per-page auth gates (`5015535`)
- Wire auth modal into `AppSidebar` — `openAuthModal` was no-op after Navbar removed (`c3742c3`)
- Replace Square.ai with CommunityScan AI in chat welcome screen (`783014d`)

### Added
- Full JS→TS migration; new features; Supabase migrations (large batch commit) (`45d4621`)

### Fixed
- `ThemeContext` with mode/toggleMode and themes.ts (`ebdd628`)
- Missing deps for FloatingTopBar and GlobalHeader (`cf2b3ac`)
- Invalid Button size `icon-xs` → `icon` (`ca959ac`)
- Missing UI deps for AppSidebar (`e1c53b8`)

### Changed
- Rename "AI Assistant" to "CommunityScan AI" (`f0701ab`)

---

## 2026-04-25

- Export weekly LB data (`965901e`)

### Added
- Mark/mid/bid/ask price type selector on alerts (`af8dec8`)
- Live prices + realtime sync on alerts page (`43b979b`)

### Fixed
- Telegram connect flow — server-side token, correct URLs (`1a63673`)
- GET keep-warm handler on telegram webhook route (`b5bc146`)
- Telegram bot username → `communityscan_bot`; webhook with `www.` prefix (`7464f04`)

### Added
- Missing larp detector, team guard hook, SoSoValue API lib (`9c14c37`)
- Missing aggregator widget components (`5926bb6`)
- Alert system — Telegram bot, shadcn UI, DB migrations (`1444569`)

### Fixed
- Define `--ds-*` tokens globally on `:root` in `index.css` (`b373253`)

### Added
- Deploy sidebar design system — Navbar, DS tokens, component updates (`b373253`)

### Fixed
- Maintenance gate — cookie-based bypass, 24h persistence, no TS error (`cb2c142`)
- Middleware — use official `@supabase/ssr` `setAll` pattern; fail-closed error handling (`d3ca088`)

### Added
- Middleware-based maintenance gate (replaces broken client-side `MaintenanceGate`) (`ff22f66`)

### Fixed
- Maintenance upgrade screen; alerts layout; copy trade; shadcn setup (`d09ce4d`)

### Added
- Maintenance gate — site offline screen, admin-only access (`b7a80b6`)

### Fixed
- Alerts — use supabaseAdmin auth; add Navbar entry with bell icon (`7af8074`)

### Added
- Alerts page — full CRUD with 15 alert types across 5 categories (`bf0767c`)
- Trade history table — page size selector (10/25/50/100) (`1ac2085`)
- Reports page — DS design, all-trades pagination, timezone-aware dates (`5c9d23b`)

---

## 2026-04-18

- Export weekly LB data (`6df93c9`)

### Fixed
- KPI info icon dedup; canvas bg; dashboard fixes + crosshair (`bdea600`)
- Design system page — theme isolation, 3 tabs, navbar clearance (`db8e793`)

### Added
- Seed script for design-system `nav_config` row (`fb72160`)
- `/design-system` to `nav_config` DB + admin panel (`ba5258a`)
- Design System page with Dashboard preview (`6df93c9` area)

---

## 2026-04-11 — 2026-04-04

- Export weekly LB data (`3a3e757`, `0ab8921`)

### Fixed
- Larp page: portfolio fixes, positions styling, mod-only access, hidden from nav (`686de4f`)
- OG images use favicon SVG + dark bg matching default cyan theme (`ae434b4`)
- Hide admin nav for non-mods; block all tab data for restricted account; enforce page auth from `page_config` (`ae465f5`)
- Migration: fix `handle_new_user` trigger with `ON CONFLICT` (`f7a55a4`)
- Funding + spot infinite scroll; block tier2 for hidden account; placeholder activity (`bd4a5f5`)
- Funding tab: use `fundingFee` field, no rounding, show direction from sign (`c1c2786`)
- Move `isBlockedAccount` memo after `useSessionContext` call (`daccfe4`)
- Block account 1515; fix funding precision; merge spot trades tab; market widget sorting + combined view (`ece1371`)
- Official Sodex API upgrade; deprecation banners; login fix; new scanner tabs + market widget (`1aa2192`)

---

## 2026-03-28 — 2026-03-14

- Export weekly LB data (`1aa2192`, `3260d33`, `349fa61`)

### Fixed
- Weekly sync queue fix (`d4184a0`)
- "Your Row" skeleton shimmer while loading (`e3ffe38`)
- "Your Row" in Total All-Time uses Sodex rank API, zero DB (`117fd6f`)
- Nuclear cache: version auto-invalidates stale `localStorage`, TTL 2 min (`6858b13`, `0340596`)
- Total all-time LB: pure Sodex API proxy, correct sort params (`d9d5034`)
- Oldest-synced-first for all LB syncs; deploy edge fn (`6915975`)
- Batch all LB syncs (150/run, 1 min); fix timeout; cleanup old weeks (`1fb0357`)
- Export only new weeks, never overwrite historical (`4a38d48`)

---

## 2026-03-10

### Fixed
- SEO & AI SEO update; aggregator black screen fixed (`c5a8a4a`)
- 16 perf warnings: RLS initplan, dup/unused indexes, missing FK index (`f0f6a69`)
- Enable RLS on 3 internal infra tables (`2961959`)
- Fix 52 Supabase security linter warnings (search_path + RLS) (`0601e46`)

### Added
- Support for defissi, memessi & ussi coin logos (`277f4a0`)
- Even faster loading for scanner by distinguishing Tier 1 and Tier 2 data (`5bc2a3c`)
- Faster loading animation response; actual faster loading of wallet data (`0398ef7`)
- V0.1 label to light mode (`5418c29`)

### Fixed
- Remove duplicate `sync_current_week` call; reset fillfactor to 100 (`a9f1f57`)

### Added
- Paper theme & light mode (`41b6b9b`)
- Egress optimization: cache Sodex LB, wallet responses; reduce cron frequency (`cfb29e1`)
- Smooth page transitions (`034cc2a`)
- Skeleton mesh on all pages; profile page own rank upgrade (`c2ca904`)

### Fixed
- Weekly Total PnL: use `sodex_pnl` not futures; add sort options (`c2ca904`)

---

## Earlier (pre-March 2026)

### Added
- pg_cron: hourly Sodex LB sync; remove old spot snapshot cron (`bcaaba6`)
- Google auth security upgrade; Google sign-up / sign-in (`326f377`, `2f27b0b`)
- SoPoints disclaimer (`899920d`)
- Full automation for spot LB & weekly + SoPoints snapshot-time update (`c13dd57`)
- Mobile bottom navbar + command palette (`900bdec`)
- Command palette (cmdk) quick search + suggestions (`b3a863a`, `8c32824`)
- Spot LB + points: Sodex wallet exclusion, `<1pt` redistribution, LB reorder (`b1220af`)
- Week-based leaderboard & SoPoints estimate (`80dc94e`)
- Notifications & share button (`c1f5160`)
- Sticky headers in scan; asset view for performance (`f5053d7`)
- Profile page optimization (`63edd97`)
- T&C, Privacy Policy, Impressum pages for OAuth (`4194e8a`, `31af3f0`)
- Query optimization (`ec867e5`)
- Reverse Search V1 (`2955d71`)
- SoPoints page V1 (`b084bab`)
- Massive UI overhaul: 5 colour schemes, custom bullish/bearish colours (`71e8bb1`)
- Platform Calculator (`a9bc399`)
- AI chat (`d1858b7`, `c2711e2`, `43f9743`)
- PnL Calendar — weekly, monthly, yearly view (`3202900`)
- Sign-up CTA; announcement bar with ad type default (`5389727`, `fbb7b21`)
- Wallet Tags & Groups; mobile navbar; full mobile support (`47c56e7`)
- Watchlist — saved wallets with auth (`5129841`)
- Coin logos; simple landing page search bar (`528b7dd`)
- Leaderboard: CSV → Supabase; export function (`bbea690`, `44784cc`)
- Sodex Design Language; Top 10 24h pairs; new users; auth system; leaderboard improvements (`3dc4b18`)
- Rebranding (`b235db4`)
- Disclaimer, Impressum & DSGVO pages (`39fad7b`)
- Social links (`196e21a`)
- Scanner V2 + minor UI changes (`406ef17`)
- Vercel Web Analytics + Speed Insights (`dfaa65c`, `edd20ff`)
- Initial commit / Supabase sync deployment (`eaac0da`, `32606aa`)
