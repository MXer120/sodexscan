'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import type { WorkflowNode as WFNode, WorkflowEdge, NodeSubtype, CanvasState } from '@/types/workflow'
import WorkflowEdges from './WorkflowEdges'
import WorkflowNode from './WorkflowNode'

import WorkflowRightPanel from './WorkflowRightPanel'
import WorkflowBottomToolbar from './WorkflowBottomToolbar'

// ─── Sample data ───────────────────────────────────────────────────────────────

const SAMPLE_NODES: WFNode[] = [
  {
    id: 'n1',
    kind: 'trigger',
    subtype: 'price_alert',
    position: { x: 120, y: 180 },
    data: { symbol: 'BTC-USD', threshold: 100000, direction: 'above', enabled: true },
  },
  {
    id: 'n2',
    kind: 'analytics',
    subtype: 'ai_analyze',
    position: { x: 420, y: 160 },
    data: { analyzeMode: 'actionable', systemPrompt: 'Analyze market impact', enabled: true },
  },
  {
    id: 'n3',
    kind: 'output',
    subtype: 'telegram',
    position: { x: 720, y: 180 },
    data: { messageTemplate: '{{output}}', enabled: true },
  },
]

const SAMPLE_EDGES: WorkflowEdge[] = [
  { id: 'e1', sourceId: 'n1', targetId: 'n2' },
  { id: 'e2', sourceId: 'n2', targetId: 'n3' },
]

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="wf-empty">
      <div className="wf-empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M10 6.5h4M17.5 10v4M6.5 10v4M10 17.5h4" />
        </svg>
      </div>
      <div className="wf-empty-title">No blocks yet</div>
      <div className="wf-empty-sub">Drag blocks from the toolbar below</div>
    </div>
  )
}

// ─── Toolbar ───────────────────────────────────────────────────────────────────

interface ToolbarProps {
  onFitView: () => void
  nodeCount: number
  edgeCount: number
}

