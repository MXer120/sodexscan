/**
 * Global cache that persists across component mounts/unmounts
 * Used to avoid refetching data when navigating between pages
 */

class GlobalCache {
  constructor() {
    this.caches = {
      // MainnetPage caches
      leaderboardPages: new Map(), // key: "page_type_excludeSodex" -> {data, timestamp}
      totalCounts: new Map(),      // key: "type_excludeSodex" -> {count, timestamp}
      top10: { gainers: [], losers: [], timestamp: 0 },
      userStats: { data: null, timestamp: 0 },

      // MainnetTracker caches
      accountData: new Map(),      // key: accountId -> {accountDetails, balances, etc., timestamp}

      // Platform/TopPairs caches
      tickers: { spot: [], futures: [], timestamp: 0 },
      newestTraders: { data: [], timestamp: 0 },

      // Coin logos cache (long TTL, logos don't change often)
      coinLogos: new Map(), // url -> { loaded: bool, timestamp }

      // Social leaderboard caches - key: "lb:{view}:{group_id}:{limit}"
      socialLeaderboards: new Map(), // key -> {data, timestamp, fetchTime}
      socialPersistent: null, // localStorage backup, loaded on init

      // Social page leaderboard cache - key: "viewKey_page"
      socialPages: new Map(), // key -> {data, totalCount, fetchTime, timestamp}

      // Social stats (group_stats_daily) cache
      socialStats: { data: null, timestamp: 0 },

      // Weekly leaderboard caches
      weeklyLeaderboardPages: new Map(), // key: "weekNum_page_sort_excludeSodex"
      weeklyTotalCounts: new Map(),      // key: "weekNum_sort_excludeSodex"
      leaderboardMeta: { data: null, timestamp: 0 },
      weeklyRewardEstimate: { data: null, timestamp: 0 },

    }

    this.TTL = {
      mainnetPage: 5 * 60 * 1000,  // 5 minutes
      tracker: 2 * 60 * 1000,       // 2 minutes
      platform: 5 * 60 * 1000,      // 5 minutes for tickers & new traders
      logos: 24 * 60 * 60 * 1000,   // 24 hours for logos
      social: 10 * 60 * 1000        // 10 minutes for social leaderboards
    }

    // Load persistent cache from localStorage
    this._loadPersistentSocialCache()
  }

