# CommunityScan SoDEX - Development Roadmap

## 🚀 Next Phase Recommendations

---

## 🔴 CRITICAL (Do First)

### 1. Fix Watchlist Performance Bottleneck ⚡
**Problem**: 20 separate API calls to fetch positions = 3-5 sec load time
**Solution**:
- Create `sync-watchlist-positions` cron job → cache positions in DB
- Add `watchlist_positions` table with 5min refresh
- Instant load, scales to 1000s of users

**Impact**: 80% faster watchlist, biggest user complaint

---

### 2. Add Skeleton Loaders & Loading States 🎨
**Problem**: Users see blank screens for 5+ seconds, no feedback
**Solution**:
- Add shimmer placeholders for leaderboard tables
- Progressive loading for watchlist (show cached data first)
- Loading spinners for search results

**Impact**: Perceived perf 2x better, reduces bounce rate

---

### 3. Implement Error Boundaries & Fallbacks 🛡️
**Problem**: App crashes silently, no 404 pages
**Solution**:
- React error boundary in `layout.js`
- Graceful 404 for non-existent wallets
- Retry buttons for failed API calls

**Impact**: Production stability, better UX

---

## 🟡 HIGH PRIORITY (Week 2)

### 4. Build Wallet Comparison Tool 📊
**Feature**: Compare 2-5 wallets side-by-side
**Why**: Users manually open multiple tabs
**How**:
- `/compare?wallets=0x123,0x456` route
- Table: PnL rank, volume, win rate, biggest positions
- Visual: Overlaid PnL charts

**Impact**: Unique feature, increases session time

---

### 5. Add Real-Time Price Alerts 🔔
**Feature**: Notify when watched wallet hits PnL threshold
**Why**: Users want to act on big moves
**How**:
- `alerts` table: user_id, wallet_address, trigger (e.g., "+10% PnL")
- Cron job checks every 5min → sends email/push
- Frontend: Alert modal in profile page

**Impact**: High engagement, sticky feature

---

### 6. Optimize Leaderboard Queries 🗄️
**Problem**: Platform page scans 100k+ rows for counts
**Solution**:
- Materialized view `leaderboard_stats_mv`
- Refresh via cron every 30min
- Add indexes on `wallet_address`, `pnl_rank`

**Impact**: 500ms → 50ms query time

---

## 🟢 MEDIUM PRIORITY (Month 1)

### 7. Build Portfolio Analytics Dashboard 📈
**Feature**: Track YOUR wallet over time
**Why**: Users track competitors, not themselves
**How**:
- "My Portfolio" section in profile
- Charts: Cumulative PnL, daily returns, win/loss ratio
- Export to CSV

**Impact**: Differentiation, appeals to traders

---

### 8. Add Social Login (Google OAuth) 🔐
**Problem**: Email signup friction = 60% drop-off
**Solution**:
- Supabase Auth supports Google OAuth
- Add Google button to Auth.tsx
- Update legal pages (already done ✅)

**Impact**: 2x signup conversion

---

### 9. Implement Dark Mode Polish 🌙
**Current**: Light mode disabled, basic dark mode
**Upgrade**:
- Add 3 dark themes (Midnight Blue, Amoled Black, Nord)
- Smooth transition animations
- High-contrast mode for accessibility

**Impact**: Better aesthetics, accessibility compliance

---

### 10. Build Token Discovery Feed 🔍
**Feature**: "New Tokens" page with metadata
**Why**: `/incoming` exists but minimal data
**How**:
- Aggregate new pairs from Sodex API
- Show: volume 24h, top holders, social mentions
- Filter: Min liquidity, max age

**Impact**: Content discovery, SEO

---

## 🔵 LOW PRIORITY (Month 2-3)

### 11. Add Wallet Notes & Annotations 📝
- Rich text notes per wallet
- Pin important wallets to top
- Shared notes for community (optional)

---

### 12. Build Mobile App (PWA) 📱
- Convert to installable PWA
- Add offline caching
- Push notifications for alerts

---

### 13. Implement Referral Rewards 🎁
- Track who signed up via which referral code
- Leaderboard for top referrers
- Badges for top recruiters

---

### 14. Add Advanced Filters 🔬
- Filter by: Win rate, avg position size, favorite pairs
- Saved filter presets
- Export filtered results

---

### 15. Build AI Insights (Experimental) 🤖
**You have `/ai/top-wallet` route!**
- "Why is this wallet profitable?" explanations
- Pattern detection (scalping vs. swing trading)
- Suggested similar wallets

---

## ⚙️ TECHNICAL DEBT & OPTIMIZATION

### 16. Migrate to Server Components 🚀
- Convert MainnetTracker, PlatformPage to Server Components
- Data fetched on server → faster initial render
- Reduce client bundle size

