export type NodeKind = 'trigger' | 'analytics' | 'output'

export type TriggerSubtype =
  | 'price_alert'
  | 'wallet_move'
  | 'news'
  | 'etf'
  | 'macro'
  | 'fomc'
  | 'new_listing'
  | 'price_movement'

export type AnalyticsSubtype =
  | 'ai_analyze'
  | 'summarize'
  | 'connect'
  | 'actionable'
  | 'custom_ai'

export type OutputSubtype =
  | 'telegram'
  | 'webhook'
  | 'alert'

export type NodeSubtype = TriggerSubtype | AnalyticsSubtype | OutputSubtype

export interface NodePosition {
  x: number
  y: number
}

export interface WorkflowNodeData {
  // trigger fields
  symbol?: string
  threshold?: number
  direction?: 'above' | 'below' | 'any'
  walletAddress?: string
  keywords?: string[]
  newsSource?: string
  // analytics fields
  systemPrompt?: string
  userPrompt?: string
  analyzeMode?: 'summarize' | 'actionable' | 'connect' | 'custom'
  temperature?: number
  // output fields
  webhookUrl?: string
  chatId?: string
  messageTemplate?: string
  // shared
  label?: string
  enabled?: boolean
  [key: string]: unknown
}

export interface WorkflowNode {
  id: string
  kind: NodeKind
  subtype: NodeSubtype
  position: NodePosition
  data: WorkflowNodeData
  selected?: boolean
}

export interface WorkflowEdge {
  id: string
  sourceId: string
  targetId: string
}

export interface WorkflowProject {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: string
  updatedAt: string
}

export interface FolderItem {
  id: string
  name: string
  type: 'folder' | 'file'
  children?: FolderItem[]
  count?: number
  active?: boolean
}

export interface CanvasState {
  offsetX: number
  offsetY: number
  zoom: number
}
