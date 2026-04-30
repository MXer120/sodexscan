import type { NodeKind, NodeSubtype, TriggerSubtype, AnalyticsSubtype, OutputSubtype } from '@/types/workflow'

export interface NodeTypeConfig {
  subtype: NodeSubtype
  kind: NodeKind
  label: string
  description: string
  color: string
  iconPath: string
  defaultData: Record<string, unknown>
  fields: FieldConfig[]
}

export interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'toggle' | 'tags'
  placeholder?: string
  options?: { value: string; label: string }[]
  hint?: string
}

// ─── Trigger nodes ────────────────────────────────────────────────────────────

const TRIGGER_CONFIGS: Record<TriggerSubtype, NodeTypeConfig> = {
  price_alert: {
    subtype: 'price_alert', kind: 'trigger',
    label: 'Price Alert', description: 'Fire when an asset hits a price level',
    color: '#22c55e',
    iconPath: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    defaultData: { symbol: 'BTC-USD', threshold: 100000, direction: 'above', price_type: 'mark' },
    fields: [
      { key: 'symbol', label: 'Symbol', type: 'text', placeholder: 'BTC-USD' },
      { key: 'threshold', label: 'Price', type: 'number', placeholder: '100000' },
      { key: 'direction', label: 'Direction', type: 'select', options: [
        { value: 'above', label: 'Crosses above' },
        { value: 'below', label: 'Crosses below' },
        { value: 'any', label: 'Either direction' },
      ]},
      { key: 'price_type', label: 'Price type', type: 'select', options: [
        { value: 'mark', label: 'Mark' },
        { value: 'mid', label: 'Mid' },
        { value: 'bid', label: 'Bid' },
        { value: 'ask', label: 'Ask' },
      ]},
    ],
  },
  price_movement: {
    subtype: 'price_movement', kind: 'trigger',
    label: 'Price Movement', description: 'Fire on % change within a window',
    color: '#22c55e',
    iconPath: 'M3 3v18h18M8 17l4-8 4 4 4-7',
    defaultData: { symbol: 'BTC-USD', pct: 5, window: '1h', direction: 'any' },
    fields: [
      { key: 'symbol', label: 'Symbol', type: 'text', placeholder: 'BTC-USD' },
      { key: 'pct', label: '% Change', type: 'number', placeholder: '5' },
      { key: 'window', label: 'Window', type: 'select', options: [
        { value: '15m', label: '15 min' },
        { value: '1h', label: '1 hour' },
        { value: '4h', label: '4 hours' },
        { value: '1d', label: '1 day' },
      ]},
    ],
  },
  wallet_move: {
    subtype: 'wallet_move', kind: 'trigger',
    label: 'Wallet Movement', description: 'Monitor a wallet for transfers or trades',
    color: '#3b82f6',
    iconPath: 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M16 16a2 2 0 1 1 4 0 2 2 0 0 1-4 0z',
    defaultData: { walletAddress: '', eventType: 'any', minUsd: 10000 },
    fields: [
      { key: 'walletAddress', label: 'Wallet address', type: 'text', placeholder: '0x...' },
      { key: 'eventType', label: 'Event type', type: 'select', options: [
        { value: 'any', label: 'Any activity' },
        { value: 'deposit', label: 'Deposit' },
        { value: 'withdraw', label: 'Withdrawal' },
        { value: 'trade', label: 'Trade' },
      ]},
      { key: 'minUsd', label: 'Min USD value', type: 'number', placeholder: '10000' },
    ],
  },
  news: {
    subtype: 'news', kind: 'trigger',
    label: 'News Alert', description: 'Trigger on news matching keywords',
    color: '#f97316',
    iconPath: 'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2M18 14h-8M15 18h-5M10 6h8v4h-8V6z',
    defaultData: { keywords: ['bitcoin', 'BTC'], sentiment: 'any', source: 'all' },
    fields: [
      { key: 'keywords', label: 'Keywords', type: 'tags', placeholder: 'Add keyword...' },
      { key: 'sentiment', label: 'Sentiment', type: 'select', options: [
        { value: 'any', label: 'Any' },
        { value: 'positive', label: 'Positive' },
        { value: 'negative', label: 'Negative' },
        { value: 'breaking', label: 'Breaking' },
      ]},
      { key: 'source', label: 'Source', type: 'select', options: [
        { value: 'all', label: 'All sources' },
        { value: 'twitter', label: 'X / Twitter' },
        { value: 'bloomberg', label: 'Bloomberg' },
        { value: 'reuters', label: 'Reuters' },
      ]},
    ],
  },
  etf: {
    subtype: 'etf', kind: 'trigger',
    label: 'ETF Flow Change', description: 'Trigger on BTC/ETH ETF inflow or outflow',
    color: '#8b5cf6',
    iconPath: 'M2 20h20M5 20V10l7-7 7 7v10M9 20v-5h6v5',
    defaultData: { asset: 'BTC', flowType: 'any', threshold: 100 },
    fields: [
      { key: 'asset', label: 'Asset', type: 'select', options: [
        { value: 'BTC', label: 'Bitcoin (BTC)' },
        { value: 'ETH', label: 'Ethereum (ETH)' },
      ]},
      { key: 'flowType', label: 'Flow type', type: 'select', options: [
        { value: 'any', label: 'Any flow' },
        { value: 'inflow', label: 'Inflow' },
        { value: 'outflow', label: 'Outflow' },
      ]},
      { key: 'threshold', label: 'Min $M USD', type: 'number', placeholder: '100' },
    ],
  },
  macro: {
    subtype: 'macro', kind: 'trigger',
    label: 'Macro Data', description: 'Trigger on macro economic data release',
    color: '#06b6d4',
    iconPath: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
    defaultData: { indicator: 'CPI', deviation: 0.1 },
    fields: [
      { key: 'indicator', label: 'Indicator', type: 'select', options: [
        { value: 'CPI', label: 'CPI (Inflation)' },
        { value: 'NFP', label: 'NFP (Jobs)' },
        { value: 'GDP', label: 'GDP' },
        { value: 'PPI', label: 'PPI' },
        { value: 'PMI', label: 'PMI' },
        { value: 'JOBLESS', label: 'Jobless Claims' },
      ]},
      { key: 'deviation', label: 'Surprise threshold (σ)', type: 'number', placeholder: '0.5', hint: 'Standard deviations from consensus' },
    ],
  },
  fomc: {
    subtype: 'fomc', kind: 'trigger',
    label: 'FOMC Event', description: 'Federal Reserve decisions and statements',
    color: '#ef4444',
    iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zM9 22V12h6v10',
    defaultData: { eventType: 'any' },
    fields: [
      { key: 'eventType', label: 'Event type', type: 'select', options: [
        { value: 'any', label: 'Any FOMC event' },
        { value: 'rate_decision', label: 'Rate decision' },
        { value: 'minutes', label: 'Meeting minutes' },
        { value: 'speech', label: 'Fed speech' },
        { value: 'statement', label: 'Statement release' },
      ]},
    ],
  },
  new_listing: {
    subtype: 'new_listing', kind: 'trigger',
    label: 'New Listing', description: 'Trigger when a new token is listed',
    color: '#22c55e',
    iconPath: 'M12 5v14M5 12l7-7 7 7',
    defaultData: { exchange: 'all', minMarketCap: 0 },
    fields: [
      { key: 'exchange', label: 'Exchange', type: 'select', options: [
        { value: 'all', label: 'All exchanges' },
        { value: 'binance', label: 'Binance' },
        { value: 'coinbase', label: 'Coinbase' },
        { value: 'sodex', label: 'Sodex' },
      ]},
      { key: 'minMarketCap', label: 'Min market cap ($M)', type: 'number', placeholder: '0' },
    ],
  },
}

