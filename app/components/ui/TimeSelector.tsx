import React, { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { THEME_COLORS } from '../../lib/themeColors'

export function TimeSelector({
  value,
  onValueChange,
  options
}) {
  const selectedIndex = options.indexOf(value)
  const scrollRef = useRef(null)
  const [showRightShadow, setShowRightShadow] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const checkScroll = () => {
      const canScrollRight = el.scrollWidth > el.clientWidth &&
        el.scrollLeft < el.scrollWidth - el.clientWidth - 2
      setShowRightShadow(canScrollRight)
    }

    checkScroll()
    el.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)

    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [options])

  return (
    <div
      className="time-selector-outer"
      style={{
        position: 'relative',
        maxWidth: '100%'
      }}
    >
      <div
        ref={scrollRef}
        className="time-selector-wrapper"
        style={{
          maxWidth: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      >
        <style>{`
          .time-selector-wrapper::-webkit-scrollbar { display: none; }
          @media (max-width: 600px) {
            .time-selector-wrapper { justify-content: flex-start !important; }
          }
        `}</style>
        <div style={{
          display: 'inline-flex',
          height: '24px',
          borderRadius: '4px',
          background: 'var(--color-overlay-light)',
          border: '1px solid var(--border)',
          padding: '2px',
          boxSizing: 'border-box'
        }}>
          <div style={{ position: 'relative', display: 'flex', width: '100%', height: '100%' }}>
            {/* Animated background slider */}
            {selectedIndex !== -1 && (
              <motion.div
                style={{
                  position: 'absolute',
                  top: '0',
                  bottom: '0',
                  borderRadius: '3px',
                  background: 'rgba(var(--color-primary-rgb), 0.2)',
                  border: '1px solid rgba(var(--color-primary-rgb), 0.3)',
                  zIndex: 0,
                }}
                initial={false}
                animate={{
                  left: `${(selectedIndex * 100) / options.length}%`,
                  width: `${100 / options.length}%`,
                }}
                transition={{ type: 'spring', stiffness: 450, damping: 40 }}
              />
            )}

            {options.map((option, index) => (
              <button
                key={option}
                onClick={() => onValueChange(option)}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  padding: '0 8px',
                  minWidth: '32px',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: value === option ? 'var(--color-primary)' : 'var(--muted-foreground)',
                  fontSize: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Right scroll shadow indicator */}
      {showRightShadow && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '40px',
            background: 'linear-gradient(to right, transparent, var(--muted) 70%)',
            pointerEvents: 'none',
            borderRadius: '0 6px 6px 0'
          }}
        />
      )}
    </div>
  )
}

