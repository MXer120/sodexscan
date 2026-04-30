'use client'

import { useState, useEffect, useRef } from 'react'
import type { NodeSubtype } from '@/types/workflow'
import { TRIGGER_TYPES, ANALYTICS_TYPES, OUTPUT_TYPES } from './nodeConfig'

interface WorkflowBottomToolbarProps {
  onAddNode: (subtype: NodeSubtype, pos: { x: number; y: number }) => void
  onFitView: () => void
  selectedId: string | null
  nodeCount: number
  edgeCount: number
}

type PopoverType = 'triggers' | 'analytics' | 'outputs' | null

// ─── Inline style constants ───────────────────────────────────────────────────

const toolbarStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 50,
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 12,
  padding: 5,
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  boxShadow: '0 4px 24px color-mix(in oklch, var(--foreground) 12%, transparent)',
}

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 20,
  background: 'var(--border)',
  margin: '0 3px',
  flexShrink: 0,
}

const popoverStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 8px)',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 200,
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 10,
  padding: 6,
  minWidth: 180,
}

function useButtonStyle(active: boolean): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.13s, color 0.13s',
    background: active ? 'rgba(34,197,94,0.12)' : 'transparent',
    color: active ? '#22c55e' : 'var(--muted-foreground)',
    flexShrink: 0,
  }
}

// ─── ToolbarButton ────────────────────────────────────────────────────────────

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick?: () => void
  title?: string
  children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)

  const style: React.CSSProperties = {
    ...useButtonStyle(active ?? false),
    ...(hovered && !active
      ? { background: 'color-mix(in oklch, var(--foreground) 7%, transparent)', color: 'var(--foreground)' }
      : {}),
  }

  return (
    <button
      style={style}
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  )
}

// ─── WorkflowBottomToolbar ────────────────────────────────────────────────────

export default function WorkflowBottomToolbar({
  onAddNode,
  onFitView,
  nodeCount,
}: WorkflowBottomToolbarProps) {
  const [activeTool, setActiveTool] = useState<'select'>('select')
  const [openPopover, setOpenPopover] = useState<PopoverType>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (!openPopover) return

    function handleMouseDown(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenPopover(null)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [openPopover])

  function togglePopover(type: Exclude<PopoverType, null>) {
    setOpenPopover((prev) => (prev === type ? null : type))
  }

  function handleAddNode(subtype: NodeSubtype) {
    onAddNode(subtype, { x: 200 + Math.random() * 200, y: 180 + Math.random() * 100 })
    setOpenPopover(null)
  }

  const popoverItems =
    openPopover === 'triggers'
      ? TRIGGER_TYPES
      : openPopover === 'analytics'
      ? ANALYTICS_TYPES
      : openPopover === 'outputs'
      ? OUTPUT_TYPES
      : []

  return (
    <div style={toolbarStyle} ref={toolbarRef}>
      {/* Select tool */}
      <ToolbarButton
        active={activeTool === 'select'}
        onClick={() => setActiveTool('select')}
        title="Select"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 3l14 9-7 1-3 7z" />
        </svg>
      </ToolbarButton>

      <div style={dividerStyle} />

      {/* Popover section wrapper */}
      <div style={{ position: 'relative' }}>
        {/* Triggers */}
        <ToolbarButton
          active={openPopover === 'triggers'}
          onClick={() => togglePopover('triggers')}
          title="Add Trigger"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </ToolbarButton>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Analytics */}
        <ToolbarButton
          active={openPopover === 'analytics'}
          onClick={() => togglePopover('analytics')}
          title="Add Analytics"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </ToolbarButton>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Outputs */}
        <ToolbarButton
          active={openPopover === 'outputs'}
          onClick={() => togglePopover('outputs')}
          title="Add Output"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <path d="M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
        </ToolbarButton>

        {/* Popover — positioned on the outputs button group so it appears centered above all three */}
      </div>

      {/* Popover rendered once, positioned relative to a wrapper */}
      {openPopover && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', zIndex: 200 }}>
          <div style={popoverStyle}>
            {popoverItems.map((cfg) => (
              <div
                key={cfg.subtype}
                onClick={() => handleAddNode(cfg.subtype)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--muted-foreground)',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.background = 'color-mix(in oklch, var(--foreground) 6%, transparent)'
                  ;(e.currentTarget as HTMLDivElement).style.color = 'var(--foreground)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLDivElement).style.color = 'var(--muted-foreground)'
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: cfg.color,
                    flexShrink: 0,
                  }}
                />
                {cfg.label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={dividerStyle} />

      {/* Fit view */}
      <ToolbarButton onClick={onFitView} title="Fit view">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      </ToolbarButton>

      <div style={dividerStyle} />

      {/* Node count chip */}
      <span
        style={{
          background: 'color-mix(in oklch, var(--foreground) 5%, transparent)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          color: 'var(--muted-foreground)',
          whiteSpace: 'nowrap',
        }}
      >
        {nodeCount} nodes
      </span>
    </div>
  )
}