  // Load social cache from localStorage
  _loadPersistentSocialCache() {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem('socialLeaderboardCache')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Restore to Map
        Object.entries(parsed).forEach(([key, value]) => {
          this.caches.socialLeaderboards.set(key, value)
        })
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  // Save social cache to localStorage
  _savePersistentSocialCache() {
    if (typeof window === 'undefined') return
    try {
      const obj = {}
      this.caches.socialLeaderboards.forEach((value, key) => {
        obj[key] = value
      })
      localStorage.setItem('socialLeaderboardCache', JSON.stringify(obj))
    } catch (e) {
      // Ignore localStorage errors (quota, etc)
    }
  }

  // Leaderboard page cache
  getLeaderboardPage(page, type, excludeSodex, showZero) {
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

  setLeaderboardPage(page, type, excludeSodex, showZero, data) {
    const key = `${page}_${type}_${excludeSodex}_${showZero}`
    this.caches.leaderboardPages.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  // Total count cache
  getTotalCount(type, excludeSodex, showZero) {
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

  setTotalCount(type, excludeSodex, showZero, count) {
    const key = `${type}_${excludeSodex}_${showZero}`
    this.caches.totalCounts.set(key, {
      count,
      timestamp: Date.now()
    })
  }

  // Top 10 cache
  getTop10(showZero, excludeSodex) {
    const key = `top10_${showZero}_${excludeSodex}`
    const cached = this.caches.top10[key]
    if (!cached || !cached.timestamp) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.mainnetPage) {
      delete this.caches.top10[key]
      return null
    }
    return { gainers: cached.gainers, losers: cached.losers }
  }

  setTop10(gainers, losers, showZero, excludeSodex) {
    const key = `top10_${showZero}_${excludeSodex}`
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

  setUserStats(data) {
    this.caches.userStats = {
      data,
      timestamp: Date.now()
    }
  }

  // Account data cache (MainnetTracker)
  getAccountData(accountId) {
    const cached = this.caches.accountData.get(accountId)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.tracker) {
      this.caches.accountData.delete(accountId)
      return null
    }
    return cached
  }

  setAccountData(accountId, data) {
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

  setTickers(spot, futures) {
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

  setNewestTraders(data) {
    this.caches.newestTraders = {
      data,
      timestamp: Date.now()
    }
  }

  // Coin logo cache - check if logo URL was already validated
  getCoinLogoStatus(url) {
    const cached = this.caches.coinLogos.get(url)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.logos) {
      this.caches.coinLogos.delete(url)
      return null
    }
    return cached.loaded
  }

  setCoinLogoStatus(url, loaded) {
    this.caches.coinLogos.set(url, {
      loaded,
      timestamp: Date.now()
    })
  }

  // Social leaderboard cache - key format: "lb:{view}:{group_id}:{limit}"
  getSocialLeaderboard(view, groupId = null, limit = 50) {
    const key = `lb:${view}:${groupId || 'all'}:${limit}`
    const cached = this.caches.socialLeaderboards.get(key)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    const isStale = age >= this.TTL.social

    // Return data even if stale (for resilience), but mark it
    return {
      data: cached.data,
      fetchTime: cached.fetchTime,
      isStale
    }
  }

  setSocialLeaderboard(view, groupId = null, limit = 50, data) {
    const key = `lb:${view}:${groupId || 'all'}:${limit}`
    const entry = {
      data,
      timestamp: Date.now(),
      fetchTime: new Date().toISOString()
    }
    this.caches.socialLeaderboards.set(key, entry)
    this._savePersistentSocialCache()
  }

  // Check if social data is fresh (not stale)
  isSocialFresh(view, groupId = null, limit = 50) {
    const key = `lb:${view}:${groupId || 'all'}:${limit}`
    const cached = this.caches.socialLeaderboards.get(key)
    if (!cached) return false
    return Date.now() - cached.timestamp < this.TTL.social
  }

  // Social stats cache (group_stats_daily)
  getSocialStats() {
    const cached = this.caches.socialStats
    if (!cached.data) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.social) {
      this.caches.socialStats = { data: null, timestamp: 0 }
      return null
    }
    return cached.data
  }

  setSocialStats(data) {
    this.caches.socialStats = {
      data,
      timestamp: Date.now()
    }
  }

  // Social page cache (per view + page)
  getSocialPage(viewKey, page) {
    const key = `${viewKey}_${page}`
    const cached = this.caches.socialPages.get(key)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.social) {
      this.caches.socialPages.delete(key)
      return null
    }
    return cached
  }

  setSocialPage(viewKey, page, data, totalCount, fetchTime) {
    const key = `${viewKey}_${page}`
    this.caches.socialPages.set(key, {
      data,
      totalCount,
      fetchTime,
      timestamp: Date.now()
    })
  }

  // Weekly leaderboard page cache
  getWeeklyLeaderboardPage(weekNum, page, sort, excludeSodex) {
    const key = `${weekNum}_${page}_${sort}_${excludeSodex}`
    const cached = this.caches.weeklyLeaderboardPages.get(key)
    if (!cached) return null
    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.mainnetPage) {
      this.caches.weeklyLeaderboardPages.delete(key)
      return null
    }
    return cached.data
  }

  setWeeklyLeaderboardPage(weekNum, page, sort, excludeSodex, data) {
    const key = `${weekNum}_${page}_${sort}_${excludeSodex}`
    this.caches.weeklyLeaderboardPages.set(key, { data, timestamp: Date.now() })
  }

  // Weekly total count cache
  getWeeklyTotalCount(weekNum, sort, excludeSodex) {
    const key = `${weekNum}_${sort}_${excludeSodex}`
    const cached = this.caches.weeklyTotalCounts.get(key)
    if (!cached) return null
    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.mainnetPage) {
      this.caches.weeklyTotalCounts.delete(key)
      return null
    }
    return cached.count
  }

  setWeeklyTotalCount(weekNum, sort, excludeSodex, count) {
    const key = `${weekNum}_${sort}_${excludeSodex}`
    this.caches.weeklyTotalCounts.set(key, { count, timestamp: Date.now() })
  }

  // Leaderboard meta cache
  getLeaderboardMeta() {
    const cached = this.caches.leaderboardMeta
    if (!cached.data) return null
    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.mainnetPage) {
      this.caches.leaderboardMeta = { data: null, timestamp: 0 }
      return null
    }
    return cached.data
  }

  setLeaderboardMeta(data) {
    this.caches.leaderboardMeta = { data, timestamp: Date.now() }
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

  setWeeklyRewardEstimate(data) {
    this.caches.weeklyRewardEstimate = { data, timestamp: Date.now() }
  }

  // Clear all caches
  clear() {
    this.caches.leaderboardPages.clear()
    this.caches.totalCounts.clear()
    this.caches.top10 = { gainers: [], losers: [], timestamp: 0 }
    this.caches.userStats = { data: null, timestamp: 0 }
    this.caches.accountData.clear()
    this.caches.tickers = { spot: [], futures: [], timestamp: 0 }
    this.caches.newestTraders = { data: [], timestamp: 0 }
    this.caches.coinLogos.clear()
    this.caches.socialLeaderboards.clear()
    this.caches.socialPages.clear()
    this.caches.socialStats = { data: null, timestamp: 0 }
    this.caches.weeklyLeaderboardPages.clear()
    this.caches.weeklyTotalCounts.clear()
    this.caches.leaderboardMeta = { data: null, timestamp: 0 }
    this.caches.weeklyRewardEstimate = { data: null, timestamp: 0 }
    this.caches.spotAllTimeData = { data: null, timestamp: 0 }
    this.caches.spotLocalData = { data: null, timestamp: 0 }
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('socialLeaderboardCache') } catch (e) { }
    }
  }
}

// Export singleton instance
export const globalCache = new GlobalCache()
