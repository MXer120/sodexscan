'use client'

import React, { useState, useEffect, useCallback } from 'react'

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to the Aggregator',
    content: 'Your personal dashboard — mix and match widgets, build multiple pages, and save everything as templates. Let\'s take a quick tour.',
    target: null,
    type: 'info',
  },
  {
    id: 'sidebar',
    title: 'The Sidebar',
    content: 'The sidebar is your control center. All features are accessible from here. It can be collapsed to icons or expanded to show full labels.',
    target: '[data-tour="sidebar"]',
    type: 'info',
  },
  {
    id: 'expand',
    title: 'Expand the Sidebar',
    content: 'Click the expand button to reveal full labels, page management, and custom links. Try it now.',
    target: '[data-tour="expand-btn"]',
    type: 'click',
    clickHint: 'Click the expand button to continue',
  },
  {
    id: 'add-widget',
    title: 'Adding Widgets',
    content: 'Click the + button to open the widget picker. Choose from scanner widgets, charts, leaderboards, referral codes, and more.',
    target: '[data-tour="add-widget"]',
    type: 'info',
  },
  {
    id: 'pages',
    title: 'Dashboard Pages',
    content: 'You can have up to 3 separate pages, each with its own widget layout. Double-click a tab to rename it. Click the + icon to add a new page.',
    target: '[data-tour="add-page"]',
    type: 'info',
  },
  {
    id: 'master-element',
    title: 'The Master Element',
    content: 'The Master Element is a special container that lets you stack multiple widgets inside a single grid slot with custom column splits. Add one via the widget picker.',
    target: '[data-tour="master-element"]',
    type: 'info',
    scrollTo: true,
    fallbackCentered: true,
  },
  {
    id: 'edit-mode',
    title: 'Edit Mode',
    content: 'Edit Mode lets you drag, resize, and configure widgets. Turn it off to lock the layout and prevent accidental changes. Make sure it is on before editing.',
    target: '[data-tour="edit-mode"]',
    type: 'info',
  },
  {
    id: 'master-settings',
    title: 'Master Element Settings',
    content: 'Click the settings gear on a Master Element to configure its internal column splits and which widgets it contains.',
    target: '[data-tour="master-element-settings"]',
    type: 'info',
    fallbackCentered: true,
  },
  {
    id: 'templates',
    title: 'Templates',
    content: 'Save your current layout as a named template to restore it anytime. Load preset templates for a quick start. Templates store widgets, layouts, and colors.',
    target: '[data-tour="templates"]',
    type: 'info',
  },
  {
    id: 'wallet',
    title: 'Wallet Settings',
    content: 'Set a global wallet address that auto-fills all scanner widgets. You can override it per page or enable Auto-Use to pre-fill new widgets automatically.',
    target: '[data-tour="wallet"]',
    type: 'info',
  },
  {
    id: 'done',
    title: 'You\'re All Set',
    content: 'Your aggregator is ready to use. Add widgets, try different templates, and customize the layout to match your workflow.',
    target: null,
    type: 'info',
    isLast: true,
  },
]

const PAD = 10

function useTargetRect(step) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    const target = step?.target
    // Use centered fallback if target doesn't exist in DOM
    if (!target) { setRect(null); return }
    const measure = () => {
      const el = document.querySelector(target)
      if (!el && step.fallbackCentered) { setRect(null); return }
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    const t = setTimeout(measure, 120)
    window.addEventListener('resize', measure)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [step])

  return rect
}

function SpotlightOverlay({ rect }) {
  if (!rect) return <div className="agg-tour-overlay-full" />
  return (
    <div
      className="agg-tour-spotlight"
      style={{
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }}
    />
  )
}

