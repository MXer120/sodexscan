import React, { useState, useEffect } from 'react'
import Papa from 'papaparse'
import ChartCard from './ChartCard'
import PnLCalendar from './PnLCalendar'

const BASE_URL = 'https://mainnet-data.sodex.dev/api/v1/dashboard'
const PUKAI_START_DATE = '2024-12-01'
const NON_TRADING_DAYS = 1 // Dec 4 didn't trade

// Bot files to load (exclude DOGE)
const BOT_FILES = [
  'pukai',  // MAG7
  'eth',
  'sol',
  'btc',
  'soso',
  'ltc',
  'aave',
  'bnb',
  'bnb2',
  'uni',
  'xrp',
  'xaut',
  'link',
  'link2',
  'hype',
  'ada'
]

// Helper: Get week key (ISO week format: YYYY-WW)
const getWeekKey = (dateStr) => {
  const date = new Date(dateStr)
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export default function PukaiTab() {
  const [estimatedProfitData, setEstimatedProfitData] = useState([])
  const [volumeData, setVolumeData] = useState([])
  const [feesData, setFeesData] = useState([])
  const [realizedProfitData, setRealizedProfitData] = useState([])
  const [stats, setStats] = useState({
    totalTrades: 0,
    totalVolume: 0,
    totalPnL: 0,
    unrealizedPnL: 0,
    realizedPnL: 0,
    totalFees: 0,
    avgBuyFill: 0,
    avgSellFill: 0,
    activeHours: 0,
    activeDays: 0,
    activeHoursLeft: 0,
    profitPerHour: 0,
    uptimePercent: 0
  })
  const [activityData, setActivityData] = useState([])
  const [tradesPerDayData, setTradesPerDayData] = useState([])
  const [fillsPerDayData, setFillsPerDayData] = useState([])
  const [avgFillSizeData, setAvgFillSizeData] = useState([])
  const [ordersPerMinData, setOrdersPerMinData] = useState([])
  const [ordersPerHourData, setOrdersPerHourData] = useState([])
  const [weeklyProfitData, setWeeklyProfitData] = useState([])
  const [uptimeData, setUptimeData] = useState([])

  useEffect(() => {
    // Load spothistory first, then profit data, then mainnet accounts
    loadSpotHistoryData().then(() => {
      loadEstimatedProfitData()
      loadMainnetAccounts()
    })
  }, [])

  const loadSpotHistoryData = async () => {
    try {
      // Load all bot CSV files
      const allTrades = []
      const xautTrades = [] // Account 1515 for active time

      for (const botFile of BOT_FILES) {
        try {
          const response = await fetch(`/data/spot_history/${botFile}_history.csv`)
          const text = await response.text()

          await new Promise((resolve) => {
            Papa.parse(text, {
              header: true,
              dynamicTyping: true,
              complete: (results) => {
                const trades = results.data.filter(row => {
                  if (!row['Date & Time (UTC)']) return false
                  const date = row['Date & Time (UTC)'].split(' ')[0]
                  return date >= '2024-12-01' // Only Dec 1 onwards
                })

                allTrades.push(...trades)

                // Separate XAUt (account 1515) trades for active time calculation
                if (botFile === 'xaut') {
                  xautTrades.push(...trades)
                }

                resolve()
              }
            })
          })
        } catch (err) {
          console.warn(`Failed to load ${botFile}_history.csv:`, err)
        }
      }

      if (allTrades.length === 0) {
        console.error('No trade data loaded')
        return
      }

      // Group by date and calculate daily metrics (use ALL trades)
      const dailyData = {}
      const minuteBuckets = {}
      const hourBuckets = {}

      let totalBuyQty = 0
      let totalSellQty = 0
      let buyCount = 0
      let sellCount = 0

      allTrades.forEach(trade => {
        const dateTime = trade['Date & Time (UTC)']
        const date = dateTime.split(' ')[0] // Extract date part (YYYY-MM-DD)

        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            buys: 0,
            sells: 0,
            buyVolume: 0,
            sellVolume: 0,
            fees: 0,
            trades: 0,
            buyQtySum: 0,
            sellQtySum: 0,
            buyFills: 0,
            sellFills: 0
          }
        }

        const price = parseFloat(trade.Price) || 0
        const qty = parseFloat(trade.Quantity) || 0
        const fee = parseFloat(trade.Fee) || 0
        const volume = price * qty

        dailyData[date].trades++
        dailyData[date].fees += fee

        // Use Side (1=Buy 2=Sell) for more reliable comparison
        const sideNum = trade['Side (1=Buy 2=Sell)']
        if (sideNum === 1) {
          dailyData[date].buys += volume
          dailyData[date].buyVolume += volume
          dailyData[date].buyQtySum += qty
          dailyData[date].buyFills++
          totalBuyQty += qty
          buyCount++
        } else if (sideNum === 2) {
          dailyData[date].sells += volume
          dailyData[date].sellVolume += volume
          dailyData[date].sellQtySum += qty
          dailyData[date].sellFills++
          totalSellQty += qty
          sellCount++
        }

        // Track orders per minute/hour
        const timestamp = new Date(dateTime)
        const minuteKey = `${date} ${timestamp.getUTCHours().toString().padStart(2, '0')}:${timestamp.getUTCMinutes().toString().padStart(2, '0')}`
        const hourKey = `${date} ${timestamp.getUTCHours().toString().padStart(2, '0')}:00`

        minuteBuckets[minuteKey] = (minuteBuckets[minuteKey] || 0) + 1
        hourBuckets[hourKey] = (hourBuckets[hourKey] || 0) + 1
      })

      const avgBuyFill = buyCount > 0 ? totalBuyQty / buyCount : 0
      const avgSellFill = sellCount > 0 ? totalSellQty / sellCount : 0

      // Calculate active time using XAUt (account 1515): total time - gaps >5min
      const inactivityThreshold = 5 * 60 * 1000 // 5 minutes in ms
      let activeDays = 0
      let activeHoursLeft = 0
      let activeHours = 0

      if (xautTrades.length > 1) {
        // Sort trades by time (CSV is newest first, need oldest first)
        const sortedTrades = [...xautTrades].sort((a, b) => {
          const timeA = new Date(a['Date & Time (UTC)']).getTime()
          const timeB = new Date(b['Date & Time (UTC)']).getTime()
          return timeA - timeB
        })

        const firstTime = new Date(sortedTrades[0]['Date & Time (UTC)']).getTime()
        const lastTime = new Date(sortedTrades[sortedTrades.length - 1]['Date & Time (UTC)']).getTime()
        let totalTimeMs = lastTime - firstTime

        // Subtract all gaps >5min
        for (let i = 1; i < sortedTrades.length; i++) {
          const prevTime = new Date(sortedTrades[i - 1]['Date & Time (UTC)']).getTime()
          const currTime = new Date(sortedTrades[i]['Date & Time (UTC)']).getTime()
          const gap = currTime - prevTime

          if (gap > inactivityThreshold) {
            totalTimeMs -= gap
          }
        }

        activeHours = totalTimeMs / (1000 * 60 * 60)
        activeDays = Math.floor(activeHours / 24)
        activeHoursLeft = activeHours % 24
      }

      // Convert to array and calculate volume/fees
      const sortedDates = Object.keys(dailyData).sort()
      let cumulativeVolume = 0
      let cumulativeFees = 0

      const processedVolume = sortedDates.map(date => {
        const day = dailyData[date]
        const dailyVol = day.buyVolume + day.sellVolume
        cumulativeVolume += dailyVol

        return {
          date,
          daily_volume: Math.round(dailyVol * 100) / 100,
          cumulative: Math.round(cumulativeVolume * 100) / 100
        }
      })

      const processedFees = sortedDates.map(date => {
        const day = dailyData[date]
        cumulativeFees += day.fees

        return {
          date,
          daily_fees: Math.round(day.fees * 100) / 100,
          cumulative_fees: Math.round(cumulativeFees * 100) / 100
        }
      })

      setVolumeData(processedVolume)
      setFeesData(processedFees)

      // Process new chart data
      const tradesPerDay = sortedDates.map(date => ({
        date,
        trades: dailyData[date].trades
      }))
      setTradesPerDayData(tradesPerDay)

      const fillsPerDay = sortedDates.map(date => ({
        date,
        buy_fills: dailyData[date].buyFills,
        sell_fills: dailyData[date].sellFills
      }))
      setFillsPerDayData(fillsPerDay)

      const avgFillSizes = sortedDates.map(date => {
        const day = dailyData[date]
        return {
          date,
          avg_buy_fill: day.buyFills > 0 ? day.buyQtySum / day.buyFills : 0,
          avg_sell_fill: day.sellFills > 0 ? day.sellQtySum / day.sellFills : 0
        }
      })
      setAvgFillSizeData(avgFillSizes)

      // Orders per minute/hour by day
      const dailyOrdersPerMin = {}
      const dailyOrdersPerHour = {}

      Object.keys(minuteBuckets).forEach(key => {
        const date = key.split(' ')[0]
        if (!dailyOrdersPerMin[date]) dailyOrdersPerMin[date] = []
        dailyOrdersPerMin[date].push(minuteBuckets[key])
      })

      Object.keys(hourBuckets).forEach(key => {
        const date = key.split(' ')[0]
        if (!dailyOrdersPerHour[date]) dailyOrdersPerHour[date] = []
        dailyOrdersPerHour[date].push(hourBuckets[key])
      })

      const ordersPerMinData = sortedDates.map(date => ({
        date,
        avg_orders_per_min: dailyOrdersPerMin[date]
          ? dailyOrdersPerMin[date].reduce((a, b) => a + b, 0) / dailyOrdersPerMin[date].length
          : 0
      }))
      setOrdersPerMinData(ordersPerMinData)

      const ordersPerHourData = sortedDates.map(date => ({
        date,
        avg_orders_per_hour: dailyOrdersPerHour[date]
          ? dailyOrdersPerHour[date].reduce((a, b) => a + b, 0) / dailyOrdersPerHour[date].length
          : 0
      }))
      setOrdersPerHourData(ordersPerHourData)

      // Calculate daily and weekly active hours using XAUt (account 1515)
      if (xautTrades.length > 1) {
        const sortedTrades = [...xautTrades].sort((a, b) => {
          const timeA = new Date(a['Date & Time (UTC)']).getTime()
          const timeB = new Date(b['Date & Time (UTC)']).getTime()
          return timeA - timeB
        })

        // Group XAUt trades by date
        const dailyTrades = {}
        sortedTrades.forEach(trade => {
          const date = trade['Date & Time (UTC)'].split(' ')[0]
          if (!dailyTrades[date]) dailyTrades[date] = []
          dailyTrades[date].push(trade)
        })

        // Calculate active hours per day for XAUt
        const inactivityThreshold = 5 * 60 * 1000
        const dailyActiveHoursXaut = {}

        Object.keys(dailyTrades).forEach(date => {
          const dayTrades = dailyTrades[date]
          if (dayTrades.length < 2) {
            dailyActiveHoursXaut[date] = 0
            return
          }

          const firstTime = new Date(dayTrades[0]['Date & Time (UTC)']).getTime()
          const lastTime = new Date(dayTrades[dayTrades.length - 1]['Date & Time (UTC)']).getTime()
          let totalTimeMs = lastTime - firstTime

          // Subtract all gaps >5min
          for (let i = 1; i < dayTrades.length; i++) {
            const prevTime = new Date(dayTrades[i - 1]['Date & Time (UTC)']).getTime()
            const currTime = new Date(dayTrades[i]['Date & Time (UTC)']).getTime()
            const gap = currTime - prevTime

            if (gap > inactivityThreshold) {
              totalTimeMs -= gap
            }
          }

          dailyActiveHoursXaut[date] = totalTimeMs
        })

        // Daily uptime % based on XAUt (account 1515 only)
        const uptimePercentData = Object.keys(dailyActiveHoursXaut).sort().map(date => {
          const activeMs = dailyActiveHoursXaut[date]
          const activeHrs = activeMs / (1000 * 60 * 60)
          const uptimePercent = (activeHrs / 24) * 100
          return {
            date,
            uptime_percent: Math.round(uptimePercent * 100) / 100
          }
        })
        setUptimeData(uptimePercentData)

        // For weekly calculation, use XAUt (for consistency with total active time)
        const xautSortedTrades = [...xautTrades].sort((a, b) => {
          const timeA = new Date(a['Date & Time (UTC)']).getTime()
          const timeB = new Date(b['Date & Time (UTC)']).getTime()
          return timeA - timeB
        })

        const dailyTradesWeekly = {}
        xautSortedTrades.forEach(trade => {
          const date = trade['Date & Time (UTC)'].split(' ')[0]
          if (!dailyTradesWeekly[date]) dailyTradesWeekly[date] = []
          dailyTradesWeekly[date].push(trade)
        })

        const dailyActiveHours = {}

        Object.keys(dailyTradesWeekly).forEach(date => {
          const dayTrades = dailyTradesWeekly[date]
          if (dayTrades.length < 2) {
            dailyActiveHours[date] = 0
            return
          }

          const firstTime = new Date(dayTrades[0]['Date & Time (UTC)']).getTime()
          const lastTime = new Date(dayTrades[dayTrades.length - 1]['Date & Time (UTC)']).getTime()
          let totalTimeMs = lastTime - firstTime

          // Subtract all gaps >5min
          for (let i = 1; i < dayTrades.length; i++) {
            const prevTime = new Date(dayTrades[i - 1]['Date & Time (UTC)']).getTime()
            const currTime = new Date(dayTrades[i]['Date & Time (UTC)']).getTime()
            const gap = currTime - prevTime

            if (gap > inactivityThreshold) {
              totalTimeMs -= gap
            }
          }

          dailyActiveHours[date] = totalTimeMs
        })

        window.__dailyActiveHours = dailyActiveHours

        // Calculate weekly active hours (use XAUt)
        const weeklyTrades = {}
        xautSortedTrades.forEach(trade => {
          const date = trade['Date & Time (UTC)'].split(' ')[0]
          const weekKey = getWeekKey(date)
          if (!weeklyTrades[weekKey]) weeklyTrades[weekKey] = []
          weeklyTrades[weekKey].push(trade)
        })

        const weeklyActiveHours = {}

        Object.keys(weeklyTrades).forEach(weekKey => {
          const weekTrades = weeklyTrades[weekKey]
          if (weekTrades.length < 2) {
            weeklyActiveHours[weekKey] = 0
            return
          }

          const firstTime = new Date(weekTrades[0]['Date & Time (UTC)']).getTime()
          const lastTime = new Date(weekTrades[weekTrades.length - 1]['Date & Time (UTC)']).getTime()
          let totalTimeMs = lastTime - firstTime

          // Subtract all gaps >5min
          for (let i = 1; i < weekTrades.length; i++) {
            const prevTime = new Date(weekTrades[i - 1]['Date & Time (UTC)']).getTime()
            const currTime = new Date(weekTrades[i]['Date & Time (UTC)']).getTime()
            const gap = currTime - prevTime

            if (gap > inactivityThreshold) {
              totalTimeMs -= gap
            }
          }

          weeklyActiveHours[weekKey] = totalTimeMs
        })

        // Store for use with profit data
        window.__weeklyActiveHours = weeklyActiveHours
      }

      const totalTrades = Object.values(dailyData).reduce((sum, day) => sum + day.trades, 0)
      const totalVolume = cumulativeVolume
      const totalFees = cumulativeFees

      // Calculate overall uptime %
      const now = new Date()
      const startDate = new Date('2024-12-01')
      const totalDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))
      const totalPossibleHours = totalDays * 24
      const uptimePercent = totalPossibleHours > 0 ? (activeHours / totalPossibleHours) * 100 : 0

      setStats(prev => ({
        ...prev,
        totalTrades,
        totalVolume,
        totalFees,
        avgBuyFill: Math.round(avgBuyFill * 100) / 100,
        avgSellFill: Math.round(avgSellFill * 100) / 100,
        activeHours: Math.round(activeHours * 100) / 100,
        activeDays,
        activeHoursLeft: Math.round(activeHoursLeft * 100) / 100,
        uptimePercent: Math.round(uptimePercent * 100) / 100
      }))
    } catch (err) {
      console.error('Failed to load bot CSV files:', err)
    }
  }

  const loadEstimatedProfitData = async () => {
    try {
      const response = await fetch('/data/pukai_profit.csv')
      const text = await response.text()

      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          const data = results.data.filter(row => row.date && row.date >= '2024-12-01')

          // Find Dec 1 baseline profit
          let dec1Profit = 0
          const dec1Row = data.find(row => row.date === '2024-12-01')
          if (dec1Row) {
            dec1Profit = dec1Row.total_profit || 0
          }

          // Estimated profit data with 7-day moving average, rebased to Dec 1
          const estimatedData = data.map((row, i) => {
            // Calculate 7-day moving average (includes all coins)
            const windowSize = 7
            let sum = 0
            let count = 0
            for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
              if (data[j]) {
                const dailyTotal = (data[j].daily_profit || 0) + (data[j].ethkai_profit || 0) + (data[j].xaut_profit || 0) + (data[j].soso_profit || 0) + (data[j].btc_profit || 0) + (data[j].sol_profit || 0) + (data[j].ltc_profit || 0) + (data[j].doge_profit || 0) + (data[j].aave_profit || 0) + (data[j].bnb_profit || 0) + (data[j].uni_profit || 0) + (data[j].xrp_profit || 0) + (data[j].link_profit || 0) + (data[j].hype_profit || 0) + (data[j].ada_profit || 0)
                sum += dailyTotal
                count++
              }
            }
            const ma7 = count > 0 ? sum / count : 0

            return {
              date: row.date,
              daily_profit: row.daily_profit || 0,
              ethkai_profit: row.ethkai_profit || 0,
              xaut_profit: row.xaut_profit || 0,
              soso_profit: row.soso_profit || 0,
              btc_profit: row.btc_profit || 0,
              sol_profit: row.sol_profit || 0,
              ltc_profit: row.ltc_profit || 0,
              doge_profit: row.doge_profit || 0,
              aave_profit: row.aave_profit || 0,
              bnb_profit: row.bnb_profit || 0,
              uni_profit: row.uni_profit || 0,
              xrp_profit: row.xrp_profit || 0,
              link_profit: row.link_profit || 0,
              hype_profit: row.hype_profit || 0,
              ada_profit: row.ada_profit || 0,
              total_profit: (row.total_profit || 0) - dec1Profit,
              ma7: Math.round(ma7 * 100) / 100
            }
          })
          setEstimatedProfitData(estimatedData)

          // Realized profit data (rebased to Dec 1)
          let dec1Realized = 0
          let dec1Bitget = 0
          if (dec1Row) {
            dec1Realized = dec1Row.realized_profit || 0
            dec1Bitget = dec1Row.bitget_realized || 0
          }

          const realizedData = data.map(row => ({
            ...row,
            realized_profit: (row.realized_profit || 0) - dec1Realized,
            bitget_realized: (row.bitget_realized || 0) - dec1Bitget,
            other_realized: Math.max(0, ((row.realized_profit || 0) - dec1Realized) - ((row.bitget_realized || 0) - dec1Bitget)),
          }))
          setRealizedProfitData(realizedData)

          // Calculate weekly profit data
          const weeklyData = {}
          data.forEach((row, i) => {
            if (!row.date) return
            const weekKey = getWeekKey(row.date)

            if (!weeklyData[weekKey]) {
              weeklyData[weekKey] = {
                week: weekKey,
                weeklyProfit: 0,
                startProfit: i > 0 ? data[i - 1].total_profit || 0 : 0,
                dates: []
              }
            }
            weeklyData[weekKey].dates.push(row.date)
          })

          // Calculate weekly profit from total profit changes
          const sortedWeeks = Object.keys(weeklyData).sort()
          let cumulativeProfit = 0

          const weeklyProfitArray = sortedWeeks.map((weekKey, i) => {
            const week = weeklyData[weekKey]
            // Find last day of this week
            const weekDays = data.filter(d => d.date && getWeekKey(d.date) === weekKey)
            const lastDay = weekDays[weekDays.length - 1]
            const endProfit = lastDay ? lastDay.total_profit || 0 : 0

            const weeklyProfit = endProfit - week.startProfit
            cumulativeProfit += weeklyProfit

            const activeHoursMs = (window.__weeklyActiveHours && window.__weeklyActiveHours[weekKey]) || 0
            const activeHours = activeHoursMs / (1000 * 60 * 60)
            const profitPerHour = activeHours > 0 ? weeklyProfit / activeHours : 0

            // Get date range for this week (format: Dec 1 - Dec 7)
            const sortedDates = week.dates.sort()
            const formatDate = (dateStr) => {
              const d = new Date(dateStr)
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
              return `${months[d.getMonth()]} ${d.getDate()}`
            }
            const startDate = formatDate(sortedDates[0])
            const endDate = formatDate(sortedDates[sortedDates.length - 1])
            const dateRange = `${startDate} - ${endDate}`

            return {
              week: dateRange,
              weekly_profit: Math.round(weeklyProfit * 100) / 100,
              profit_per_hour: Math.round(profitPerHour * 100) / 100,
              cumulative_profit: Math.round(cumulativeProfit * 100) / 100,
              active_hours: Math.round(activeHours * 100) / 100
            }
          })

          setWeeklyProfitData(weeklyProfitArray)

          // Set totalPnL from last row (rebased)
          const totalPnL = data.length > 0 ? (data[data.length - 1].total_profit || 0) - dec1Profit : 0
          setStats(prev => {
            const profitPerHour = prev.activeHours > 0 ? totalPnL / prev.activeHours : 0
            return {
              ...prev,
              totalPnL,
              profitPerHour: Math.round(profitPerHour * 100) / 100
            }
          })
        }
      })
    } catch (err) {
      console.error('Failed to load pukai_profit.csv:', err)
    }
  }

  const loadMainnetAccounts = async () => {
    try {
      const response = await fetch('/data/mainnet_profit.csv')
      const text = await response.text()

      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          const accounts = results.data.filter(row => row.account_id)

          // Calculate totals across all accounts
          let totalDeposits = 0
          let totalBalance = 0
          let totalUnrealized = 0
          let totalRealized = 0
          let totalPnL = 0

          accounts.forEach(account => {
            totalDeposits += account.total_deposits || 0
            totalBalance += account.current_balance || 0
            totalUnrealized += account.unrealized_pnl || 0
            totalRealized += account.realized_pnl || 0
            totalPnL += account.total_pnl || 0
          })

          // Update stats with accurate profit data
          setStats(prev => {
            const profitPerHour = prev.activeHours > 0 ? totalPnL / prev.activeHours : 0
            return {
              ...prev,
              totalPnL: Math.round(totalPnL * 100) / 100,
              unrealizedPnL: Math.round(totalUnrealized * 100) / 100,
              realizedPnL: Math.round(totalRealized * 100) / 100,
              profitPerHour: Math.round(profitPerHour * 100) / 100,
              totalDeposits: Math.round(totalDeposits * 100) / 100,
              totalBalance: Math.round(totalBalance * 100) / 100
            }
          })
        }
      })
    } catch (err) {
      console.error('Failed to load mainnet_profit.csv:', err)
    }
  }

  const generateDummyData = () => {
    const data = []
    let totalProfit = 0
    let totalRealized = 0
    let bitgetRealized = 0

    for (let i = 20; i >= 0; i--) {
      const date = new Date('2024-12-01')
      date.setDate(date.getDate() + (20 - i))

      const dailyProfit = (Math.random() - 0.3) * 100
      const dailyRealized = Math.random() * 50
      const dailyBitget = dailyRealized * (0.3 + Math.random() * 0.4)

      totalProfit += dailyProfit
      totalRealized += dailyRealized
      bitgetRealized += dailyBitget

      data.push({
        date: date.toISOString().split('T')[0],
        daily_profit: Math.round(dailyProfit * 100) / 100,
        total_profit: Math.round(totalProfit * 100) / 100,
        realized_profit: Math.round(totalRealized * 100) / 100,
        bitget_realized: Math.round(bitgetRealized * 100) / 100,
        other_realized: Math.round((totalRealized - bitgetRealized) * 100) / 100,
        trades: 1146,
        volume: 37336
      })
    }
    return data
  }


  const formatNumber = (num, prefix = '') => {
    if (num >= 1000000) return `${prefix}${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${prefix}${(num / 1000).toFixed(2)}K`
    return `${prefix}${num.toFixed(2)}`
  }

  const profitSeries = [
    { key: 'total_profit', label: 'Total Profit', type: 'line', cumulative: true },
    { key: 'daily_profit', label: 'MAG7 Profit', type: 'bar' },
    { key: 'ethkai_profit', label: 'ETH Profit', type: 'bar' },
    { key: 'xaut_profit', label: 'XAUt Profit', type: 'bar' },
    { key: 'soso_profit', label: 'SOSO Profit', type: 'bar' },
    { key: 'btc_profit', label: 'BTC Profit', type: 'bar' },
    { key: 'sol_profit', label: 'SOL Profit', type: 'bar' },
    { key: 'ltc_profit', label: 'LTC Profit', type: 'bar' },
    { key: 'doge_profit', label: 'DOGE Profit', type: 'bar' },
    { key: 'aave_profit', label: 'AAVE Profit', type: 'bar' },
    { key: 'bnb_profit', label: 'BNB Profit', type: 'bar' },
    { key: 'uni_profit', label: 'UNI Profit', type: 'bar' },
    { key: 'xrp_profit', label: 'XRP Profit', type: 'bar' },
    { key: 'link_profit', label: 'LINK Profit', type: 'bar' },
    { key: 'hype_profit', label: 'HYPE Profit', type: 'bar' },
    { key: 'ada_profit', label: 'ADA Profit', type: 'bar' },
    { key: 'ma7', label: '7D MA', type: 'line' }
  ]

  const profitColors = {
    'MAG7 Profit': '#3CC8F0',
    'ETH Profit': '#a855f7',
    'XAUt Profit': '#fbbf24',
    'SOSO Profit': '#f97316',
    'BTC Profit': '#f7931a',
    'SOL Profit': '#14f195',
    'LTC Profit': '#345d9d',
    'DOGE Profit': '#c2a633',
    'AAVE Profit': '#B6509E',
    'BNB Profit': '#F3BA2F',
    'UNI Profit': '#FF007A',
    'XRP Profit': '#23292F',
    'LINK Profit': '#2A5ADA',
    'HYPE Profit': '#FF6B35',
    'ADA Profit': '#0033AD'
  }

  const realizedSeries = [
    { key: 'bitget_realized', label: 'Bitget Realized', type: 'bar' },
    { key: 'other_realized', label: 'Other Realized', type: 'bar' }
  ]

  const volumeSeries = [
    { key: 'cumulative', label: 'Cumulative Volume', type: 'line', cumulative: true },
    { key: 'daily_volume', label: 'Daily Volume', type: 'bar' }
  ]

  const feesSeries = [
    { key: 'cumulative_fees', label: 'Cumulative Fees', type: 'line', cumulative: true },
    { key: 'daily_fees', label: 'Daily Fees', type: 'bar' }
  ]

  const volumeColors = {
    'Daily Volume': '#888888'
  }

  const feesColors = {
    'Daily Fees': '#ff4444'
  }

  const tradesPerDaySeries = [
    { key: 'trades', label: 'Trades', type: 'bar' }
  ]

  const fillsPerDaySeries = [
    { key: 'buy_fills', label: 'Buy Fills', type: 'bar' },
    { key: 'sell_fills', label: 'Sell Fills', type: 'bar' }
  ]

  const avgFillSizeSeries = [
    { key: 'avg_buy_fill', label: 'Avg Buy Fill', type: 'line' },
    { key: 'avg_sell_fill', label: 'Avg Sell Fill', type: 'line' }
  ]

  const ordersPerMinSeries = [
    { key: 'avg_orders_per_min', label: 'Avg Orders/Min', type: 'bar' }
  ]

  const ordersPerHourSeries = [
    { key: 'avg_orders_per_hour', label: 'Avg Orders/Hour', type: 'bar' }
  ]

  const fillSizeColors = {
    'Avg Buy Fill': '#3CC8F0',
    'Avg Sell Fill': '#ff4444'
  }

  const fillsPerDayColors = {
    'Buy Fills': '#3CC8F0',
    'Sell Fills': '#ff4444'
  }

  const weeklyProfitSeries = [
    { key: 'weekly_profit', label: 'Weekly Profit', type: 'bar' },
    { key: 'profit_per_hour', label: '$/Hour', type: 'line' },
    { key: 'cumulative_profit', label: 'Cumulative Profit', type: 'line', cumulative: true }
  ]

  const weeklyProfitColors = {
    'Weekly Profit': '#3CC8F0',
    '$/Hour': '#888888',
    'Cumulative Profit': '#00ff00'
  }

  const uptimeSeries = [
    { key: 'uptime_percent', label: 'Uptime %', type: 'bar' }
  ]

  const uptimeColors = {
    'Uptime %': '#3CC8F0'
  }

  return (
    <>
      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-label">Total Executed Trades</span>
          <span className="stat-value">{formatNumber(stats.totalTrades)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Volume (USDC)</span>
          <span className="stat-value">{formatNumber(stats.totalVolume, '$')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total PnL</span>
          <span className="stat-value" style={{ color: stats.totalPnL >= 0 ? '#3CC8F0' : '#ff4444' }}>
            {formatNumber(stats.totalPnL, '$')}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Unrealized PnL</span>
          <span className="stat-value" style={{ color: stats.unrealizedPnL >= 0 ? '#3CC8F0' : '#ff4444' }}>
            {formatNumber(stats.unrealizedPnL, '$')}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Realized PnL</span>
          <span className="stat-value" style={{ color: stats.realizedPnL >= 0 ? '#3CC8F0' : '#ff4444' }}>
            {formatNumber(stats.realizedPnL, '$')}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Fees Paid</span>
          <span className="stat-value" style={{ color: '#ff4444' }}>
            {formatNumber(stats.totalFees, '$')}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg Fill Size</span>
          <span className="stat-value">
            <span style={{ color: '#3CC8F0' }}>{stats.avgBuyFill.toFixed(2)}</span>
            <span style={{ color: '#ffffff' }}> / </span>
            <span style={{ color: '#ff4444' }}>{stats.avgSellFill.toFixed(2)}</span>
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Active Time</span>
          <span className="stat-value">
            {stats.activeDays}d + {stats.activeHoursLeft.toFixed(2)}h
            <span style={{ color: '#888888', fontSize: '12px', marginLeft: '8px' }}>
              ({stats.uptimePercent.toFixed(2)}%)
            </span>
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Profit/Hour</span>
          <span className="stat-value" style={{ color: stats.profitPerHour >= 0 ? '#3CC8F0' : '#ff4444' }}>
            {formatNumber(stats.profitPerHour, '$')}/h
          </span>
        </div>
      </div>

      <div className="calendar-section">
        <PnLCalendar data={estimatedProfitData} startDate={PUKAI_START_DATE} />
      </div>

      <div className="charts-grid">
        <ChartCard
          title="Estimated Profit"
          data={estimatedProfitData}
          series={profitSeries}
          showCumulative={true}
          stacked={true}
          defaultSelected={['total_profit', 'daily_profit', 'ethkai_profit', 'xaut_profit', 'soso_profit', 'btc_profit', 'sol_profit', 'ltc_profit', 'doge_profit', 'aave_profit', 'bnb_profit', 'uni_profit', 'xrp_profit', 'link_profit', 'hype_profit', 'ada_profit']}
          customColors={profitColors}
        />
        <ChartCard
          title="Realized Profit"
          data={realizedProfitData}
          series={realizedSeries}
          stacked={true}
          defaultSelected={['bitget_realized', 'other_realized']}
        />
        <ChartCard
          title="Weekly Profit & $/Hour"
          data={weeklyProfitData}
          series={weeklyProfitSeries}
          showCumulative={true}
          defaultSelected={['weekly_profit', 'profit_per_hour', 'cumulative_profit']}
          customColors={weeklyProfitColors}
        />
        <ChartCard
          title="Volume (USDC)"
          data={volumeData}
          series={volumeSeries}
          showCumulative={true}
          defaultSelected={['cumulative', 'daily_volume']}
          customColors={volumeColors}
        />
        <ChartCard
          title="Fees Paid"
          data={feesData}
          series={feesSeries}
          showCumulative={true}
          defaultSelected={['cumulative_fees', 'daily_fees']}
          customColors={feesColors}
        />
        <ChartCard
          title="Trades Per Day"
          data={tradesPerDayData}
          series={tradesPerDaySeries}
          defaultSelected={['trades']}
        />
        <ChartCard
          title="Fills Per Day"
          data={fillsPerDayData}
          series={fillsPerDaySeries}
          stacked={true}
          defaultSelected={['buy_fills', 'sell_fills']}
          customColors={fillsPerDayColors}
        />
        <ChartCard
          title="Avg Buy Fill Size"
          data={avgFillSizeData}
          series={[{ key: 'avg_buy_fill', label: 'Avg Buy Fill', type: 'bar' }]}
          defaultSelected={['avg_buy_fill']}
          customColors={{ 'Avg Buy Fill': '#3CC8F0' }}
        />
        <ChartCard
          title="Avg Sell Fill Size"
          data={avgFillSizeData}
          series={[{ key: 'avg_sell_fill', label: 'Avg Sell Fill', type: 'bar' }]}
          defaultSelected={['avg_sell_fill']}
          customColors={{ 'Avg Sell Fill': '#ff4444' }}
        />
        <ChartCard
          title="Avg Orders Per Minute"
          data={ordersPerMinData}
          series={ordersPerMinSeries}
          defaultSelected={['avg_orders_per_min']}
        />
        <ChartCard
          title="Avg Orders Per Hour"
          data={ordersPerHourData}
          series={ordersPerHourSeries}
          defaultSelected={['avg_orders_per_hour']}
        />
        <ChartCard
          title="Daily Uptime %"
          data={uptimeData}
          series={uptimeSeries}
          defaultSelected={['uptime_percent']}
          customColors={uptimeColors}
        />
      </div>
    </>
  )
}
