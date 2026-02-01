'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/AnnouncementBar.css'

const AnnouncementBar = () => {
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
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

    if (loading || announcements.length === 0) {
        return null
    }

    // Parse content to extract URL and clean text
    const parseContent = (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g
        const match = text.match(urlRegex)
        const url = match ? match[0] : null
        const cleanText = text.replace(urlRegex, '').trim()

        // Clean up trailing punctuation that might have been before the link (like "Sign up now: ")
        // If the text ends with ":" or "-", allow it if it makes sense, but we might want to trim it if it looks dangling.
        // For now, simple trim is enough, but user example "Sign up now: https..." -> "Sign up now:" which is fine.

        return { text: cleanText, url }
    }

    return (
        <>
            {announcements.map((announcement) => {
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
                    </Component>
                )
            })}
        </>
    )
}

export default AnnouncementBar
