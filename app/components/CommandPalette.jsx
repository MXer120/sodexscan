'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { useSessionContext } from '../lib/SessionContext'
import '../styles/CommandPalette.css'

/* Icons */
export const Icons = {
    Home: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
    Scan: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>,
    Chart: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
    Users: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    Wallet: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>,
    Link: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>,
    File: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>,
    Filter: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
    Discord: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1892.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.1023.246.1972.3718.2914a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.699.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" /></svg>,
    Telegram: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>,
    Enter: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>,
    ArrowUp: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>,
    ArrowDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>,
    Radar: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path><path d="M12 12L19 5"></path><circle cx="12" cy="12" r="2"></circle></svg>,
    Star: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
}

// Define the filters with hotkey indices (1-9)
const TOP_FILTERS = [
    { id: 'pages', label: 'Pages', icon: <Icons.Link /> },
    { id: 'stats', label: 'Stats', icon: <Icons.Chart /> },
]

const NUMBERED_FILTERS = [
    { id: 'address', label: 'Address', icon: <Icons.Scan /> },
    { id: 'tag', label: 'Tags', icon: <Icons.Wallet /> },
    { id: 'socials', label: 'All Socials', icon: <Icons.Users /> },
    { id: 'discord', label: 'Discord', icon: <Icons.Discord /> },
    { id: 'telegram', label: 'Telegram', icon: <Icons.Telegram /> },
    { id: 'refcode', label: 'Ref Code', icon: <Icons.File /> },
    { id: 'pnl_rank', label: 'PnL Rank', icon: <Icons.Chart /> },
    { id: 'volume_rank', label: 'Volume Rank', icon: <Icons.Chart /> },
    { id: 'ticket', label: 'Tickets', icon: <Icons.File />, modOnly: true }
]

const ALL_FILTERS = [...TOP_FILTERS, ...NUMBERED_FILTERS]

