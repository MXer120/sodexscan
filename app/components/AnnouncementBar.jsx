'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/AnnouncementBar.css'

const AnnouncementBar = () => {
    const [announcements, setAnnouncements] = useState([])
    const [dismissedData, setDismissedData] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Load dismissed data from local storage
        const saved = localStorage.getItem('dismissed_announcements_v2')
        if (saved) {
            try {
                setDismissedData(JSON.parse(saved))
            } catch (e) {
                console.error('Error parsing dismissed announcements:', e)
            }
        }

        const fetchAnnouncements = async () => {
            try {
                const { data, error } = await supabase
                    .from('announcement_status')
                    .select('*')
                    .eq('enabled', true)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Error fetching announcements:', error)
                } else {
                    setAnnouncements(data || [])
                }
            } catch (err) {
                console.error('Unexpected error fetching announcements:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchAnnouncements()

        // Optional: Real-time subscription to updates
        const subscription = supabase
            .channel('announcement_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_status' }, fetchAnnouncements)
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    const handleDismiss = (e, announcement) => {
        e.preventDefault()
        e.stopPropagation()

        const newDismissed = {
            ...dismissedData,
            [announcement.id]: {
                timestamp: Date.now(),
                content: announcement.content
            }
        }
        setDismissedData(newDismissed)
        localStorage.setItem('dismissed_announcements_v2', JSON.stringify(newDismissed))
    }

    // Filter out dismissed announcements logic
    const visibleAnnouncements = announcements.filter(a => {
        const stored = dismissedData[a.id]
        if (!stored) return true

        // 1. Check if expired (1 hour = 3,600,000 ms)
        const isExpired = Date.now() - stored.timestamp > 3600000
        if (isExpired) return true

        // 2. Check if content has changed
        const hasContentChanged = stored.content !== a.content
        if (hasContentChanged) return true

        return false
    })

    if (loading || visibleAnnouncements.length === 0) {
        return null
    }

    // Parse content to extract URL and clean text
    const parseContent = (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g
        const match = text.match(urlRegex)
        const url = match ? match[0] : null
        const cleanText = text.replace(urlRegex, '').trim()

        return { text: cleanText, url }
    }

    return (
        <>
            {visibleAnnouncements.map((announcement) => {
                const { text, url } = parseContent(announcement.content)
                const isClickable = !!url

                const Component = isClickable ? 'a' : 'div'
                const props = isClickable ? {
                    href: url,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: `announcement-bar announcement-${announcement.type} clickable`
                } : {
                    className: `announcement-bar announcement-${announcement.type}`
                }

                return (
                    <Component key={announcement.id} {...props}>
                        <div className="announcement-content">
                            <span>{text}</span>
                            {isClickable && (
                                <span style={{ marginLeft: '4px', opacity: 0.8 }}>
                                    ➜
                                </span>
                            )}
                        </div>
                        <button
                            className="announcement-close"
                            onClick={(e) => handleDismiss(e, announcement)}
                            aria-label="Close"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </Component>
                )
            })}
        </>
    )
}

export default AnnouncementBar
