/**
 * Telegram bot webhook: POST /api/telegram/webhook
 * Handles commands, inline keyboards, and callback queries.
 * Register with: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram/webhook
 */

import { supabaseAdmin } from '../../../lib/supabaseServer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.communityscan-sodex.com'

export async function POST(request) {
  let update
  try {
    update = await request.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  // Handle callback queries (inline button taps)
  if (update?.callback_query) {
    await handleCallbackQuery(update.callback_query)
    return new Response('OK')
  }

  const message = update?.message
  if (!message?.text) return new Response('OK')

  const chatId = String(message.chat.id)
  const text = message.text.trim()
  const firstName = message.from?.first_name || 'there'

  // /start <token> — link Telegram account
  if (text.startsWith('/start')) {
    const token = text.slice(6).trim()

    if (!token) {
      await sendMessage(chatId, welcomeText(firstName), mainKeyboard())
      return new Response('OK')
    }

    const { data: row } = await supabaseAdmin
      .from('telegram_link_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .single()

    if (!row || new Date(row.expires_at) < new Date()) {
      await sendMessage(chatId, '❌ <b>Link expired or invalid.</b>\n\nGenerate a new link from your Profile → Alerts settings.', mainKeyboard())
      return new Response('OK')
    }

    await supabaseAdmin
      .from('user_notification_channels')
      .upsert({
        user_id: row.user_id,
        channel: 'telegram',
        address: chatId,
        verified_at: new Date().toISOString(),
      }, { onConflict: 'user_id,channel' })

    await supabaseAdmin.from('telegram_link_tokens').delete().eq('token', token)

    await sendMessage(
      chatId,
      `✅ <b>Telegram alerts activated!</b>\n\nYou'll get notified here whenever your alert conditions trigger.\n\n<i>Not financial advice — CommunityScan SoDEX</i>`,
      mainKeyboard()
    )
    return new Response('OK')
  }

  // /stop — unlink Telegram
  if (text === '/stop') {
    await supabaseAdmin
      .from('user_notification_channels')
      .delete()
      .eq('channel', 'telegram')
      .eq('address', chatId)

    await sendMessage(chatId, '🔕 <b>Alerts disabled.</b>\n\nRe-enable from Profile → Alerts settings anytime.')
    return new Response('OK')
  }

  // /help
  if (text === '/help') {
    await sendMessage(chatId, helpText(), mainKeyboard())
    return new Response('OK')
  }

  // /alerts — list active alerts for linked user
  if (text === '/alerts') {
    await handleListAlerts(chatId)
    return new Response('OK')
  }

  // /pause — disable all alerts
  if (text === '/pause') {
    await handlePauseAll(chatId, true)
    return new Response('OK')
  }

  // /resume — re-enable all alerts
  if (text === '/resume') {
    await handlePauseAll(chatId, false)
    return new Response('OK')
  }

  // /brief — morning market brief
  if (text.startsWith('/brief')) {
    await handleBrief(chatId)
    return new Response('OK')
  }

  // Default — show main menu
  await sendMessage(chatId, welcomeText(firstName), mainKeyboard())
  return new Response('OK')
}

// ── Callback query handler ───────────────────────────────────────────────────

async function handleCallbackQuery(query) {
  const chatId = String(query.message.chat.id)
  const data = query.data

  if (data === 'alerts') await handleListAlerts(chatId)
  else if (data === 'pause')  await handlePauseAll(chatId, true)
  else if (data === 'resume') await handlePauseAll(chatId, false)
  else if (data === 'brief')  await handleBrief(chatId)
  else if (data === 'help')   await sendMessage(chatId, helpText(), mainKeyboard())
  else if (data.startsWith('disable_alert:')) {
    const id = data.slice('disable_alert:'.length)
    await handleToggleAlert(chatId, id, false, query.id, query.message)
    return  // answerCallback already called inside
  }
  else if (data.startsWith('enable_alert:')) {
    const id = data.slice('enable_alert:'.length)
    await handleToggleAlert(chatId, id, true, query.id, query.message)
    return
  }

  await answerCallback(query.id)
}

// ── Business logic ───────────────────────────────────────────────────────────

async function handleListAlerts(chatId) {
  const channel = await getChannel(chatId)
  if (!channel) {
    await sendMessage(chatId, notLinkedText(), linkKeyboard())
    return
  }

  const { data: alerts } = await supabaseAdmin
    .from('user_alert_settings')
    .select('type, target, enabled, label')
    .eq('user_id', channel.user_id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!alerts?.length) {
    await sendMessage(
      chatId,
      '📭 <b>No alerts set up yet.</b>\n\nCreate your first alert on the website:',
      linkKeyboard()
    )
    return
  }

  const lines = alerts.map(a => {
    const status = a.enabled ? '🟢' : '⏸'
    const name = a.label || formatAlertType(a.type)
    const target = a.target ? ` — <code>${a.target}</code>` : ''
    return `${status} ${name}${target}`
  })

  await sendMessage(
    chatId,
    `<b>Your alerts (${alerts.length})</b>\n\n${lines.join('\n')}\n\n🟢 active  ⏸ paused`,
    mainKeyboard()
  )
}

async function handleToggleAlert(chatId, alertId, enable, callbackId, origMessage) {
  const channel = await getChannel(chatId)
  if (!channel) {
    await answerCallback(callbackId, 'Account not linked.')
    return
  }

  // Verify ownership
  const { data: alert } = await supabaseAdmin
    .from('user_alert_settings')
    .select('id, target, market, enabled')
    .eq('id', alertId)
    .eq('user_id', channel.user_id)
    .single()

  if (!alert) {
    await answerCallback(callbackId, 'Alert not found.')
    return
  }

  await supabaseAdmin
    .from('user_alert_settings')
    .update({ enabled: enable })
    .eq('id', alertId)

  const statusText = enable ? '▶️ Alert enabled.' : '⏸ Alert disabled.'
  await answerCallback(callbackId, statusText)

  // Swap the toggle button in the original message
  const newToggleBtn = enable
    ? { text: '⏸ Disable this alert', callback_data: `disable_alert:${alertId}` }
    : { text: '▶️ Enable this alert',  callback_data: `enable_alert:${alertId}` }

  const sodexBase = 'https://app.sodex.io'
  const sym = alert.target ?? ''
  const tradeUrl = alert.market === 'spot'
    ? `${sodexBase}/trade/spot/${encodeURIComponent(sym)}`
    : `${sodexBase}/trade/${encodeURIComponent(sym)}`

  await editMessageKeyboard(chatId, origMessage.message_id, {
    inline_keyboard: [
      [
        { text: '📊 View on SoDEX', url: tradeUrl },
        { text: '🔔 My Alerts',     url: `${APP_URL}/alerts` },
      ],
      [newToggleBtn],
    ],
  })
}

function handleBrief(chatId) {
  const now = new Date()
  const utcHour = now.getUTCHours()
  const greeting = utcHour < 12 ? '🌅 Good morning' : utcHour < 17 ? '☀️ Good afternoon' : '🌙 Good evening'
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const text =
    `${greeting} — <b>Daily Brief</b>\n` +
    `📅 ${dateStr}\n` +
    `─────────────────\n\n` +

    `<b>📰 Crypto News</b>\n` +
    `• BlackRock files for XRP spot ETF with SEC\n` +
    `• Fed holds rates — risk assets rally pre-market\n` +
    `• Solana DeFi TVL hits new ATH at $12.4B\n` +
    `• SoDEX perps volume surges +34% week-on-week\n\n` +

    `─────────────────\n` +
    `<b>📈 Prices</b>\n` +
    `BTC   <code>$94,250</code>  <b>+2.3%</b>\n` +
    `ETH   <code>$3,180</code>   <b>-0.8%</b>\n` +
    `SOL   <code>$142</code>     <b>+4.1%</b>\n` +
    `BNB   <code>$608</code>     <b>+1.2%</b>\n` +
    `DOGE  <code>$0.162</code>   <b>+6.7%</b>\n\n` +

    `─────────────────\n` +
    `<b>🔥 Top SoDEX Movers (24h)</b>\n` +
    `🟢 WIF-USD   <b>+18.4%</b>  Vol $12.1M\n` +
    `🟢 BONK-USD  <b>+11.2%</b>  Vol $8.3M\n` +
    `🟢 PEPE-USD  <b>+9.6%</b>   Vol $6.7M\n` +
    `🔴 OP-USD    <b>-6.3%</b>   Vol $5.0M\n` +
    `🔴 ARB-USD   <b>-4.1%</b>   Vol $3.2M\n\n` +

    `─────────────────\n` +
    `<b>🏛 ETF Flows (yesterday)</b>\n` +
    `• BTC ETFs:  <b>+$234M</b> net inflow\n` +
    `• ETH ETFs:  <b>-$12M</b> net outflow\n` +
    `• Total AUM: <b>$112.4B</b> BTC · <b>$9.1B</b> ETH\n\n` +

    `─────────────────\n` +
    `<b>😱 Fear &amp; Greed</b>  <code>72 — Greed</code>\n` +
    `<b>BTC Dominance</b>  <code>54.2%</code>  <b>+0.4%</b>\n` +
    `<b>Open Interest</b>  <code>$38.1B</code> (perps global)\n\n` +

    `─────────────────\n` +
    `<a href="${APP_URL}/alerts">🔔 Manage Alerts</a>  ·  <a href="${APP_URL}/copy">📋 Copy Trade</a>\n\n` +

    `<i>Demo data — live brief coming soon.</i>`

  return sendMessage(chatId, text, mainKeyboard())
}

async function handlePauseAll(chatId, pause) {
  const channel = await getChannel(chatId)
  if (!channel) {
    await sendMessage(chatId, notLinkedText(), linkKeyboard())
    return
  }

  await supabaseAdmin
    .from('user_alert_settings')
    .update({ enabled: !pause })
    .eq('user_id', channel.user_id)

  const msg = pause
    ? '⏸ <b>All alerts paused.</b>\n\nUse /resume to re-enable them.'
    : '▶️ <b>All alerts resumed.</b>\n\nYou\'ll start receiving notifications again.'

  await sendMessage(chatId, msg, mainKeyboard())
}

async function getChannel(chatId) {
  const { data } = await supabaseAdmin
    .from('user_notification_channels')
    .select('user_id')
    .eq('channel', 'telegram')
    .eq('address', chatId)
    .single()
  return data
}

// ── Text helpers ─────────────────────────────────────────────────────────────

function welcomeText(name) {
  return `👋 <b>Hey ${name}!</b>\n\nI'm the <b>CommunityScan SoDEX</b> alert bot. I notify you when your price targets, wallet activity, or position conditions trigger.\n\nUse the buttons below or type /help for all commands.`
}

function helpText() {
  return `<b>CommunityScan SoDEX — Commands</b>\n\n/brief — morning market brief\n/alerts — view your active alerts\n/pause — pause all notifications\n/resume — resume all notifications\n/stop — unlink your account\n/help — show this message\n\n<a href="${APP_URL}/alerts">🔗 Manage alerts on the website</a>\n\n<i>Not financial advice.</i>`
}

function notLinkedText() {
  return `🔗 <b>Account not linked.</b>\n\nGenerate a link token from <a href="${APP_URL}/alerts">your alerts page</a> and tap it to connect.`
}

function formatAlertType(type) {
  const labels = {
    price_movement: 'Price Movement',
    price_level: 'Price Level',
    wallet_fill: 'Wallet Fill',
    wallet_activity: 'Wallet Activity',
    wallet_deposit: 'Wallet Deposit',
    wallet_withdrawal: 'Wallet Withdrawal',
    position_open: 'Position Open',
    position_close: 'Position Close',
    new_listing: 'New Listing',
    daily_pnl: 'Daily PnL',
    weekly_pnl: 'Weekly PnL',
    total_pnl: 'Total PnL',
    sodex_announcement: 'SoDEX Announcement',
    maintenance: 'Maintenance',
  }
  return labels[type] || type
}

// ── Keyboards ────────────────────────────────────────────────────────────────

function mainKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📊 Morning Brief', callback_data: 'brief' },
        { text: '📋 My Alerts',    callback_data: 'alerts' },
      ],
      [
        { text: '⏸ Pause All',  callback_data: 'pause' },
        { text: '▶️ Resume All', callback_data: 'resume' },
      ],
      [
        { text: '❓ Help',    callback_data: 'help' },
        { text: '🌐 Open App', url: `${APP_URL}/alerts` },
      ],
    ],
  }
}

function linkKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🔗 Set Up Alerts', url: `${APP_URL}/alerts` }],
    ],
  }
}

// ── Telegram API helpers ─────────────────────────────────────────────────────

async function sendMessage(chatId: string, text: string, reply_markup?: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
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
}

async function answerCallback(callbackQueryId: string, text?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      ...(text ? { text, show_alert: false } : {}),
    }),
  })
}

async function editMessageKeyboard(chatId: string, messageId: number | string, replyMarkup: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:      chatId,
      message_id:   messageId,
      reply_markup: replyMarkup,
    }),
  })
}

// Keep-warm endpoint — pinged by cron-job.org every 5 min
export function GET() {
  return new Response('ok')
}