export default function CommandPalette() {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState(null)
    const [pages, setPages] = useState([])
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeTraders: 0,
        tradersGt2k: 0,
        usersGt1kVol: 0
    })
    const [searchResults, setSearchResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [userTags, setUserTags] = useState([])
    const inputRef = useRef(null)
    const router = useRouter()
    const { isMod } = useSessionContext()

    // Shortcuts Map
    const shortcuts = [
        { key: 'p', path: '/profile', label: 'Profile' },
        { key: 's', path: '/tracker', label: 'Switch to Scan' },
        { key: 'l', path: '/mainnet', label: 'Leaderboard' },
        ...(isMod ? [{ key: 't', path: '/tickets', label: 'Tickets' }] : [])
    ]

    // Global Shortcuts & Init
    useEffect(() => {
        // Defines all pages (filtered by mod mode)
        const modHidden = ['/sopoints', '/social', '/social/stats', '/incoming']
        const allPages = [
            { name: 'Home', path: '/', icon: <Icons.Home /> },
            { name: 'Scanner', path: '/tracker', icon: <Icons.Scan />, shortcut: 'S' },
            { name: 'Leaderboard', path: '/mainnet', icon: <Icons.Chart />, shortcut: 'L' },
            { name: 'SoPoints', path: '/sopoints', icon: <Icons.File /> },
            { name: 'Social Leaderboard', path: '/social', icon: <Icons.Users /> },
            { name: 'Social Stats', path: '/social/stats', icon: <Icons.Chart /> },
            { name: 'Platform Stats', path: '/platform', icon: <Icons.Chart /> },
            { name: 'Watchlist', path: '/watchlist', icon: <Icons.Wallet /> },
            { name: 'Incoming', path: '/incoming', icon: <Icons.Scan /> },
            { name: 'Reverse Search', path: '/reverse-search', icon: <Icons.Scan /> },
            { name: 'Profile', path: '/profile', icon: <Icons.Users />, shortcut: 'P' },
            ...(isMod ? [{ name: 'Tickets', path: '/tickets', icon: <Icons.File />, shortcut: 'T' }] : [])
        ].filter(p => !(isMod && modHidden.includes(p.path)))
        setPages(allPages)

        loadStats()
        loadTags()

        const down = (e) => {
            // Toggle Open
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => {
                    if (!open) {
                        // Reset state on open
                        setSearch('')
                        setActiveFilter(null)
                        setSearchResults([])
                    }
                    return !open
                })
            }
            // Close on Esc
            if (e.key === 'Escape' && open) {
                setOpen(false)
            }

            // Quick Nav Shortcuts (Global, only when palette is closed OR open)
            if (e.metaKey || e.ctrlKey) {
                const match = shortcuts.find(s => s.key === e.key.toLowerCase())
                if (match) {
                    e.preventDefault()
                    router.push(match.path)
                    setOpen(false)
                }
            }
        }

        const handleOpenEvent = () => {
            setOpen(true)
            setSearch('')
            setActiveFilter(null)
            setSearchResults([])
        }

        document.addEventListener('keydown', down)
        if (typeof window !== 'undefined') window.addEventListener('openCommandPalette', handleOpenEvent)

        return () => {
            document.removeEventListener('keydown', down)
            if (typeof window !== 'undefined') window.removeEventListener('openCommandPalette', handleOpenEvent)
        }
    }, [open, router, isMod])

    // Focus input when opened
    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 10)
        }
    }, [open])

    // Filter Trigger Logic & Shortcut Selection
    const handleKeyDown = (e) => {
        // Trigger Filter Mode with '/'
        if (e.key === '/' && !activeFilter && search === '') {
            e.preventDefault()
            setSearch('/')
        }

        // Remove Filter with Backspace if search is empty
        if (e.key === 'Backspace' && activeFilter && search === '') {
            e.preventDefault()
            setActiveFilter(null)
        }

        // Filter Selection Shortcuts (1-9) - Now works when search is empty (or just '/')
        if ((search === '' || search === '/') && !activeFilter) {
            const num = parseInt(e.key)
            if (!isNaN(num) && num >= 1 && num <= 9) {
                const filterIndex = num - 1 // 1-based index
                if (NUMBERED_FILTERS[filterIndex]) {
                    e.preventDefault()
                    setActiveFilter(NUMBERED_FILTERS[filterIndex].id)
                    setSearch('')
                }
            }
        }
    }

    // Handle Search Input Change
    const handleSearchChange = (val) => {
        setSearch(val)
    }

    const loadStats = async () => {
        try {
            const [
                { count: totalUsers },
                { count: activeTraders },
                { count: tradersGt2k },
                { count: usersGt1kVol }
            ] = await Promise.all([
                supabase.from('leaderboard_smart').select('account_id', { count: 'exact', head: true }),
                supabase.from('leaderboard_smart').select('account_id', { count: 'exact', head: true }).or('cumulative_pnl.neq.0,cumulative_volume.gt.0'),
                supabase.from('leaderboard_smart').select('account_id', { count: 'exact', head: true }).gt('cumulative_volume', 2000),
                supabase.from('leaderboard_smart').select('account_id', { count: 'exact', head: true }).gt('cumulative_volume', 1000)
            ])

            setStats({
                totalUsers: totalUsers || 0,
                activeTraders: activeTraders || 0,
                tradersGt2k: tradersGt2k || 0,
                usersGt1kVol: usersGt1kVol || 0
            })
        } catch (err) {
            console.error('Failed stats load', err)
        }
    }

    const loadTags = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase.from('wallet_tags').select('wallet_address, tag_name, is_group, group_name').eq('user_id', user.id)
            if (data) setUserTags(data)
        } catch (e) { console.error(e) }
    }

    // --- SEARCH LOGIC ---
    useEffect(() => {
        // If we are in "Filter Selection Mode" (search === '/'), don't search
        if (search === '/') {
            setSearchResults([])
            setLoading(false)
            return
        }

        // If no search AND no active filter, we use the Default View (Popular, etc.)
        if ((!search || search.length < 1) && !activeFilter) {
            setSearchResults([])
            setLoading(false)
            return
        }

        setLoading(true)
        const timer = setTimeout(async () => {
            const results = []
            const term = search.toLowerCase().trim()
            const filter = activeFilter || 'all'
            const isEmpty = term === ''

            // --- 1. Pages ---
            if (filter === 'pages' || (filter === 'all' && !isEmpty)) {
                pages.forEach(p => {
                    if (isEmpty || p.name.toLowerCase().includes(term)) {
                        results.push({
                            type: 'page',
                            label: p.name,
                            value: p.path,
                            icon: p.icon,
                            group: 'Pages',
                            shortcut: p.shortcut
                        })
                    }
                })
            }

            // --- 2. Stats ---
            if (filter === 'stats' || (filter === 'all' && !isEmpty)) {
                const statItems = [
                    { label: 'Total Users', val: stats.totalUsers },
                    { label: 'Active Traders', val: stats.activeTraders },
                    { label: 'Traders > $2k Vol', val: stats.tradersGt2k },
                    { label: 'Traders > $1k Vol', val: stats.usersGt1kVol }
                ]
                statItems.forEach(s => {
                    if (isEmpty || s.label.toLowerCase().includes(term)) {
                        results.push({
                            type: 'stat',
                            label: s.label,
                            detail: s.val.toLocaleString(),
                            value: '/platform',
                            icon: <Icons.Chart />,
                            group: 'Statistics'
                        })
                    }
                })
            }

            // --- 3. Direct Address & Ranks & Tags ---

            // Tags allow all if empty
            if (filter === 'tag' || (filter === 'all' && !isEmpty)) {
                userTags.forEach(t => {
                    if (isEmpty || (t.tag_name && t.tag_name.toLowerCase().includes(term))) {
                        results.push({
                            type: 'tag',
                            label: t.tag_name,
                            value: t.wallet_address,
                            detail: t.wallet_address,
                            icon: <Icons.Wallet />,
                            group: 'Tags'
                        })
                    }
                })
            }

            // Address - only if term is present
            if ((filter === 'all' || filter === 'address') && term.startsWith('0x') && !isEmpty) {
                results.push({
                    type: 'address',
                    label: 'Go to Address',
                    value: term,
                    detail: term,
                    icon: <Icons.Scan />,
                    group: 'Navigation'
                })
            }

            // Rank Lookups - only if term is present and number
            if ((filter === 'pnl_rank' || filter === 'volume_rank') && !isNaN(parseInt(term)) && !isEmpty) {
                const rank = parseInt(term)
                const col = filter === 'pnl_rank' ? 'pnl_rank' : 'volume_rank'
                const { data: rankData } = await supabase
                    .from('leaderboard_smart')
                    .select('wallet_address')
                    .eq(col, rank)
                    .maybeSingle()

                if (rankData) {
                    results.push({
                        type: 'rank',
                        label: `${filter === 'pnl_rank' ? 'PnL' : 'Vol'} Rank #${rank}`,
                        value: rankData.wallet_address,
                        detail: rankData.wallet_address,
                        icon: <Icons.Chart />,
                        group: 'Rankings'
                    })
                }
            }

            // --- 6. Socials / DNS ---
            // Requires input (wildcard search on huge DB is not enabled for empty)
            const needsSocial = ['all', 'socials', 'discord', 'telegram', 'refcode', 'address'].includes(filter)
            if (needsSocial && term.length > 1) {
                let query = supabase.from('publicdns').select('wallet_address, dc_username, tg_username, ref_code')

                if (filter === 'discord') query = query.ilike('dc_username', `%${term}%`)
                else if (filter === 'telegram') query = query.or(`tg_username.ilike.%${term}%,tg_displayname.ilike.%${term}%`)
                else if (filter === 'refcode') query = query.ilike('ref_code', `%${term}%`)
                else if (filter === 'address') query = query.ilike('wallet_address', `%${term}%`)
                else {
                    query = query.or(`dc_username.ilike.%${term}%,tg_username.ilike.%${term}%,tg_displayname.ilike.%${term}%,ref_code.ilike.%${term}%,wallet_address.ilike.%${term}%`)
                }

                const { data: dnsData } = await query.limit(5)

                if (dnsData) {
                    dnsData.forEach(d => {
                        let hit = false
                        let label = 'Wallet Match'
                        let icon = <Icons.Users />

                        if (d.dc_username && d.dc_username.toLowerCase().includes(term)) {
                            label = d.dc_username
                            icon = <Icons.Discord />
                            hit = true
                        } else if (d.tg_username && d.tg_username.toLowerCase().includes(term)) {
                            label = d.tg_username
                            icon = <Icons.Telegram />
                            hit = true
                        } else if (d.ref_code && d.ref_code.toLowerCase().includes(term)) {
                            label = `Ref: ${d.ref_code}`
                            icon = <Icons.File />
                            hit = true
                        } else if (d.wallet_address.toLowerCase().includes(term)) {
                            label = 'Wallet Match'
                            icon = <Icons.Scan />
                            hit = true
                        }

                        if (hit) {
                            results.push({
                                type: 'social',
                                label: label,
                                value: d.wallet_address,
                                detail: d.wallet_address,
                                icon: icon,
                                group: 'Socials'
                            })
                        }
                    })
                }
            }

            // --- Ticket search (mod-only) ---
            if (isMod && (filter === 'ticket' || (filter === 'all' && term.length > 1))) {
                try {
                    const { data: ticketData } = await supabase
                        .from('tickets')
                        .select('id, channel_name, channel_id, details, wallet_address')
                        .or(`channel_name.ilike.%${term}%,channel_id.ilike.%${term}%,details.ilike.%${term}%,wallet_address.ilike.%${term}%`)
                        .limit(5)
                    if (ticketData) {
                        ticketData.forEach(t => {
                            results.push({
                                type: 'ticket',
                                label: t.channel_name || t.channel_id,
                                value: `/tickets/${t.id}`,
                                detail: t.details ? t.details.slice(0, 50) : t.wallet_address || '',
                                icon: <Icons.File />,
                                group: 'Tickets'
                            })
                        })
                    }
                } catch (e) { /* silently fail for non-mods */ }
            }

            setSearchResults(results)
            setLoading(false)
        }, 300)

        return () => clearTimeout(timer)
    }, [search, activeFilter, userTags, pages, isMod])


    const runCommand = (command) => {
        setOpen(false)
        command()
    }

    const navigateTo = (path) => {
        if (path.startsWith('/tickets/') || path.startsWith('/')) {
            router.push(path)
        } else if (path.startsWith('0x') || path.length > 30) {
            router.push(`/tracker?wallet=${path}`)
        } else {
            router.push(path)
        }
        setOpen(false)
    }

    // Define groups for Default View (Popular)
    const popularPages = pages.filter(p => ['Home', 'Scanner', 'Leaderboard', 'SoPoints'].includes(p.name))
    const otherPages = pages.filter(p => !['Home', 'Scanner', 'Leaderboard', 'SoPoints'].includes(p.name))

    if (!open) return null

    return (
        <div className="command-palette-overlay" onClick={() => setOpen(false)}>
            <div className="command-palette-container" onClick={(e) => e.stopPropagation()}>
                <Command shouldFilter={false} className="command-root">
                    <div className="command-input-wrapper">
                        <span className="search-icon">
                            {activeFilter ? <Icons.Filter /> : <Icons.Scan />}
                        </span>

                        {activeFilter && (
                            <span className="active-filter-badge">
                                {ALL_FILTERS.find(f => f.id === activeFilter)?.label || activeFilter}
                            </span>
                        )}

                        <Command.Input
                            ref={inputRef}
                            value={search}
                            onValueChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                            placeholder={activeFilter ? "Search..." : "Type a command or press '/' to filter..."}
                        />
                    </div>

                    <Command.List>

                        {/* Filter Selection Mode (explicitly via /) */}
                        {search === '/' && !activeFilter && (
                            <>
                                {/* Top Filters (No Number) */}
                                <Command.Group heading="General Filters">
                                    {TOP_FILTERS.map(f => (
                                        <Command.Item
                                            key={f.id}
                                            onSelect={() => {
                                                setActiveFilter(f.id)
                                                setSearch('')
                                            }}
                                            className="command-item"
                                        >
                                            <div className="command-item-content">
                                                <span className="command-icon">{f.icon}</span>
                                                <span>{f.label}</span>
                                            </div>
                                        </Command.Item>
                                    ))}
                                </Command.Group>

                                {/* Numbered Filters */}
                                <Command.Group heading="Specific Filters">
                                    {NUMBERED_FILTERS.filter(f => !f.modOnly || isMod).map((f, i) => (
                                        <Command.Item
                                            key={f.id}
                                            onSelect={() => {
                                                setActiveFilter(f.id)
                                                setSearch('')
                                            }}
                                            className="command-item"
                                        >
                                            <div className="command-item-content">
                                                <span className="command-icon">{f.icon}</span>
                                                <span>{f.label}</span>
                                            </div>
                                            <div className="command-shortcut-wrapper">
                                                <span className="key-cap">{i + 1}</span>
                                            </div>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            </>
                        )}
                        {/* Empty States */}
                        {!loading && search && search !== '/' && searchResults.length === 0 && (
                            <div className="command-empty">No results found.</div>
                        )}

                        {/* --- SEARCH RESULTS --- */}
                        {searchResults.length > 0 && (
                            <>
                                {/* Group results roughly */}
                                {['Pages', 'Statistics', 'Navigation', 'Rankings', 'Tags', 'Socials'].map(group => {
                                    const items = searchResults.filter(r => r.group === group)
                                    if (items.length === 0) return null
                                    return (
                                        <Command.Group key={group} heading={group}>
                                            {items.map((item, i) => (
                                                <Command.Item
                                                    key={item.value + i + item.label}
                                                    onSelect={() => navigateTo(item.value)}
                                                    className="command-item"
                                                >
                                                    <div className="command-item-content">
                                                        <span className="command-icon">{item.icon}</span>
                                                        <div className="wallet-info">
                                                            <span className="wallet-label">{item.label}</span>
                                                            {item.detail && <span className="wallet-detail">{item.detail}</span>}
                                                        </div>
                                                    </div>
                                                    {item.shortcut && (
                                                        <div className="command-shortcut-wrapper">
                                                            {/* If it's a number (filter), just show it. If it's a letter (global), show Cmd+Letter */}
                                                            {/[a-zA-Z]/.test(item.shortcut) ? (
                                                                <>
                                                                    <span className="key-cap">⌘</span>
                                                                    <span className="key-cap">{item.shortcut}</span>
                                                                </>
                                                            ) : (
                                                                <span className="key-cap">{item.shortcut}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </Command.Item>
                                            ))}
                                        </Command.Group>
                                    )
                                })}
                            </>
                        )}

                        {/* --- DEFAULT VIEW (No Search, No Filter) --- */}
                        {!search && !activeFilter && (
                            <>
                                <Command.Group heading="Popular">
                                    {popularPages.map(p => (
                                        <Command.Item key={p.path} onSelect={() => navigateTo(p.path)} className="command-item">
                                            <div className="command-item-content">
                                                <span className="command-icon">{p.icon}</span>
                                                <span>{p.name}</span>
                                            </div>
                                            {p.shortcut && (
                                                <div className="command-shortcut-wrapper">
                                                    <span className="key-cap">⌘</span>
                                                    <span className="key-cap">{p.shortcut}</span>
                                                </div>
                                            )}
                                        </Command.Item>
                                    ))}
                                    {/* Active Traders explicitly added here */}
                                    <Command.Item onSelect={() => navigateTo('/platform')} className="command-item">
                                        <div className="command-item-content">
                                            <span className="command-icon"><Icons.Chart /></span>
                                            <div className="wallet-info">
                                                <span className="wallet-label">Active Traders</span>
                                                <span className="wallet-detail">{stats.activeTraders.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </Command.Item>
                                </Command.Group>

                                <Command.Group heading="Statistics">
                                    <Command.Item onSelect={() => navigateTo('/platform')} className="command-item">
                                        <div className="command-item-content">
                                            <span className="command-icon"><Icons.Users /></span>
                                            <div className="wallet-info">
                                                <span className="wallet-label">Total Users</span>
                                                <span className="wallet-detail">{stats.totalUsers.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </Command.Item>
                                    <Command.Item onSelect={() => navigateTo('/platform')} className="command-item">
                                        <div className="command-item-content">
                                            <span className="command-icon"><Icons.Chart /></span>
                                            <div className="wallet-info">
                                                <span className="wallet-label">Traders &gt; $2k Vol</span>
                                                <span className="wallet-detail">{stats.tradersGt2k.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </Command.Item>
                                    <Command.Item onSelect={() => navigateTo('/platform')} className="command-item">
                                        <div className="command-item-content">
                                            <span className="command-icon"><Icons.Chart /></span>
                                            <div className="wallet-info">
                                                <span className="wallet-label">Traders &gt; $1k Vol</span>
                                                <span className="wallet-detail">{stats.usersGt1kVol.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </Command.Item>
                                </Command.Group>

                                <Command.Group heading="Other Pages">
                                    {otherPages.map(p => (
                                        <Command.Item key={p.path} onSelect={() => navigateTo(p.path)} className="command-item">
                                            <div className="command-item-content">
                                                <span className="command-icon">{p.icon}</span>
                                                <span>{p.name}</span>
                                            </div>
                                            {p.shortcut && (
                                                <div className="command-shortcut-wrapper">
                                                    <span className="key-cap">⌘</span>
                                                    <span className="key-cap">{p.shortcut}</span>
                                                </div>
                                            )}
                                        </Command.Item>
                                    ))}
                                </Command.Group>

                                {/* Filters List (Standard View) */}
                                <Command.Group heading="Filters">
                                    {NUMBERED_FILTERS.filter(f => !f.modOnly || isMod).map((f, i) => (
                                        <Command.Item
                                            key={f.id}
                                            onSelect={() => {
                                                setActiveFilter(f.id)
                                                setSearch('')
                                            }}
                                            className="command-item"
                                        >
                                            <div className="command-item-content">
                                                <span className="command-icon">{f.icon}</span>
                                                <span>{f.label}</span>
                                            </div>
                                            <div className="command-shortcut-wrapper">
                                                <span className="key-cap">{i + 1}</span>
                                            </div>
                                        </Command.Item>
                                    ))}
                                </Command.Group>

                            </>
                        )}

                    </Command.List>

                    <div className="command-footer">
                        <div className="footer-left">
                            <div className="footer-item">
                                <span className="key-cap">ESC</span>
                                <span style={{ marginLeft: 4 }}>Close</span>
                            </div>
                        </div>
                        <div className="footer-right">
                            <div className="footer-item">
                                <span className="key-cap">/</span>
                                <span style={{ marginLeft: 4 }}>Filter</span>
                            </div>
                            <div className="footer-item">
                                <span className="key-cap"><Icons.ArrowUp /></span>
                                <span className="key-cap"><Icons.ArrowDown /></span>
                                <span style={{ marginLeft: 4 }}>Navigate</span>
                            </div>
                            <div className="footer-item">
                                <span className="key-cap"><Icons.Enter /></span>
                                <span style={{ marginLeft: 4 }}>Open</span>
                            </div>
                        </div>
                    </div>

                </Command>
            </div>
        </div>
    )
}
