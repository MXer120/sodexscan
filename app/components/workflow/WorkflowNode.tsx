'use client'

import React from 'react'
import type { WorkflowNode as WFNode } from '@/types/workflow'
import { NODE_CONFIGS } from './nodeConfig'

interface WorkflowNodeProps {
  node: WFNode
  selected: boolean
  dragging: boolean
  zoom: number
  onMouseDown: (e: React.MouseEvent, id: string) => void
  onSelect: (id: string) => void
  onHandleMouseDown: (e: React.MouseEvent, nodeId: string, kind: 'out') => void
  onHandleMouseUp: (e: React.MouseEvent, nodeId: string) => void
}

// Return up to 3 key/value pairs from node.data that are worth displaying.
// Priority order matches what each node kind cares about most.
function getPreviewFields(node: WFNode): { label: string; value: string }[] {
  const { data, subtype } = node
  const config = NODE_CONFIGS[subtype]
  const shown: { label: string; value: string }[] = []

  for (const field of config.fields) {
    if (shown.length >= 3) break
    const raw = data[field.key]
    if (raw === undefined || raw === null || raw === '') continue

    let display: string
    if (Array.isArray(raw)) {
      display = raw.slice(0, 3).join(', ') + (raw.length > 3 ? '…' : '')
    } else if (typeof raw === 'boolean') {
      display = raw ? 'Yes' : 'No'
    } else {
      display = String(raw)
    }

    shown.push({ label: field.label, value: display })
  }

  return shown
}

export default function WorkflowNode({
  node,
  selected,
  dragging,
  onMouseDown,
  onSelect,
  onHandleMouseDown,
  onHandleMouseUp,
}: WorkflowNodeProps) {
  const config = NODE_CONFIGS[node.subtype]
  const isEnabled = node.data.enabled !== false
  const previewFields = getPreviewFields(node)

  const classNames = [
    'wf-node',
    selected ? 'selected' : '',
    dragging ? 'dragging' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classNames}
      style={{ left: node.position.x, top: node.position.y }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onClick={() => onSelect(node.id)}
    >
      <div className="wf-node-handles">
        {/* Input handle (left) */}
        <div
          className="wf-handle wf-handle-in"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => {
            e.stopPropagation()
            onHandleMouseUp(e, node.id)
          }}
        />

        {/* Node content */}
        <div className="wf-node-inner">
          {/* Header */}
          <div className="wf-node-header">
            <div
              className="wf-node-icon"
              style={{ background: `${config.color}18`, color: config.color }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={config.iconPath} />
              </svg>
            </div>

            <div className="wf-node-title">
              <span className="wf-node-label">
                {node.data.label || config.label}
              </span>
              <span
                className="wf-node-badge"
                style={{ color: config.color, borderColor: `${config.color}40` }}
              >
                {node.kind}
              </span>
            </div>

            <div
              className="wf-node-status"
              style={{ background: isEnabled ? '#22c55e' : '#6b7280' }}
              title={isEnabled ? 'Enabled' : 'Disabled'}
            />
          </div>

          {/* Body: key field previews */}
          {previewFields.length > 0 && (
            <div className="wf-node-body">
              {previewFields.map((f) => (
                <div key={f.label} className="wf-node-field">
                  <span className="wf-node-field-label">{f.label}</span>
                  <span className="wf-node-field-value">{f.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Output handle (right) */}
        <div
          className="wf-handle wf-handle-out"
          onMouseDown={(e) => {
            e.stopPropagation()
            onHandleMouseDown(e, node.id, 'out')
          }}
          onMouseUp={(e) => e.stopPropagation()}
        />
      </div>

      {/* Bottom accent line */}
      <div
        className="wf-node-accent"
        style={{ background: config.color }}
      />
    </div>
  )
}