function Callout({ step, rect, onNext, onPrev, onClose, stepIndex, total }) {
  const isLast = step.isLast || stepIndex === total - 1
  const isFirst = stepIndex === 0
  const isClickType = step.type === 'click'

  let style = {}
  const calloutW = 300
  const SAFE_TOP = 16
  const SAFE_BOTTOM = 100
  const CALLOUT_H = 260

  if (!rect) {
    const safeCenterTop = Math.min(
      (window.innerHeight - CALLOUT_H) / 2,
      window.innerHeight - SAFE_BOTTOM - CALLOUT_H
    )
    style = {
      top: Math.max(SAFE_TOP, safeCenterTop),
      left: '50%',
      transform: 'translateX(-50%)',
    }
  } else {
    const rightX = rect.right + PAD + 12
    const topY = rect.top + rect.height / 2
    const maxTop = window.innerHeight - SAFE_BOTTOM - CALLOUT_H

    if (rightX + calloutW < window.innerWidth - 16) {
      style = { left: rightX, top: Math.max(SAFE_TOP, Math.min(maxTop, topY - 80)) }
    } else {
      const aboveTop = rect.top - PAD - CALLOUT_H
      style = {
        left: Math.max(16, Math.min(window.innerWidth - calloutW - 16, rect.left)),
        top: Math.max(SAFE_TOP, Math.min(maxTop, aboveTop)),
      }
    }
  }

  return (
    <div className="agg-tour-callout" style={{ ...style, width: calloutW }}>
      <div className="agg-tour-callout-title">{step.title}</div>
      <div className="agg-tour-callout-body">{step.content}</div>
      {isClickType && <div className="agg-tour-click-hint">{step.clickHint}</div>}
      <div className="agg-tour-callout-footer">
        <div className="agg-tour-progress">{stepIndex + 1} / {total}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="agg-tour-skip" onClick={onClose}>End tour</button>
          {!isFirst && <button className="agg-tutorial-btn secondary" onClick={onPrev}>Back</button>}
          {!isClickType && (
            <button className="agg-tutorial-btn primary" onClick={isLast ? onClose : onNext}>
              {isLast ? 'Finish' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AggTutorial({ onClose }) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = TOUR_STEPS[stepIndex]
  const rect = useTargetRect(step)

  const nextStep = useCallback(() => {
    setStepIndex(i => Math.min(i + 1, TOUR_STEPS.length - 1))
  }, [])

  const prevStep = useCallback(() => {
    setStepIndex(i => Math.max(i - 1, 0))
  }, [])

  // Scroll target into view when needed
  useEffect(() => {
    if (!step.scrollTo || !step.target) return
    const el = document.querySelector(step.target)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [step])

  // Elevate target element above dark overlay; yellow blink for click steps
  useEffect(() => {
    if (!step.target) return
    const el = document.querySelector(step.target)
    if (!el) return
    el.classList.add('agg-tour-target-elevated')
    if (step.type === 'click') el.classList.add('agg-tour-target-btn')
    return () => {
      el.classList.remove('agg-tour-target-elevated')
      el.classList.remove('agg-tour-target-btn')
    }
  }, [step])

  // Click-type: advance on click
  useEffect(() => {
    if (step.type !== 'click' || !step.target) return
    const el = document.querySelector(step.target)
    if (!el) return
    const handler = () => setTimeout(nextStep, 200)
    el.addEventListener('click', handler, { once: true })
    return () => el.removeEventListener('click', handler)
  }, [step, nextStep])

  return (
    <>
      <SpotlightOverlay rect={rect} />
      <Callout
        step={step}
        rect={rect}
        onNext={nextStep}
        onPrev={prevStep}
        onClose={onClose}
        stepIndex={stepIndex}
        total={TOUR_STEPS.length}
      />
      <div className="agg-tour-dots">
        {TOUR_STEPS.map((_, i) => (
          <button
            key={i}
            className={`agg-tutorial-dot${i === stepIndex ? ' active' : i < stepIndex ? ' done' : ''}`}
            onClick={() => setStepIndex(i)}
            aria-label={`Step ${i + 1}`}
          />
        ))}
      </div>
    </>
  )
}