// ─── Analytics nodes ──────────────────────────────────────────────────────────

const ANALYTICS_CONFIGS: Record<AnalyticsSubtype, NodeTypeConfig> = {
  ai_analyze: {
    subtype: 'ai_analyze', kind: 'analytics',
    label: 'AI Analysis', description: 'Analyze incoming data with Claude',
    color: '#8b5cf6',
    iconPath: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    defaultData: {
      systemPrompt: 'You are a crypto market analyst. Analyze the incoming data and provide insights.',
      analyzeMode: 'actionable',
      temperature: 0.3,
    },
    fields: [
      { key: 'systemPrompt', label: 'System prompt', type: 'textarea', placeholder: 'You are a...' },
      { key: 'analyzeMode', label: 'Analysis mode', type: 'select', options: [
        { value: 'summarize', label: 'Summarize' },
        { value: 'actionable', label: 'Actionable insights' },
        { value: 'connect', label: 'Connect patterns' },
        { value: 'custom', label: 'Custom' },
      ]},
      { key: 'temperature', label: 'Temperature', type: 'number', placeholder: '0.3', hint: '0 = precise, 1 = creative' },
    ],
  },
  summarize: {
    subtype: 'summarize', kind: 'analytics',
    label: 'Summarize', description: 'Condense data into a concise summary',
    color: '#3b82f6',
    iconPath: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    defaultData: { maxLength: 200, format: 'bullets' },
    fields: [
      { key: 'maxLength', label: 'Max length (words)', type: 'number', placeholder: '200' },
      { key: 'format', label: 'Format', type: 'select', options: [
        { value: 'bullets', label: 'Bullet points' },
        { value: 'paragraph', label: 'Paragraph' },
        { value: 'headline', label: 'Single headline' },
      ]},
    ],
  },
  connect: {
    subtype: 'connect', kind: 'analytics',
    label: 'Connect Data', description: 'Find correlations across multiple inputs',
    color: '#22c55e',
    iconPath: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    defaultData: { correlationType: 'auto' },
    fields: [
      { key: 'correlationType', label: 'Correlation type', type: 'select', options: [
        { value: 'auto', label: 'Auto-detect' },
        { value: 'causal', label: 'Causal' },
        { value: 'temporal', label: 'Temporal' },
        { value: 'sentiment', label: 'Sentiment link' },
      ]},
    ],
  },
  actionable: {
    subtype: 'actionable', kind: 'analytics',
    label: 'Actionable Output', description: 'Generate specific trade or action recommendations',
    color: '#f97316',
    iconPath: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3',
    defaultData: { riskLevel: 'medium', includeRationale: true },
    fields: [
      { key: 'riskLevel', label: 'Risk tolerance', type: 'select', options: [
        { value: 'low', label: 'Conservative' },
        { value: 'medium', label: 'Moderate' },
        { value: 'high', label: 'Aggressive' },
      ]},
      { key: 'includeRationale', label: 'Include rationale', type: 'toggle' },
    ],
  },
  custom_ai: {
    subtype: 'custom_ai', kind: 'analytics',
    label: 'Custom AI', description: 'Fully custom AI block with your own prompt',
    color: '#a855f7',
    iconPath: 'M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z',
    defaultData: {
      systemPrompt: '',
      userPromptTemplate: 'Analyze this data: {{data}}',
      model: 'claude-opus-4-7',
      temperature: 0.5,
    },
    fields: [
      { key: 'systemPrompt', label: 'System prompt', type: 'textarea', placeholder: 'You are a specialist in...' },
      { key: 'userPromptTemplate', label: 'User prompt template', type: 'textarea', placeholder: 'Use {{data}} for input' },
      { key: 'model', label: 'Model', type: 'select', options: [
        { value: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
        { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
        { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
      ]},
      { key: 'temperature', label: 'Temperature', type: 'number', placeholder: '0.5' },
    ],
  },
}

// ─── Output nodes ─────────────────────────────────────────────────────────────

const OUTPUT_CONFIGS: Record<OutputSubtype, NodeTypeConfig> = {
  telegram: {
    subtype: 'telegram', kind: 'output',
    label: 'Telegram', description: 'Send message to Telegram',
    color: '#3b82f6',
    iconPath: 'M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z',
    defaultData: { messageTemplate: '{{summary}}', parseMode: 'Markdown' },
    fields: [
      { key: 'messageTemplate', label: 'Message template', type: 'textarea', placeholder: 'Use {{output}} for AI result' },
      { key: 'parseMode', label: 'Parse mode', type: 'select', options: [
        { value: 'Markdown', label: 'Markdown' },
        { value: 'HTML', label: 'HTML' },
        { value: 'plain', label: 'Plain text' },
      ]},
    ],
  },
  webhook: {
    subtype: 'webhook', kind: 'output',
    label: 'Webhook', description: 'POST data to any URL',
    color: '#6b7280',
    iconPath: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    defaultData: { url: '', method: 'POST', headers: '{}' },
    fields: [
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://...' },
      { key: 'method', label: 'Method', type: 'select', options: [
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'PATCH', label: 'PATCH' },
      ]},
      { key: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer ..."}' },
    ],
  },
  alert: {
    subtype: 'alert', kind: 'output',
    label: 'In-App Alert', description: 'Show notification in dashboard',
    color: '#f59e0b',
    iconPath: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    defaultData: { priority: 'high', sound: true },
    fields: [
      { key: 'priority', label: 'Priority', type: 'select', options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'critical', label: 'Critical' },
      ]},
      { key: 'sound', label: 'Play sound', type: 'toggle' },
    ],
  },
}

export const NODE_CONFIGS: Record<NodeSubtype, NodeTypeConfig> = {
  ...TRIGGER_CONFIGS,
  ...ANALYTICS_CONFIGS,
  ...OUTPUT_CONFIGS,
}

export const TRIGGER_TYPES = Object.values(TRIGGER_CONFIGS)
export const ANALYTICS_TYPES = Object.values(ANALYTICS_CONFIGS)
export const OUTPUT_TYPES = Object.values(OUTPUT_CONFIGS)
