'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { WorkflowNode, WorkflowNodeData } from '@/types/workflow'
import { NODE_CONFIGS } from './nodeConfig'
import type { FieldConfig } from './nodeConfig'

interface WorkflowRightPanelProps {
  node: WorkflowNode | null
  onClose: () => void
  onUpdate: (id: string, data: Partial<WorkflowNodeData>) => void
  onDelete: (id: string) => void
}

// ─── Tags field ───────────────────────────────────────────────────────────────

function TagsInput({
  value,
  placeholder,
  onChange,
}: {
  value: string[]
  placeholder?: string
  onChange: (tags: string[]) => void
}) {
  const [inputVal, setInputVal] = useState('')

  const addTag = () => {
    const trimmed = inputVal.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInputVal('')
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && inputVal === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="wf-tags-wrap">
      {value.map((tag) => (
        <span key={tag} className="wf-tag-pill">
          {tag}
          <button
            type="button"
            className="wf-tag-remove"
            onClick={() => removeTag(tag)}
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="wf-tags-input"
        value={inputVal}
        placeholder={value.length === 0 ? placeholder : ''}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
      />
    </div>
  )
}

// ─── Toggle field ─────────────────────────────────────────────────────────────

function Toggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      role="switch"
      aria-checked={value}
      tabIndex={0}
      className={`wf-toggle${value ? ' wf-toggle--on' : ''}`}
      onClick={() => onChange(!value)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onChange(!value)
        }
      }}
    >
      <div className="wf-toggle-track">
        <div className="wf-toggle-thumb" />
      </div>
    </div>
  )
}

// ─── AI Enhance section (analytics nodes only) ────────────────────────────────

function AIEnhanceSection({
  onEnhance,
}: {
  onEnhance: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  const handleClick = () => {
    if (status !== 'idle') return
    setStatus('loading')
    onEnhance()
    setTimeout(() => setStatus('done'), 1500)
    setTimeout(() => setStatus('idle'), 3500)
  }

  return (
    <div className="wf-ai-section">
      <div className="wf-ai-divider" />
      <div className="wf-field-label">System Prompt AI Enhancement</div>
      <button
        type="button"
        className="wf-ai-enhance"
        onClick={handleClick}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Improving prompt...' : status === 'done' ? 'Prompt enhanced' : '✨ Enhance with AI'}
      </button>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function WorkflowRightPanel({
  node,
  onClose,
  onUpdate,
  onDelete,
}: WorkflowRightPanelProps) {
  // Mirror node.data locally so inputs are controlled
  const [localData, setLocalData] = useState<Record<string, unknown>>({})
  const [applyState, setApplyState] = useState<'idle' | 'done'>('idle')
  const applyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state whenever the selected node changes
  useEffect(() => {
    if (node) {
      setLocalData({ ...node.data })
      setApplyState('idle')
    }
  }, [node?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      if (!node) return
      setLocalData((prev) => ({ ...prev, [key]: value }))
      onUpdate(node.id, { [key]: value } as Partial<WorkflowNodeData>)
    },
    [node, onUpdate],
  )

  const handleApply = () => {
    if (!node) return
    onUpdate(node.id, localData as Partial<WorkflowNodeData>)
    setApplyState('done')
    if (applyTimer.current) clearTimeout(applyTimer.current)
    applyTimer.current = setTimeout(() => setApplyState('idle'), 1000)
  }

  const handleDelete = () => {
    if (!node) return
    onDelete(node.id)
  }

  const renderField = (field: FieldConfig) => {
    const rawValue = localData[field.key]

    switch (field.type) {
      case 'text':
        return (
          <input
            className="wf-field-input"
            value={typeof rawValue === 'string' ? rawValue : String(rawValue ?? '')}
            placeholder={field.placeholder}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            className="wf-field-input"
            value={rawValue !== undefined && rawValue !== null ? String(rawValue) : ''}
            placeholder={field.placeholder}
            onChange={(e) =>
              handleFieldChange(
                field.key,
                e.target.value === '' ? '' : Number(e.target.value),
              )
            }
          />
        )

      case 'textarea':
        return (
          <textarea
            className="wf-field-textarea"
            value={typeof rawValue === 'string' ? rawValue : String(rawValue ?? '')}
            placeholder={field.placeholder}
            rows={4}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
          />
        )

      case 'select':
        return (
          <select
            className="wf-field-select"
            value={typeof rawValue === 'string' ? rawValue : String(rawValue ?? '')}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
          >
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )

      case 'toggle':
        return (
          <Toggle
            value={Boolean(rawValue)}
            onChange={(v) => handleFieldChange(field.key, v)}
          />
        )

      case 'tags':
        return (
          <TagsInput
            value={Array.isArray(rawValue) ? (rawValue as string[]) : []}
            placeholder={field.placeholder}
            onChange={(tags) => handleFieldChange(field.key, tags)}
          />
        )

      default:
        return null
    }
  }

  if (!node) {
    return <aside className="wf-right-panel hidden" />
  }

  const config = NODE_CONFIGS[node.subtype]

  return (
    <aside className="wf-right-panel">
      {/* ── Header ── */}
      <div className="wf-panel-header">
        <div className="wf-panel-header-left">
          <div
            className="wf-panel-node-icon"
            style={{ backgroundColor: config.color }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={config.iconPath} />
            </svg>
          </div>
          <div className="wf-panel-node-meta">
            <span className="wf-panel-node-name">{config.label}</span>
            <span className="wf-panel-node-kind">{node.kind}</span>
          </div>
        </div>

        <button
          type="button"
          className="wf-panel-close"
          onClick={onClose}
          aria-label="Close panel"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            width={16}
            height={16}
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Body ── */}
      <div className="wf-panel-body">
        {config.fields.map((field) => (
          <div key={field.key} className="wf-field-group">
            <label className="wf-field-label">{field.label}</label>
            {renderField(field)}
            {field.hint && <div className="wf-field-hint">{field.hint}</div>}
          </div>
        ))}

        {node.kind === 'analytics' && (
          <AIEnhanceSection
            onEnhance={() => {
              // The system prompt field may already be shown above; enhancement
              // is a no-op placeholder until the API is wired in.
            }}
          />
        )}
      </div>

      {/* ── Footer ── */}
      <div className="wf-panel-footer">
        <button
          type="button"
          className="wf-btn wf-btn-danger"
          onClick={handleDelete}
        >
          Delete
        </button>
        <button
          type="button"
          className="wf-btn wf-btn-primary"
          onClick={handleApply}
        >
          {applyState === 'done' ? 'Applied ✓' : 'Apply'}
        </button>
      </div>
    </aside>
  )
}
