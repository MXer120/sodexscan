/**
 * Alert delivery helpers — server-only (Telegram + Discord v1).
 * No email in v1 — keep channel enum extensible.
 */

// ─── Telegram ───────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sodexscan.com'

export async function sendTelegram(chatId, text, reply_markup) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set')

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(reply_markup ? { reply_markup } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Telegram error ${res.status}: ${err.description ?? 'unknown'}`)
  }
  return res.json()
}

export function alertReplyKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📋 My Alerts', url: `${APP_URL}/alerts` },
        { text: '⏸ Pause All', callback_data: 'pause' },
      ],
    ],
  }
}

// ─── Discord ────────────────────────────────────────────────────────

export async function sendDiscord(webhookUrl, content, embeds = []) {
  if (!webhookUrl?.startsWith('https://discord.com/api/webhooks/')) {
    throw new Error('Invalid Discord webhook URL')
  }
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, embeds }),
  })
  if (!res.ok) {
    throw new Error(`Discord error ${res.status}`)
  }
}

// ─── Message formatters ──────────────────────────────────────────────

export function formatFillAlert({ leader_wallet, symbol, side, action, size, price }) {
  const emoji = action === 'open'
    ? (side === 'long' ? '🟢' : '🔴')
    : '⬛'
  const actionLabel = action === 'open' ? 'OPENED' : 'CLOSED'
  const short = leader_wallet.slice(0, 8) + '…' + leader_wallet.slice(-6)
  return `${emoji} <b>${symbol}</b> ${side.toUpperCase()} ${actionLabel}\nLeader: <code>${short}</code>\nSize: ${size} @ $${price}\n\n<i>Signal only — not financial advice. Trade on your own wallet.</i>`
}

export function formatPriceAlert({ symbol, pct, currentPrice }) {
  const dir = pct >= 0 ? '📈' : '📉'
  const sign = pct >= 0 ? '+' : ''
  return `${dir} <b>${symbol}</b> moved ${sign}${pct.toFixed(2)}% to <b>$${currentPrice.toLocaleString()}</b>\n\n<i>Price alert from CommunityScan SoDEX — not financial advice.</i>`
}

export function formatMaintenanceAlert({ message }) {
  return `🚧 <b>Sodex Mainnet Maintenance</b>\n${message ?? 'The Sodex gateway appears to be experiencing issues. Please check sodex.com for updates.'}\n\n<i>CommunityScan SoDEX alert</i>`
}

export function formatWalletActivityAlert({ wallet, symbol, action }) {
  const short = wallet.slice(0, 8) + '…' + wallet.slice(-6)
  return `👁 <b>Wallet Activity</b>\n<code>${short}</code> ${action} on <b>${symbol}</b>\n\n<i>Wallet tracker alert from CommunityScan SoDEX</i>`
}

// ─── Rate-limit check ────────────────────────────────────────────────

/**
 * Returns true if we should suppress this alert (already sent within window).
 * Uses alert_history table via passed supabaseAdmin client.
 */
export async function isRateLimited(supabaseAdmin, { userId, type, target, windowSeconds = 60 }) {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString()
  const { count } = await supabaseAdmin
    .from('alert_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .eq('target', target)
    .gte('sent_at', since)
  return (count ?? 0) > 0
}
