/**
 * Global cache that persists across component mounts/unmounts
 * Used to avoid refetching data when navigating between pages
 */

// Bump this on every deploy that changes data sources to auto-invalidate stale localStorage
const CACHE_VERSION = 2

interface TimestampedData<T> {
  data: T | null
  timestamp: number
}

interface TimestampedCount {
  count: number
  timestamp: number
}

interface TimestampedPage<T> {
  data: T
  timestamp: number
}

interface Top10Entry {
  gainers: unknown[]
  losers: unknown[]
  timestamp: number
}

interface CoinLogoEntry {
  loaded: boolean
  timestamp: number
}

interface AccountDataEntry {
  timestamp: number
  [key: string]: unknown
}

interface TickersEntry {
  spot: unknown[]
  futures: unknown[]
  timestamp: number
}

interface NewestTradersEntry {
  data: unknown[]
  timestamp: number
}

interface CacheStore {
  leaderboardPages: Map<string, TimestampedPage<unknown>>
  totalCounts: Map<string, TimestampedCount>
  top10: Record<string, Top10Entry>
  userStats: TimestampedData<unknown>
  accountData: Map<string, AccountDataEntry>
  tickers: TickersEntry
  newestTraders: NewestTradersEntry
  coinLogos: Map<string, CoinLogoEntry>
  weeklyLeaderboardPages: Map<string, TimestampedPage<unknown>>
  weeklyTotalCounts: Map<string, TimestampedCount>
  leaderboardMeta: TimestampedData<unknown>
  weeklyRewardEstimate: TimestampedData<unknown>
}

interface TTLStore {
  mainnetPage: number
  tracker: number
  platform: number
  logos: number
  meta: number
  weeklyLb: number
}

class GlobalCache {
  caches: CacheStore
  TTL: TTLStore

  constructor() {
    // Nuke old localStorage if version mismatch
    if (typeof window !== 'undefined') {
      try {
        const storedVersion = localStorage.getItem('cacheVersion')
        if (storedVersion !== String(CACHE_VERSION)) {
          localStorage.removeItem('leaderboardCache')
          localStorage.setItem('cacheVersion', String(CACHE_VERSION))
        }
      } catch (e) { /* ignore */ }
    }

    this.caches = {
      // MainnetPage caches
      leaderboardPages: new Map(), // key: "page_type_excludeSodex" -> {data, timestamp}
      totalCounts: new Map(),      // key: "type_excludeSodex" -> {count, timestamp}
      top10: {} as Record<string, Top10Entry>,
      userStats: { data: null, timestamp: 0 },

      // MainnetTracker caches
      accountData: new Map(),      // key: accountId -> {accountDetails, balances, etc., timestamp}

      // Platform/TopPairs caches
      tickers: { spot: [], futures: [], timestamp: 0 },
      newestTraders: { data: [], timestamp: 0 },

      // Coin logos cache (long TTL, logos don't change often)
      coinLogos: new Map(), // url -> { loaded: bool, timestamp }

      // Weekly leaderboard caches
      weeklyLeaderboardPages: new Map(), // key: "weekNum_page_sort_excludeSodex"
      weeklyTotalCounts: new Map(),      // key: "weekNum_sort_excludeSodex"
      leaderboardMeta: { data: null, timestamp: 0 },
      weeklyRewardEstimate: { data: null, timestamp: 0 },
    }

    this.TTL = {
      mainnetPage: 2 * 60 * 1000,   // 2 minutes (leaderboard data — Sodex API is fast)
      tracker: 2 * 60 * 1000,       // 2 minutes
      platform: 5 * 60 * 1000,      // 5 minutes for tickers & new traders
      logos: 24 * 60 * 60 * 1000,   // 24 hours for logos
      meta: 30 * 60 * 1000,         // 30 minutes for leaderboard meta
      weeklyLb: 30 * 60 * 1000      // 30 minutes for weekly leaderboard
    }

    // Load persistent caches from localStorage
    this._loadPersistentLeaderboardCache()
  }

