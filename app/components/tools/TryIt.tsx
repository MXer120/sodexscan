'use client'

import { useState, useCallback } from 'react'
import { invokeTool } from '../../lib/tools/client'

/**
 * Schema-driven "Try it" panel. Reads a tool's params, renders inputs,
 * invokes via the client helper, and pretty-prints the envelope.
 * Destructive tools show a confirmation step.
 */
export default function TryIt({ tool }) {
  const params = tool.params ?? []
  const [values, setValues] = useState(() => {
    const init = {}
    for (const p of params) {
      if (p.default === undefined) continue
      if (p.type === 'array' && p.itemType === 'enum') {
        init[p.name] = Array.isArray(p.default) ? [...p.default] : []
      } else {
        init[p.name] = String(p.default)
      }
    }
    return init
  })
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const update = (name, v) => setValues(prev => ({ ...prev, [name]: v }))

  const coerce = useCallback(() => {
    const out = {}
    for (const p of params) {
      const raw = values[p.name]
      if (raw === undefined || raw === '') continue
      if (p.type === 'boolean') out[p.name] = raw === 'true' || raw === true
      else if (p.type === 'number' || p.type === 'integer') out[p.name] = Number(raw)
      else if (p.type === 'array' && p.itemType === 'enum') {
        if (Array.isArray(raw) && raw.length > 0) out[p.name] = raw
      }
      else if (p.type === 'array') out[p.name] = String(raw).split(',').map(s => s.trim()).filter(Boolean)
      else out[p.name] = raw
    }
    return out
  }, [params, values])

  const toggleArrayValue = (name, value) => {
    setValues(prev => {
      const cur = Array.isArray(prev[name]) ? prev[name] : []
      const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
      return { ...prev, [name]: next }
    })
  }

  const run = async () => {
    setBusy(true); setResult(null)
    try {
      const res = await invokeTool(tool.id, coerce())
      setResult(res)
    } finally {
      setBusy(false); setConfirming(false); setConfirmText('')
    }
  }

  const destructive = tool.mutates && tool.destructive
  const canRun = !busy && (!destructive || (confirming && confirmText.toLowerCase() === 'confirm'))

  return (
    <div className="tm-form">
      {params.length === 0 && (
        <p className="tm-p">This tool takes no parameters. Click Run.</p>
      )}
      {params.map(p => (
        <div className="tm-field" key={p.name}>
          <label className="tm-label">
            <code>{p.name}</code>
            {p.required ? <span className="tm-req">*</span> : null}
            <span className="tm-label-hint">
              {p.type}{p.enum ? ` · ${p.enum.join(' | ')}` : ''}
              {p.default !== undefined ? ` · default: ${String(p.default)}` : ''}
              {p.description ? ` · ${p.description}` : ''}
            </span>
          </label>
          {p.type === 'array' && p.itemType === 'enum' ? (
            <div className="tm-checkbox-row">
              {(p.enum ?? []).map(v => {
                const checked = Array.isArray(values[p.name]) && values[p.name].includes(v)
                return (
                  <label key={v} className={`tm-chk${checked ? ' checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArrayValue(p.name, v)}
                    />
                    <span>{v}</span>
                  </label>
                )
              })}
            </div>
          ) : p.type === 'enum' ? (
            <select
              className="tm-input"
              value={values[p.name] ?? ''}
              onChange={e => update(p.name, e.target.value)}
            >
              <option value="">—</option>
              {(p.enum ?? []).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : p.type === 'boolean' ? (
            <select
              className="tm-input"
              value={String(values[p.name] ?? '')}
              onChange={e => update(p.name, e.target.value)}
            >
              <option value="">—</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              className={`tm-input${p.pattern || p.type === 'iso8601' ? ' mono' : ''}`}
              type={p.type === 'number' || p.type === 'integer' ? 'number' : 'text'}
              value={values[p.name] ?? ''}
              onChange={e => update(p.name, e.target.value)}
              placeholder={p.pattern || p.default || ''}
            />
          )}
        </div>
      ))}

      <div className="tm-actions">
        {destructive && !confirming ? (
          <button className="tm-btn tm-btn--danger" onClick={() => setConfirming(true)}>
            Request Destructive Call
          </button>
        ) : (
          <button
            className={`tm-btn ${destructive ? 'tm-btn--danger' : 'tm-btn--primary'}`}
            onClick={run}
            disabled={!canRun}
          >
            {busy ? <><span className="tm-spinner" /> Running…</> : (tool.mutates ? 'POST' : 'GET') + ' · Run'}
          </button>
        )}
        {tool.mutates && tool.tier === 'user' && (
          <span className="tm-label-hint">Requires signed-in session.</span>
        )}
      </div>

      {destructive && confirming && (
        <div className="tm-confirm">
          <strong>Destructive action</strong>
          <span>This tool ({tool.id}) permanently changes data. Type <code>confirm</code> to enable the Run button.</span>
          <input
            className="tm-input mono"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="confirm"
            autoFocus
          />
        </div>
      )}

      {result && (
        <div className="tm-result">
          <div className={`tm-result-head ${result.ok ? 'ok' : 'err'}`}>
            <span>{result.ok ? 'OK' : `Error · ${result.code ?? '—'}${result.field ? ` · field: ${result.field}` : ''}`}</span>
            <span className="tm-label-hint">{tool.mutates ? 'POST' : 'GET'} /api/tools/{tool.id}</span>
          </div>
          <div className="tm-result-body">
            <pre>{JSON.stringify(result.ok ? result.data : { error: result.error, code: result.code, field: result.field }, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
