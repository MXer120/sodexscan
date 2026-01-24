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
      coinLogos: new Map() // url -> { loaded: bool, timestamp }
    }

    this.TTL = {
      mainnetPage: 5 * 60 * 1000,  // 5 minutes
      tracker: 2 * 60 * 1000,       // 2 minutes
      platform: 5 * 60 * 1000,      // 5 minutes for tickers & new traders
      logos: 24 * 60 * 60 * 1000    // 24 hours for logos
    }
  }

  // Leaderboard page cache
  getLeaderboardPage(page, type, excludeSodex) {
    const key = `${page}_${type}_${excludeSodex}`
    const cached = this.caches.leaderboardPages.get(key)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.mainnetPage) {
      this.caches.leaderboardPages.delete(key)
      return null
    }
    return cached.data
  }

  setLeaderboardPage(page, type, excludeSodex, data) {
    const key = `${page}_${type}_${excludeSodex}`
    this.caches.leaderboardPages.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  // Total count cache
  getTotalCount(type, excludeSodex) {
    const key = `${type}_${excludeSodex}`
    const cached = this.caches.totalCounts.get(key)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.mainnetPage) {
      this.caches.totalCounts.delete(key)
      return null
    }
    return cached.count
  }

  setTotalCount(type, excludeSodex, count) {
    const key = `${type}_${excludeSodex}`
    this.caches.totalCounts.set(key, {
      count,
      timestamp: Date.now()
    })
  }

  // Top 10 cache
  getTop10() {
    const cached = this.caches.top10
    if (!cached.timestamp) return null

    const age = Date.now() - cached.timestamp
    if (age >= this.TTL.mainnetPage) {
      this.caches.top10 = { gainers: [], losers: [], timestamp: 0 }
      return null
    }
    return { gainers: cached.gainers, losers: cached.losers }
  }

  setTop10(gainers, losers) {
    this.caches.top10 = {
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
  }
}

// Export singleton instance
export const globalCache = new GlobalCache()
