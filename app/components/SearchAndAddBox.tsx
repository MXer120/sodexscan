'use client'

import React, { useState, useEffect } from 'react'
import { fetchUserTags, WalletTag } from '../lib/walletTags'
import '../styles/SearchBox.css'

export type FilterType = 'all' | 'address' | 'tag'

interface SearchAndAddBoxProps {
    onAction: (data: { wallet_address: string }) => Promise<any> | void // Function to run on button click/enter
    isActionLoading?: boolean
    onSearchChange?: (value: string) => void // Optional live search listener
    searchValue?: string // Controlled value from parent
    filterType?: FilterType
    onFilterChange?: (type: FilterType) => void
    actionLabel?: string // Default: 'Add'
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

    // Internal state if uncontrolled, otherwise sync with searchValue
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
        if (!trimmed) {
            return
        }

        let addressToAdd = trimmed

        // If input looks like a tag name, resolve it
        const matchingTag = tags.find(t =>
            t.tag_name.toLowerCase() === trimmed.toLowerCase()
        )

        if (matchingTag) {
            addressToAdd = matchingTag.wallet_address
        }

        try {
            await onAction({ wallet_address: addressToAdd })
            // Only clear if uncontrolled or if parent clears it via prop
            if (searchValue === undefined) {
                setInternalValue('')
            }
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
            case 'address': return 'Search or add by address...'
            case 'tag': return 'Search or add by tag name...'
            default: return 'Search or add by address / tag...'
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
