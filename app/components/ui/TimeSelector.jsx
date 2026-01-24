import React from 'react'
import { motion } from 'framer-motion'

export function TimeSelector({
  value,
  onValueChange,
  options
}) {
  const selectedIndex = options.indexOf(value)

  return (
    <div
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
        height: '32px',
        borderRadius: '6px',
        background: 'rgba(30, 30, 30, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        padding: '3px',
        gap: '2px'
      }}>
        <div style={{ position: 'relative', display: 'flex', gap: '2px' }}>
        {/* Animated background slider */}
        <motion.div
          style={{
            position: 'absolute',
            top: '0',
            bottom: '0',
            borderRadius: '4px',
            background: 'rgba(60, 60, 60, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 0
          }}
          initial={false}
          animate={{
            left: `${selectedIndex * (100 / options.length)}%`,
            width: `${100 / options.length}%`
          }}
          transition={{
            duration: 0
          }}
        />

        {options.map((option, index) => (
          <button
            key={option}
            onClick={() => onValueChange(option)}
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '0 12px',
              minWidth: '50px',
              background: 'transparent',
              border: 'none',
              color: value === option ? '#fff' : 'rgba(255, 255, 255, 0.4)',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'color 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (value !== option) {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
              }
            }}
            onMouseLeave={(e) => {
              if (value !== option) {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'
              }
            }}
          >
            {option}
          </button>
        ))}
        </div>
      </div>
    </div>
  )
}
