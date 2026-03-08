'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Page transition: fade-to-dark on navigate, fade-in on new page.
 * Intercepts <a> clicks to play exit animation before Next.js navigates.
 */
export default function PageTransition({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [phase, setPhase] = useState('in')   // 'in' | 'out' | 'black'
  const prevPath = useRef(pathname)
  const pendingHref = useRef(null)

  // When pathname actually changes (after navigation), play enter animation
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      // Brief black hold, then fade in
      setPhase('black')
      const t = setTimeout(() => setPhase('in'), 80)
      return () => clearTimeout(t)
    }
  }, [pathname])

  // Intercept internal link clicks to play exit animation first
  const handleClick = useCallback((e) => {
    const anchor = e.target.closest('a[href]')
    if (!anchor) return

    const href = anchor.getAttribute('href')
    if (!href) return

    // Skip external links, hash links, new-tab links
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return
    if (anchor.target === '_blank') return
    // Skip if modifier key held (open in new tab)
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    // Skip if same page
    if (href === pathname) return

    e.preventDefault()
    pendingHref.current = href
    setPhase('out')
  }, [pathname])

  // After exit animation ends, navigate
  useEffect(() => {
    if (phase === 'out') {
      const t = setTimeout(() => {
        setPhase('black')
        if (pendingHref.current) {
          router.push(pendingHref.current)
          pendingHref.current = null
        }
      }, 250) // match CSS exit duration
      return () => clearTimeout(t)
    }
  }, [phase, router])

  // Attach click listener to document
  useEffect(() => {
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [handleClick])

  return (
    <div className={`page-transition page-transition--${phase}`}>
      {children}
    </div>
  )
}