---

### 17. Add Request Deduplication 🔄
- Use React Query's `dedupeKeyBySec`
- Prevent duplicate searches
- Cache search results for 30s

---

### 18. Implement Database Caching Layer 💾
- Redis/Upstash for leaderboard caching
- Reduce Supabase query load by 80%
- 10ms response times

---

### 19. Add Monitoring & Observability 📡
- Sentry for error tracking
- PostHog for analytics
- Cron job health checks via BetterUptime

---

### 20. Refactor Cron Jobs 🔧
- Add job queue (BullMQ)
- Retry logic for failed syncs
- Parallel processing for batches

---

## 📊 PRIORITY MATRIX

| Feature | Impact | Effort | ROI | Priority |
|---------|--------|--------|-----|----------|
| Fix Watchlist Perf | 🔥🔥🔥 | 2d | 10/10 | **DO NOW** |
| Skeleton Loaders | 🔥🔥🔥 | 1d | 9/10 | **DO NOW** |
| Error Boundaries | 🔥🔥 | 4h | 8/10 | **DO NOW** |
| Wallet Comparison | 🔥🔥🔥 | 3d | 8/10 | Week 2 |
| Price Alerts | 🔥🔥🔥 | 4d | 9/10 | Week 2 |
| Query Optimization | 🔥🔥 | 2d | 7/10 | Week 2 |
| Portfolio Dashboard | 🔥🔥 | 5d | 7/10 | Month 1 |
| Google OAuth | 🔥🔥 | 1d | 8/10 | Month 1 |
| Dark Mode Polish | 🔥 | 2d | 5/10 | Month 1 |
| Token Discovery | 🔥🔥 | 3d | 6/10 | Month 1 |

---

## 🎯 RECOMMENDED 30-DAY ROADMAP

### Week 1: Critical Fixes
- ✅ Watchlist performance (cron + cache)
- ✅ Loading states everywhere
- ✅ Error boundaries

### Week 2: High-Impact Features
- 🔥 Wallet comparison tool
- 🔥 Price alerts (basic version)
- 🔥 Query optimization

### Week 3: UX Polish
- 🎨 Dark mode themes
- 🎨 Portfolio analytics
- 🎨 Google OAuth

### Week 4: Growth Features
- 📈 Token discovery feed
- 📈 Referral rewards
- 📈 Monitoring setup

---

## 🎯 Choose Based on Goals

- **User Growth** → Google OAuth + Alerts + Comparison
- **Retention** → Watchlist Perf + Portfolio + Alerts
- **Monetization** → Referral Rewards + Premium Filters
- **Stability** → Error Boundaries + Monitoring + Query Optimization

---

## 📋 Current Architecture Overview

### Tech Stack
- **Framework**: Next.js 14.2 (App Router)
- **Database**: Supabase (PostgreSQL + Auth)
- **State**: TanStack React Query v5.90.19
- **UI**: CSS Variables, Recharts, Framer Motion
- **APIs**: Sodex Mainnet API, Sodex Gateway API

### Data Flow
```
Sodex Mainnet API
    ↓
Cron Jobs (/api/cron/*) [Scheduled]
    ↓
Supabase Tables (account_mapping, leaderboard, positions, etc)
    ↓
React Components (useQuery hooks)
    ↓
UI Rendering + Global Cache
```

### Key Performance Issues
1. **Watchlist**: 20 separate API calls = 3-5 sec load
2. **Leaderboard**: Full table scans on 100k+ rows
3. **Search**: No indexes on wallet_address
4. **Social**: Fetches all users before pagination
5. **Global Cache**: No size limit, memory growth

### Cron Jobs
- `sync-accounts` - Account ID → wallet mapping
- `sync-leaderboard` - PnL & volume rankings
- `sync-positions` - Open trading positions
- `sync-pnl` - Historical daily PnL
- `sync-balances` - Spot/futures balances
- `sync-withdrawals` - Withdrawal history
- `sync-history` - Trade execution history

---

## 🔍 Analysis Summary

**Strengths:**
- ✅ Comprehensive features (~15 major pages)
- ✅ Modern tech stack
- ✅ Clear architecture
- ✅ Good separation of concerns

**Weaknesses:**
- 🔴 Performance bottlenecks (5-10s loads)
- 🔴 No error handling
- 🔴 Missing loading states
- ⚠️ Scalability issues (linear cost with users)
- ⚠️ No monitoring/observability

**Opportunities:**
- 💡 Wallet comparison (unique feature)
- 💡 Price alerts (high engagement)
- 💡 AI insights (existing `/ai` routes)
- 💡 Portfolio analytics (retention)

**Threats:**
- ⚠️ User churn from slow loads
- ⚠️ Production crashes from no error boundaries
- ⚠️ Poor UX from blank screens