  // Load leaderboard cache from localStorage
  _loadPersistentLeaderboardCache() {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem('leaderboardCache')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.meta && Date.now() - parsed.meta.timestamp < this.TTL.meta) {
          this.caches.leaderboardMeta = parsed.meta
        }
        if (parsed.pages) {
          Object.entries(parsed.pages).forEach(([key, value]) => {
            const v = value as TimestampedPage<unknown>
            if (Date.now() - v.timestamp < this.TTL.mainnetPage) {
              this.caches.leaderboardPages.set(key, v)
            }
          })
        }
        if (parsed.counts) {
          Object.entries(parsed.counts).forEach(([key, value]) => {
            const v = value as TimestampedCount
            if (Date.now() - v.timestamp < this.TTL.mainnetPage) {
              this.caches.totalCounts.set(key, v)
            }
          })
        }
        if (parsed.weeklyPages) {
          Object.entries(parsed.weeklyPages).forEach(([key, value]) => {
            const v = value as TimestampedPage<unknown>
            if (Date.now() - v.timestamp < this.TTL.weeklyLb) {
              this.caches.weeklyLeaderboardPages.set(key, v)
            }
          })
        }
        if (parsed.weeklyCounts) {
          Object.entries(parsed.weeklyCounts).forEach(([key, value]) => {
            const v = value as TimestampedCount
            if (Date.now() - v.timestamp < this.TTL.weeklyLb) {
              this.caches.weeklyTotalCounts.set(key, v)
            }
          })
        }
      }
    } catch (e) { /* ignore */ }
  }

  _savePersistentLeaderboardCache() {
    if (typeof window === 'undefined') return
    try {
      const pages: Record<string, TimestampedPage<unknown>> = {}
      this.caches.leaderboardPages.forEach((v, k) => { pages[k] = v })
      const counts: Record<string, TimestampedCount> = {}
      this.caches.totalCounts.forEach((v, k) => { counts[k] = v })
      const weeklyPages: Record<string, TimestampedPage<unknown>> = {}
      this.caches.weeklyLeaderboardPages.forEach((v, k) => { weeklyPages[k] = v })
      const weeklyCounts: Record<string, TimestampedCount> = {}
      this.caches.weeklyTotalCounts.forEach((v, k) => { weeklyCounts[k] = v })
      localStorage.setItem('leaderboardCache', JSON.stringify({
        meta: this.caches.leaderboardMeta,
        pages, counts, weeklyPages, weeklyCounts
      }))
    } catch (e) { /* ignore quota errors */ }
  }

  // Leaderboard page cache
  getLeaderboardPage(page: number | string, type: string, excludeSodex: boolean | string, showZero: boolean | string) {
    const key = `${page}_${type}_${excludeSodex}_${showZero}`
    const cached = this.caches.leaderboardPages.get(key)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.mainnetPage) {
      this.caches.leaderboardPages.delete(key)
      return null
    }
    return cached.data
  }

  setLeaderboardPage(page: number | string, type: string, excludeSodex: boolean | string, showZero: boolean | string, data: unknown) {
    const key = `${page}_${type}_${excludeSodex}_${showZero}`
    this.caches.leaderboardPages.set(key, {
      data,
      timestamp: Date.now()
    })
    this._savePersistentLeaderboardCache()
  }

  // Total count cache
  getTotalCount(type: string, excludeSodex: boolean | string, showZero: boolean | string) {
    const key = `${type}_${excludeSodex}_${showZero}`
    const cached = this.caches.totalCounts.get(key)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.mainnetPage) {
      this.caches.totalCounts.delete(key)
      return null
    }
    return cached.count
  }

  setTotalCount(type: string, excludeSodex: boolean | string, showZero: boolean | string, count: number) {
    const key = `${type}_${excludeSodex}_${showZero}`
    this.caches.totalCounts.set(key, {
      count,
      timestamp: Date.now()
    })
    this._savePersistentLeaderboardCache()
  }

  // Top 10 cache
  getTop10(key: string) {
    const cached = this.caches.top10[key]
    if (!cached || !cached.timestamp) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.mainnetPage) {
      delete this.caches.top10[key]
      return null
    }
    return { gainers: cached.gainers, losers: cached.losers }
  }

  setTop10(gainers: unknown[], losers: unknown[], key: string) {
    this.caches.top10[key] = {
      gainers,
      losers,
      timestamp: Date.now()
    }
  }

  // User stats cache
  getUserStats() {
    const cached = this.caches.userStats
    if (!cached.data) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.mainnetPage) {
      this.caches.userStats = { data: null, timestamp: 0 }
      return null
    }
    return cached.data
  }

  setUserStats(data: unknown) {
    this.caches.userStats = {
      data,
      timestamp: Date.now()
    }
  }

  // Account data cache (MainnetTracker)
  getAccountData(accountId: string) {
    const cached = this.caches.accountData.get(accountId)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.tracker) {
      this.caches.accountData.delete(accountId)
      return null
    }
    return cached
  }

  setAccountData(accountId: string, data: Record<string, unknown>) {
    this.caches.accountData.set(accountId, {
      ...data,
      timestamp: Date.now()
    })
  }

  // Tickers cache (spot + futures)
  getTickers() {
    const cached = this.caches.tickers
    if (!cached.timestamp) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.platform) {
      this.caches.tickers = { spot: [], futures: [], timestamp: 0 }
      return null
    }
    return { spot: cached.spot, futures: cached.futures }
  }

  setTickers(spot: unknown[], futures: unknown[]) {
    this.caches.tickers = {
      spot,
      futures,
      timestamp: Date.now()
    }
  }

  // Newest traders cache
  getNewestTraders() {
    const cached = this.caches.newestTraders
    if (!cached.data || !cached.timestamp) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.platform) {
      this.caches.newestTraders = { data: [], timestamp: 0 }
      return null
    }
    return cached.data
  }

  setNewestTraders(data: unknown[]) {
    this.caches.newestTraders = {
      data,
      timestamp: Date.now()
    }
  }

  // Coin logo cache - check if logo URL was already validated
  getCoinLogoStatus(url: string) {
    const cached = this.caches.coinLogos.get(url)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.logos) {
      this.caches.coinLogos.delete(url)
      return null
    }
    return cached.loaded
  }

  setCoinLogoStatus(url: string, loaded: boolean) {
    this.caches.coinLogos.set(url, {
      loaded,
      timestamp: Date.now()
    })
  }

  // Weekly leaderboard page cache
  getWeeklyLeaderboardPage(weekNum: number | string, page: number | string, sort: string, excludeSodex: boolean | string) {
    const key = `${weekNum}_${page}_${sort}_${excludeSodex}`
    const cached = this.caches.weeklyLeaderboardPages.get(key)
    if (!cached) return null
    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.weeklyLb) {
      this.caches.weeklyLeaderboardPages.delete(key)
      return null
    }
    return cached.data
  }

  setWeeklyLeaderboardPage(weekNum: number | string, page: number | string, sort: string, excludeSodex: boolean | string, data: unknown) {
    const key = `${weekNum}_${page}_${sort}_${excludeSodex}`
    this.caches.weeklyLeaderboardPages.set(key, { data, timestamp: Date.now() })
    this._savePersistentLeaderboardCache()
  }

  // Weekly total count cache
  getWeeklyTotalCount(weekNum: number | string, sort: string, excludeSodex: boolean | string) {
    const key = `${weekNum}_${sort}_${excludeSodex}`
    const cached = this.caches.weeklyTotalCounts.get(key)
    if (!cached) return null
    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.weeklyLb) {
      this.caches.weeklyTotalCounts.delete(key)
      return null
    }
    return cached.count
  }

  setWeeklyTotalCount(weekNum: number | string, sort: string, excludeSodex: boolean | string, count: number) {
    const key = `${weekNum}_${sort}_${excludeSodex}`
    this.caches.weeklyTotalCounts.set(key, { count, timestamp: Date.now() })
    this._savePersistentLeaderboardCache()
  }

  // Leaderboard meta cache (long TTL, rarely changes)
  getLeaderboardMeta() {
    const cached = this.caches.leaderboardMeta
    if (!cached.data) return null
    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.meta) {
      this.caches.leaderboardMeta = { data: null, timestamp: 0 }
      return null
    }
    return cached.data
  }

  setLeaderboardMeta(data: unknown) {
    this.caches.leaderboardMeta = { data, timestamp: Date.now() }
    this._savePersistentLeaderboardCache()
  }

  // Weekly reward estimate cache
  getWeeklyRewardEstimate() {
    const cached = this.caches.weeklyRewardEstimate
    if (!cached.data) return null
    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.tracker) { // 2 min TTL
      this.caches.weeklyRewardEstimate = { data: null, timestamp: 0 }
      return null
    }
    return cached.data
  }

  setWeeklyRewardEstimate(data: unknown) {
    this.caches.weeklyRewardEstimate = { data, timestamp: Date.now() }
  }

  // Clear all caches
  clear() {
    this.caches.leaderboardPages.clear()
    this.caches.totalCounts.clear()
    this.caches.top10 = {} as Record<string, Top10Entry>
    this.caches.userStats = { data: null, timestamp: 0 }
    this.caches.accountData.clear()
    this.caches.tickers = { spot: [], futures: [], timestamp: 0 }
    this.caches.newestTraders = { data: [], timestamp: 0 }
    this.caches.coinLogos.clear()
    this.caches.weeklyLeaderboardPages.clear()
    this.caches.weeklyTotalCounts.clear()
    this.caches.leaderboardMeta = { data: null, timestamp: 0 }
    this.caches.weeklyRewardEstimate = { data: null, timestamp: 0 }
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('socialLeaderboardCache') } catch (e) { }
      try { localStorage.removeItem('leaderboardCache') } catch (e) { }
    }
  }
}

// Export singleton instance
export const globalCache = new GlobalCache()
