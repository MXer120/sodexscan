'use client'

import React, { useState, useEffect } from 'react'
import { fetchUserTags, WalletTag } from '../lib/walletTags'
import { supabase } from '../lib/supabaseClient'
import '../styles/SearchBox.css'

export type FilterType = 'all' | 'address' | 'tag' | 'socials' | 'discord' | 'telegram' | 'refcode' | 'pnl_rank' | 'volume_rank'

interface SearchAndAddBoxProps {
    onAction: (data: { wallet_address: string }) => Promise<any> | void
    isActionLoading?: boolean
    onSearchChange?: (value: string) => void
    searchValue?: string
    filterType?: FilterType
    onFilterChange?: (type: FilterType) => void
    actionLabel?: string
    placeholder?: string
}

export default function SearchAndAddBox({
    onAction,
    isActionLoading = false,
    onSearchChange,
    searchValue,
    filterType,
    onFilterChange,
    actionLabel = 'Add',
    placeholder
}: SearchAndAddBoxProps) {
    const [tags, setTags] = useState<WalletTag[]>([])
    const [error, setError] = useState<string | null>(null)
    const [internalValue, setInternalValue] = useState(searchValue || '')

    useEffect(() => {
        fetchUserTags().then(setTags)
    }, [])

    useEffect(() => {
        if (searchValue !== undefined) {
            setInternalValue(searchValue)
        }
    }, [searchValue])

    const handleAction = async () => {
        setError(null)
        const trimmed = internalValue.trim()
        if (!trimmed) return

        let addressToAdd = trimmed
        const currentFilter = filterType || 'all'

        try {
            // Direct address search
            if (currentFilter === 'address') {
                await onAction({ wallet_address: trimmed })
                if (searchValue === undefined) setInternalValue('')
                return
            }

            // Tag search
            if (currentFilter === 'tag') {
                const matchingTag = tags.find(t =>
                    t.tag_name.toLowerCase() === trimmed.toLowerCase()
                )
                if (matchingTag) {
                    await onAction({ wallet_address: matchingTag.wallet_address })
                    if (searchValue === undefined) setInternalValue('')
                    return
                }
                setError('Tag not found')
                return
            }

            // PnL Rank search
            if (currentFilter === 'pnl_rank') {
                const rank = parseInt(trimmed)
                if (isNaN(rank) || rank < 1) {
                    setError('Enter a valid rank number')
                    return
                }
                const { data, error: lbError } = await supabase
                    .from('leaderboard_smart')
                    .select('wallet_address')
                    .eq('pnl_rank', rank)
                    .maybeSingle()

                if (lbError || !data) {
                    setError(`No wallet at PnL rank #${rank}`)
                    return
                }
                await onAction({ wallet_address: data.wallet_address })
                if (searchValue === undefined) setInternalValue('')
                return
            }

            // Volume Rank search
            if (currentFilter === 'volume_rank') {
                const rank = parseInt(trimmed)
                if (isNaN(rank) || rank < 1) {
                    setError('Enter a valid rank number')
                    return
                }
                const { data, error: lbError } = await supabase
                    .from('leaderboard_smart')
                    .select('wallet_address')
                    .eq('volume_rank', rank)
                    .maybeSingle()

                if (lbError || !data) {
                    setError(`No wallet at Volume rank #${rank}`)
                    return
                }
                await onAction({ wallet_address: data.wallet_address })
                if (searchValue === undefined) setInternalValue('')
                return
            }

            // Social searches (publicdns)
            const lowerTrimmed = trimmed.toLowerCase()

            if (currentFilter === 'discord') {
                const { data, error: dnsError } = await supabase
                    .from('publicdns')
                    .select('wallet_address')
                    .ilike('dc_username', `%${lowerTrimmed}%`)
                    .limit(1)
                    .maybeSingle()

                if (dnsError || !data?.wallet_address) {
                    setError('Discord user not found')
                    return
                }
                await onAction({ wallet_address: data.wallet_address })
                if (searchValue === undefined) setInternalValue('')
                return
            }

            if (currentFilter === 'telegram') {
                const { data, error: dnsError } = await supabase
                    .from('publicdns')
                    .select('wallet_address')
                    .or(`tg_username.ilike.%${lowerTrimmed}%,tg_displayname.ilike.%${lowerTrimmed}%`)
                    .limit(1)
                    .maybeSingle()

                if (dnsError || !data?.wallet_address) {
                    setError('Telegram user not found')
                    return
                }
                await onAction({ wallet_address: data.wallet_address })
                if (searchValue === undefined) setInternalValue('')
                return
            }

            if (currentFilter === 'refcode') {
                const { data, error: dnsError } = await supabase
                    .from('publicdns')
                    .select('wallet_address')
                    .ilike('ref_code', lowerTrimmed)
                    .limit(1)
                    .maybeSingle()

                if (dnsError || !data?.wallet_address) {
                    setError('Referral code not found')
                    return
                }
                await onAction({ wallet_address: data.wallet_address })
                if (searchValue === undefined) setInternalValue('')
                return
            }

            if (currentFilter === 'socials') {
                // Search all social fields
                const { data, error: dnsError } = await supabase
                    .from('publicdns')
                    .select('wallet_address')
                    .or(`dc_username.ilike.%${lowerTrimmed}%,tg_username.ilike.%${lowerTrimmed}%,tg_displayname.ilike.%${lowerTrimmed}%,ref_code.ilike.%${lowerTrimmed}%`)
                    .limit(1)
                    .maybeSingle()

                if (dnsError || !data?.wallet_address) {
                    setError('No social match found')
                    return
                }
                await onAction({ wallet_address: data.wallet_address })
                if (searchValue === undefined) setInternalValue('')
                return
            }

            // 'all' filter - search address, tags, and all socials
            // First try tag match
            const matchingTag = tags.find(t =>
                t.tag_name.toLowerCase() === lowerTrimmed
            )
            if (matchingTag) {
                await onAction({ wallet_address: matchingTag.wallet_address })
                if (searchValue === undefined) setInternalValue('')
                return
            }

            // Try publicdns (all social fields)
            const { data: dnsData } = await supabase
                .from('publicdns')
                .select('wallet_address')
                .or(`dc_username.ilike.%${lowerTrimmed}%,tg_username.ilike.%${lowerTrimmed}%,tg_displayname.ilike.%${lowerTrimmed}%,ref_code.ilike.%${lowerTrimmed}%,wallet_address.ilike.%${lowerTrimmed}%`)
                .limit(1)
                .maybeSingle()

            if (dnsData?.wallet_address) {
                await onAction({ wallet_address: dnsData.wallet_address })
                if (searchValue === undefined) setInternalValue('')
                return
            }

            // Fallback: treat as address
            await onAction({ wallet_address: trimmed })
            if (searchValue === undefined) setInternalValue('')

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to process'
            setError(message)
            console.error('[SearchBox] Error:', message)
        }
    }

    const handleInputChange = (value: string) => {
        setInternalValue(value)
        if (onSearchChange) {
            onSearchChange(value)
        }
    }

    const getPlaceholder = () => {
        if (placeholder) return placeholder

        switch (filterType) {
            case 'address': return 'Search by address...'
            case 'tag': return 'Search by tag name...'
            case 'socials': return 'Search Discord, Telegram, or ref code...'
            case 'discord': return 'Search by Discord username...'
            case 'telegram': return 'Search by Telegram...'
            case 'refcode': return 'Search by referral code...'
            case 'pnl_rank': return 'Enter PnL rank (e.g. 1, 10)...'
            case 'volume_rank': return 'Enter Volume rank (e.g. 1, 10)...'
            default: return 'Search address, tag, or social...'
        }
    }

    return (
        <div className="search-add-container">
            <div className="search-add-box">
                {onFilterChange && filterType && (
                    <select
                        className="filter-dropdown"
                        value={filterType}
                        onChange={(e) => onFilterChange(e.target.value as FilterType)}
                    >
                        <option value="all">All Filters</option>
                        <option value="address">Address</option>
                        <option value="tag">Name Tags</option>
                        <option value="socials">All Socials</option>
                        <option value="discord">Discord</option>
                        <option value="telegram">Telegram</option>
                        <option value="refcode">Referral Code</option>
                        <option value="pnl_rank">PnL Rank</option>
                        <option value="volume_rank">Volume Rank</option>
                    </select>
                )}
                <input
                    type="text"
                    placeholder={getPlaceholder()}
                    value={internalValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="search-add-input"
                    disabled={isActionLoading}
                    onKeyDown={(e) => e.key === 'Enter' && handleAction()}
                />
                <button
                    className="add-button-inline"
                    onClick={handleAction}
                    disabled={isActionLoading || !internalValue.trim()}
                >
                    {isActionLoading ? 'Processing...' : actionLabel}
                </button>
            </div>
            {error && <div className="form-error">{error}</div>}
        </div>
    )
}
