'use client'

import React from 'react'
import ColorPicker from './ColorPicker'
import AggSelect from './AggSelect'

export default function WidgetSettingsPanel({
  instanceId, config, settingsSchema, visibilitySchema = [],
  onUpdate, onClose, recentColors = [], onAddRecentColor, resolvedWalletAddress = ''
}) {
  const handleChange = (key, value) => {
    onUpdate(instanceId, { ...config.settings, [key]: value })
  }

  return (
    <div className="agg-settings-panel" onClick={(e) => e.stopPropagation()}>
      <div className="agg-settings-header">
        <span>Settings</span>
        <button className="agg-settings-close" onClick={onClose}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Color settings */}
      <div className="agg-settings-row">
        <label className="agg-settings-label">Accent</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ColorPicker
            value={config.settings?.accentColor || '#48cbff'}
            onChange={(v) => handleChange('accentColor', v)}
            recentColors={recentColors}
            onAddRecent={onAddRecentColor}
          />
          {config.settings?.accentColor && (
            <button className="agg-settings-reset" onClick={() => handleChange('accentColor', undefined)}>Reset</button>
          )}
        </div>
      </div>

      <div className="agg-settings-row">
        <label className="agg-settings-label">Background</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ColorPicker
            value={config.settings?.bgColor || '#141414'}
            onChange={(v) => handleChange('bgColor', v)}
            recentColors={recentColors}
            onAddRecent={onAddRecentColor}
          />
          {config.settings?.bgColor && (
            <button className="agg-settings-reset" onClick={() => handleChange('bgColor', undefined)}>Reset</button>
          )}
        </div>
      </div>

      {/* Dynamic schema-driven settings */}
      {settingsSchema.map((field) => (
        <div key={field.key} className="agg-settings-row">
          <label className="agg-settings-label">{field.label}</label>
          {field.type === 'select' && (
            <AggSelect
              value={config.settings?.[field.key] ?? ''}
              onChange={(val) => {
                let v = val
                if (!isNaN(v) && v !== '' && v !== 'null') v = Number(v)
                if (v === 'null') v = null
                handleChange(field.key, v)
              }}
              options={field.options.map((opt, i) => ({
                value: String(opt),
                label: field.optionLabels ? field.optionLabels[i] : String(opt)
              }))}
            />
          )}
          {field.type === 'toggle' && (
            <label className="agg-toggle">
              <input
                type="checkbox"
                checked={config.settings?.[field.key] ?? false}
                onChange={(e) => handleChange(field.key, e.target.checked)}
              />
              <span className="agg-toggle-slider" />
            </label>
          )}
          {field.type === 'color' && (
            <ColorPicker
              value={config.settings?.[field.key] || '#48cbff'}
              onChange={(v) => handleChange(field.key, v)}
              recentColors={recentColors}
              onAddRecent={onAddRecentColor}
            />
          )}
          {field.type === 'number' && (
            <input
              type="number"
              value={config.settings?.[field.key] ?? ''}
              onChange={(e) => handleChange(field.key, Number(e.target.value))}
              className="agg-number-input"
            />
          )}
          {field.type === 'text' && (
            <input
              type="text"
              value={config.settings?.[field.key] ?? ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="agg-text-input"
              placeholder={
                field.key === 'walletAddress' && resolvedWalletAddress
                  ? `Inherited: ${resolvedWalletAddress.slice(0, 10)}…`
                  : '0x...'
              }
            />
          )}
        </div>
      ))}

      {/* Visibility toggles */}
      {visibilitySchema.length > 0 && (
        <div className="agg-settings-section">
          <div className="agg-settings-section-title">Visible Elements</div>
          {visibilitySchema.map((field) => (
            <div key={field.key} className="agg-settings-row">
              <label className="agg-settings-label">{field.label}</label>
              <label className="agg-toggle">
                <input
                  type="checkbox"
                  checked={config.settings?.[field.key] ?? field.default}
                  onChange={(e) => handleChange(field.key, e.target.checked)}
                />
                <span className="agg-toggle-slider" />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