function Toolbar({ onFitView, nodeCount, edgeCount }: ToolbarProps) {
  const [name, setName] = useState('Untitled Workflow')

  return (
    <div className="wf-toolbar">
      <input
        className="wf-toolbar-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          padding: 0,
          minWidth: 100,
          maxWidth: 160,
        }}
      />

      <div className="wf-toolbar-divider" />

      <span
        style={{
          fontSize: 11,
          color: 'var(--wf-text-muted)',
          padding: '4px 6px',
          whiteSpace: 'nowrap',
        }}
      >
        {nodeCount} node{nodeCount !== 1 ? 's' : ''} · {edgeCount} edge{edgeCount !== 1 ? 's' : ''}
      </span>

      <div className="wf-toolbar-divider" />

      <button className="wf-toolbar-btn" onClick={onFitView} title="Fit view">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
        Fit
      </button>

      <div className="wf-toolbar-divider" />

      <button
        className="wf-toolbar-btn"
        style={{
          background: 'rgba(34,197,94,0.12)',
          borderRadius: 7,
          color: '#22c55e',
          border: '1px solid rgba(34,197,94,0.25)',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Run
      </button>

      <button
        className="wf-toolbar-btn"
        style={{
          background: 'var(--wf-hover-overlay)',
          borderRadius: 7,
          border: '1px solid var(--wf-glass-border)',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        Save
      </button>
    </div>
  )
}

// ─── WorkflowBuilder ──────────────────────────────────────────────────────────

export default function WorkflowBuilder() {
  const canvasRef = useRef<HTMLDivElement>(null)

  const [nodes, setNodes] = useState<WFNode[]>(SAMPLE_NODES)
  const [edges, setEdges] = useState<WorkflowEdge[]>(SAMPLE_EDGES)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [canvasState, setCanvasState] = useState<CanvasState>({ offsetX: 0, offsetY: 0, zoom: 1 })
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; x: number; y: number } | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return
        if (selectedId) deleteNode(selectedId)
      }
      if (e.key === 'Escape') {
        setSelectedId(null)
        setContextMenu(null)
        setConnectingFrom(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // ─── Node operations ─────────────────────────────────────────────────────────

  const addNode = useCallback((subtype: NodeSubtype, pos: { x: number; y: number }) => {
    const newNode: WFNode = {
      id: crypto.randomUUID(),
      kind: subtypeToKind(subtype),
      subtype,
      position: pos,
      data: { enabled: true },
    }
    setNodes((prev) => [...prev, newNode])
    return newNode.id
  }, [])

  const updateNodeData = useCallback(
    (id: string, data: Partial<WFNode['data']>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
      )
    },
    []
  )

  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setEdges((prev) => prev.filter((e) => e.sourceId !== id && e.targetId !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }, [])

  const handleEdgeClick = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId))
  }, [])

  // ─── Mouse handlers ───────────────────────────────────────────────────────────

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      setSelectedId(id)
      const node = nodes.find((n) => n.id === id)
      if (!node) return
      setDragging({
        id,
        startX: e.clientX - node.position.x * canvasState.zoom,
        startY: e.clientY - node.position.y * canvasState.zoom,
      })
    },
    [nodes, canvasState.zoom]
  )

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault()
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
      } else if (e.button === 0) {
        setSelectedId(null)
        setContextMenu(null)
      }
    },
    []
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) {
        const x = (e.clientX - dragging.startX) / canvasState.zoom
        const y = (e.clientY - dragging.startY) / canvasState.zoom
        setNodes((prev) =>
          prev.map((n) =>
            n.id === dragging.id ? { ...n, position: { x, y } } : n
          )
        )
      }

      if (isPanning) {
        setCanvasState((prev) => ({
          ...prev,
          offsetX: prev.offsetX + e.movementX,
          offsetY: prev.offsetY + e.movementY,
        }))
      }

      if (connectingFrom) {
        setMousePos({ x: e.clientX, y: e.clientY })
      }
    },
    [dragging, isPanning, connectingFrom, canvasState.zoom]
  )

  const handleCanvasMouseUp = useCallback(() => {
    setDragging(null)
    setIsPanning(false)
    if (connectingFrom) {
      setConnectingFrom(null)
    }
  }, [connectingFrom])

  const handleCanvasMouseLeave = useCallback(() => {
    setDragging(null)
    setIsPanning(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.92 : 1.08
    setCanvasState((prev) => ({
      ...prev,
      zoom: Math.min(2, Math.max(0.3, prev.zoom * factor)),
    }))
  }, [])

  const handleHandleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string, _kind: 'out') => {
      e.stopPropagation()
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return
      const x = (node.position.x + 220) * canvasState.zoom + canvasState.offsetX
      const y = (node.position.y + 40) * canvasState.zoom + canvasState.offsetY
      setConnectingFrom({ nodeId, x, y })
    },
    [nodes, canvasState]
  )

  const handleHandleMouseUp = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()
      if (connectingFrom && connectingFrom.nodeId !== nodeId) {
        const newEdge: WorkflowEdge = {
          id: crypto.randomUUID(),
          sourceId: connectingFrom.nodeId,
          targetId: nodeId,
        }
        setEdges((prev) => [...prev, newEdge])
      }
      setConnectingFrom(null)
    },
    [connectingFrom]
  )

  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const subtype = e.dataTransfer.getData('text/plain') as NodeSubtype
      if (!subtype) return
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = (e.clientX - rect.left - canvasState.offsetX) / canvasState.zoom
      const y = (e.clientY - rect.top - canvasState.offsetY) / canvasState.zoom
      addNode(subtype, { x, y })
    },
    [canvasState, addNode]
  )

  const handleFitView = useCallback(() => {
    if (nodes.length === 0) return
    const padding = 80
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const minX = Math.min(...nodes.map((n) => n.position.x))
    const minY = Math.min(...nodes.map((n) => n.position.y))
    const maxX = Math.max(...nodes.map((n) => n.position.x + 220))
    const maxY = Math.max(...nodes.map((n) => n.position.y + 80))
    const contentW = maxX - minX + padding * 2
    const contentH = maxY - minY + padding * 2
    const zoom = Math.min(2, Math.max(0.3, Math.min(rect.width / contentW, rect.height / contentH)))
    const offsetX = (rect.width - (maxX - minX) * zoom) / 2 - minX * zoom
    const offsetY = (rect.height - (maxY - minY) * zoom) / 2 - minY * zoom
    setCanvasState({ zoom, offsetX, offsetY })
  }, [nodes])

  // ─── Preview edge ─────────────────────────────────────────────────────────────

  const { offsetX, offsetY, zoom } = canvasState

  const previewEdge = connectingFrom
    ? {
        x1: (connectingFrom.x - offsetX) / zoom,
        y1: (connectingFrom.y - offsetY) / zoom,
        x2: (mousePos.x - offsetX) / zoom,
        y2: (mousePos.y - offsetY) / zoom,
      }
    : null

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="wf-page" onContextMenu={(e) => e.preventDefault()}>
      {/* Dot-grid canvas */}
      <div
        ref={canvasRef}
        className={`wf-canvas${isPanning ? ' panning' : ''}${connectingFrom ? ' connecting' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
        onWheel={handleWheel}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div
          className="wf-canvas-inner"
          style={{ transform: `translate(${offsetX}px,${offsetY}px) scale(${zoom})` }}
        >
          <WorkflowEdges
            nodes={nodes}
            edges={edges}
            previewEdge={previewEdge}
            onEdgeClick={handleEdgeClick}
          />

          {nodes.map((node) => (
            <div
              key={node.id}
              onContextMenu={(e) => handleContextMenu(e, node.id)}
            >
              <WorkflowNode
                node={node}
                selected={selectedId === node.id}
                dragging={dragging?.id === node.id}
                zoom={canvasState.zoom}
                onMouseDown={handleNodeMouseDown}
                onSelect={setSelectedId}
                onHandleMouseDown={handleHandleMouseDown}
                onHandleMouseUp={handleHandleMouseUp}
              />
            </div>
          ))}
        </div>

        {nodes.length === 0 && <EmptyState />}
      </div>

      {/* Top-center toolbar */}
      <Toolbar
        onFitView={handleFitView}
        nodeCount={nodes.length}
        edgeCount={edges.length}
      />

      {/* Right inspector panel */}
      <WorkflowRightPanel
        node={nodes.find((n) => n.id === selectedId) ?? null}
        onClose={() => setSelectedId(null)}
        onUpdate={updateNodeData}
        onDelete={deleteNode}
      />

      {/* Zoom controls — shift left when right panel is open */}
      <div className={`wf-zoom-controls${!selectedId ? ' panel-hidden' : ''}`}>
        <button
          className="wf-zoom-btn"
          onClick={() => setCanvasState((p) => ({ ...p, zoom: Math.min(2, p.zoom * 1.2) }))}
          title="Zoom in"
        >
          +
        </button>
        <button
          className="wf-zoom-btn"
          style={{ fontSize: 11, fontFamily: 'monospace' }}
          onClick={handleFitView}
          title="Fit view"
        >
          {Math.round(canvasState.zoom * 100)}%
        </button>
        <button
          className="wf-zoom-btn"
          onClick={() => setCanvasState((p) => ({ ...p, zoom: Math.max(0.3, p.zoom * 0.83) }))}
          title="Zoom out"
        >
          &minus;
        </button>
      </div>

      {/* Bottom toolbar */}
      <WorkflowBottomToolbar
        onAddNode={addNode}
        onFitView={handleFitView}
        selectedId={selectedId}
        nodeCount={nodes.length}
        edgeCount={edges.length}
      />

      {/* Context menu */}
      {contextMenu && (
        <div
          className="wf-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={() => setContextMenu(null)}
        >
          <div
            className="wf-context-item"
            onClick={() => setSelectedId(contextMenu.nodeId)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Inspect
          </div>
          <div className="wf-context-divider" />
          <div
            className="wf-context-item danger"
            onClick={() => deleteNode(contextMenu.nodeId)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Delete
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function subtypeToKind(subtype: NodeSubtype): WFNode['kind'] {
  const triggers: NodeSubtype[] = [
    'price_alert', 'wallet_move', 'news', 'etf', 'macro', 'fomc', 'new_listing', 'price_movement',
  ]
  const analytics: NodeSubtype[] = [
    'ai_analyze', 'summarize', 'connect', 'actionable', 'custom_ai',
  ]
  if (triggers.includes(subtype)) return 'trigger'
  if (analytics.includes(subtype)) return 'analytics'
  return 'output'
}
