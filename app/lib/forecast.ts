/**
 * Holt-Winters additive forecasting with day-of-week seasonality.
 * Trains on historical daily data, generalizes to future via
 * level + trend + seasonal components.
 *
 * Why Holt-Winters:
 * - Captures level (base), trend (growth direction), and seasonality (weekly patterns)
 * - Auto-adapts to changing growth rates via exponential smoothing
 * - Works well with daily time series and limited data (no ML infra needed)
 * - Runs in <1ms client-side
 */

interface DailyPoint {
  date: number   // timestamp ms
  newUsers: number
}

interface ForecastPoint {
  date: number
  newUsers: number
  totalUsers: number
  predictedTotal: number
  isPredicted: true
}

interface ForecastResult {
  points: ForecastPoint[]
  avgDailyGrowth: number
  confidence: number // 0-1 based on fit quality
}

// Holt-Winters additive with period=7 (weekly seasonality)
const PERIOD = 7

export function forecast(
  history: DailyPoint[],
  daysAhead: number,
  lastCumulative: number
): ForecastResult {
  if (history.length < PERIOD * 2) {
    // Fallback: simple EMA for short history
    return fallbackForecast(history, daysAhead, lastCumulative)
  }

  // --- Phase 1: Initialize components ---
  const y = history.map(d => d.newUsers)
  const n = y.length

  // Initial level & trend from first two full seasons
  const firstSeasonAvg = y.slice(0, PERIOD).reduce((a, b) => a + b, 0) / PERIOD
  const secondSeasonAvg = y.slice(PERIOD, PERIOD * 2).reduce((a, b) => a + b, 0) / PERIOD
  let level = firstSeasonAvg
  let trend = (secondSeasonAvg - firstSeasonAvg) / PERIOD

  // Initial seasonal indices (additive)
  const seasonal = new Array(PERIOD).fill(0)
  for (let i = 0; i < PERIOD; i++) {
    let sum = 0
    let count = 0
    for (let j = i; j < Math.min(n, PERIOD * 3); j += PERIOD) {
      const seasonAvg = y.slice(Math.floor(j / PERIOD) * PERIOD, Math.floor(j / PERIOD) * PERIOD + PERIOD)
        .reduce((a, b) => a + b, 0) / PERIOD
      sum += y[j] - seasonAvg
      count++
    }
    seasonal[i] = count > 0 ? sum / count : 0
  }

  // --- Phase 2: Fit (train) via triple exponential smoothing ---
  // Adaptive alphas based on data volatility
  const volatility = computeVolatility(y)
  const alpha = clamp(0.2 + volatility * 0.3, 0.1, 0.5) // level: more reactive if volatile
  const beta = clamp(0.05 + volatility * 0.1, 0.02, 0.2)  // trend: conservative
  const gamma = clamp(0.1 + volatility * 0.1, 0.05, 0.3)  // seasonal: moderate

  let sse = 0
  for (let t = 0; t < n; t++) {
    const seasonIdx = t % PERIOD
    const predicted = level + trend + seasonal[seasonIdx]
    const error = y[t] - predicted

    sse += error * error

    const prevLevel = level
    level = alpha * (y[t] - seasonal[seasonIdx]) + (1 - alpha) * (level + trend)
    trend = beta * (level - prevLevel) + (1 - beta) * trend
    seasonal[seasonIdx] = gamma * (y[t] - level) + (1 - gamma) * seasonal[seasonIdx]
  }

  // --- Phase 3: Forecast ---
  const dayMs = 86400000
  const lastDate = history[history.length - 1].date
  let cumulative = lastCumulative
  const points: ForecastPoint[] = []
  let totalPredicted = 0

  for (let h = 1; h <= daysAhead; h++) {
    const seasonIdx = (n + h - 1) % PERIOD
    // Damped trend: trend decays over horizon to avoid overextrapolation
    const dampedTrend = trend * (1 - Math.pow(0.95, h)) / (1 - 0.95)
    const raw = level + dampedTrend / h * h + seasonal[seasonIdx]
    const predicted = Math.max(0, Math.round(raw))
    cumulative += predicted
    totalPredicted += predicted

    points.push({
      date: lastDate + h * dayMs,
      newUsers: predicted,
      totalUsers: cumulative,
      predictedTotal: cumulative,
      isPredicted: true
    })
  }

  // Confidence: based on RMSE relative to mean
  const rmse = Math.sqrt(sse / n)
  const mean = y.reduce((a, b) => a + b, 0) / n
  const confidence = clamp(1 - rmse / Math.max(mean, 1), 0, 1)

  return {
    points,
    avgDailyGrowth: Math.round(totalPredicted / daysAhead),
    confidence
  }
}

// Fallback for < 14 days of data: EMA with trend
function fallbackForecast(
  history: DailyPoint[],
  daysAhead: number,
  lastCumulative: number
): ForecastResult {
  const y = history.map(d => d.newUsers)
  const n = y.length
  if (n === 0) return { points: [], avgDailyGrowth: 0, confidence: 0 }

  const alpha = 0.3
  let ema = y[0]
  let emaTrend = 0
  for (let i = 1; i < n; i++) {
    const prev = ema
    ema = alpha * y[i] + (1 - alpha) * (ema + emaTrend)
    emaTrend = 0.1 * (ema - prev) + 0.9 * emaTrend
  }

  const dayMs = 86400000
  const lastDate = history[history.length - 1].date
  let cumulative = lastCumulative
  const points: ForecastPoint[] = []
  let total = 0

  for (let h = 1; h <= daysAhead; h++) {
    const predicted = Math.max(0, Math.round(ema + emaTrend * h * 0.98))
    cumulative += predicted
    total += predicted
    points.push({
      date: lastDate + h * dayMs,
      newUsers: predicted,
      totalUsers: cumulative,
      predictedTotal: cumulative,
      isPredicted: true
    })
  }

  return {
    points,
    avgDailyGrowth: Math.round(total / daysAhead),
    confidence: Math.min(0.5, n / 14)
  }
}

function computeVolatility(y: number[]): number {
  if (y.length < 3) return 0.5
  const mean = y.reduce((a, b) => a + b, 0) / y.length
  const variance = y.reduce((a, v) => a + (v - mean) ** 2, 0) / y.length
  const cv = Math.sqrt(variance) / Math.max(mean, 1) // coefficient of variation
  return clamp(cv, 0, 1)
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
