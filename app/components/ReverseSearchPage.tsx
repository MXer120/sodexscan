'use client'

import React, { useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/SoPoints.css'

// SVGs
const DiscordIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}>
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
)

const TelegramIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
)

const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}>
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
)

// Simple CopyableAddress component inline to avoid import complexity
const CopyableAddress = ({ address }) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = async (e) => {
        e.stopPropagation()
        try {
            await navigator.clipboard.writeText(address)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch (err) {
            console.error('Copy failed:', err)
        }
    }

    const truncateAddress = (addr) => {
        if (!addr || addr.length < 12) return addr
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`
    }

    return (
        <span className="copyable-address" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'monospace' }}>{truncateAddress(address)}</span>
            <button
                className="copy-btn"
                onClick={handleCopy}
                title={copied ? 'Copied!' : 'Copy address'}
                style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    opacity: 0, // Hidden by default, shown on hover via CSS
                    transition: 'opacity 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center'
                }}
            >
                {copied ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                )}
            </button>
            <style jsx>{`
          .copyable-address:hover .copy-btn { opacity: 1 !important; }
          .copy-btn:hover svg { stroke: var(--color-success); }
        `}</style>
        </span>
    )
}

const ReverseSearchPage = () => {
    // 8 characters separated by ...
    // Indices 0-3: Start pattern (after 0x)
    // Indices 4-7: End pattern
    const [inputChars, setInputChars] = useState(Array(8).fill(''))
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    // Fill defaults if empty on first load? Or keep empty? 
    // User requested "verification code input", usually starts empty.

    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleCharChange = (index, value) => {
        // Handle space: treat as skip/empty
        if (value === ' ') {
            const newChars = [...inputChars]
            newChars[index] = '' // clear the box if space pressed
            setInputChars(newChars)
            // Auto-advance to skip
            if (index < 7) {
                inputRefs.current[index + 1]?.focus()
            }
            return
        }

        if (value.length > 1) {
            // Handle paste? 
            // If user pastes a long string, distribute it?
            // For now, take last char
            value = value.slice(-1)
        }

        const newChars = [...inputChars]
        newChars[index] = value
        setInputChars(newChars)

        // Auto-advance
        if (value && index < 7) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !inputChars[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    const handleSearch = async () => {
        const startBlock = inputChars.slice(0, 4)
        const endBlock = inputChars.slice(4, 8)

        // Validation: Count non-empty chars in start block
        const filledStartCount = startBlock.filter(c => c && c.trim()).length

        if (filledStartCount < 2) {
            setError('Please enter at least 2 characters in the start block.')
            return
        }

        setLoading(true)
        setError('')
        setResults([])

        try {
            // Convert empty inputs to SQL single-char wildcard '_'
            const toPattern = (block) => block.map(c => (c && c.trim()) ? c : '_').join('')

            const startPatternStr = toPattern(startBlock)
            const endPatternStr = toPattern(endBlock)

            // pattern: 0x + start + % + end
            const pattern = `0x${startPatternStr}%${endPatternStr}`

            // Limit to 100 to avoid huge queries
            const { data: wallets, error: searchError } = await supabase
                .from('leaderboard')
                .select('wallet_address, first_trade_ts_ms')
                .ilike('wallet_address', pattern)
                .limit(100)

            if (searchError) throw searchError

            if (!wallets || wallets.length === 0) {
                setLoading(false)
                setError('No matching wallets found in leaderboard.')
                return
            }

            const matchingWallets = wallets.map(w => w.wallet_address)

            // 2. Fetch details for these wallets
            const { data: socialData, error: socialError } = await supabase
                .from('publicdns')
                .select('wallet_address, dc_username, tg_username, tg_displayname, ref_code')
                .in('wallet_address', matchingWallets)

            if (socialError) console.error("Social data fetch error:", socialError)

            // Merge data
            const combinedResults = wallets.map(row => {
                const social = socialData?.find(s => s.wallet_address.toLowerCase() === row.wallet_address.toLowerCase())

                return {
                    wallet: row.wallet_address,
                    firstTrade: row.first_trade_ts_ms,
                    referralCode: social?.ref_code,
                    telegram: social?.tg_username || social?.tg_displayname,
                    discord: social?.dc_username,
                    x: null
                }
            })

            setResults(combinedResults)

        } catch (err) {
            console.error(err)
            setError('Error processing search: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (ts) => {
        if (!ts) return '-'
        const date = new Date(Number(ts))
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
    }

    return (
        <div className="sopoints-container">
            <h1 style={{ marginBottom: '20px' }}>Reverse Search</h1>

            <style jsx>{`
                /* Tooltip Styles */
                .tooltip-container {
                    position: relative;
                    display: inline-block;
                    cursor: help;
                }
                .tooltip-text {
                    visibility: hidden;
                    width: 220px;
                    background-color: var(--popover);
                    color: var(--popover-foreground);
                    text-align: center;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    padding: 8px;
                    position: absolute;
                    z-index: 100;
                    bottom: 125%; /* Position above */
                    left: 50%;
                    transform: translateX(-50%);
                    opacity: 0;
                    transition: opacity 0.2s, visibility 0.2s;
                    font-size: 11px;
                    box-shadow: 0 4px 6px var(--color-overlay-light);
                    pointer-events: none;
                }
                .tooltip-container:hover .tooltip-text {
                    visibility: visible;
                    opacity: 1;
                }
                .info-icon {
                    margin-left: 4px;
                    font-size: 10px;
                    opacity: 0.5;
                }
                
                /* Input Styles */
                .char-input {
                    width: 40px;
                    height: 50px;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    background: var(--input);
                    color: var(--foreground);
                    font-size: 20px;
                    text-align: center;
                    font-family: monospace;
                    outline: none;
                    transition: all 0.2s;
                }
                .char-input:focus {
                    border-color: var(--color-primary);
                    background: var(--background);
                    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
                }
                .char-grid {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin-bottom: 24px;
                }
                .char-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .separator {
                    color: var(--color-text-secondary);
                    font-size: 20px;
                    font-weight: bold;
                    margin: 0 8px;
                    letter-spacing: 2px;
                }
                @media (max-width: 520px) {
                    .char-grid {
                        flex-direction: column;
                        gap: 12px;
                    }
                    .separator {
                        margin: 4px 0;
                    }
                }
                .prefix {
                    font-family: monospace;
                    font-size: 20px;
                    color: var(--color-text-secondary);
                    margin-right: 8px;
                    font-weight: bold;
                }
            `}</style>

            <div className="sopoints-card" style={{ marginBottom: '32px', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                    Enter the known characters of the wallet address (0x...).
                </p>

                <div className="char-grid">
                    <div className="char-row">
                        <span className="prefix">0x</span>
                        {[0, 1, 2, 3].map((idx) => (
                            <input
                                key={idx}
                                ref={el => { inputRefs.current[idx] = el }}
                                type="text"
                                maxLength={1}
                                className="char-input"
                                value={inputChars[idx]}
                                onChange={(e) => handleCharChange(idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(idx, e)}
                            />
                        ))}
                    </div>

                    <span className="separator">...</span>

                    <div className="char-row">
                        {[4, 5, 6, 7].map((idx) => (
                            <input
                                key={idx}
                                ref={el => { inputRefs.current[idx] = el }}
                                type="text"
                                maxLength={1}
                                className="char-input"
                                value={inputChars[idx]}
                                onChange={(e) => handleCharChange(idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(idx, e)}
                            />
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="join-btn"
                    style={{ width: '100%', maxWidth: '400px', justifyContent: 'center', transform: 'none', margin: '0 auto' }}
                >
                    {loading ? 'Searching...' : 'Run Reverse Search'}
                </button>
                {error && <div style={{ color: 'var(--color-error)', marginTop: '16px' }}>{error}</div>}
            </div>

            {results.length > 0 && (
                <div className="sopoints-table-container">
                    <table className="sopoints-table">
                        <thead>
                            <tr>
                                <th>Address</th>
                                <th>First Trade</th>
                                <th>Referral Code</th>
                                <th style={{ textAlign: 'center' }} title="Telegram"><TelegramIcon /></th>
                                <th style={{ textAlign: 'center' }} title="Discord"><DiscordIcon /></th>
                                <th style={{ textAlign: 'center' }} title="X"><XIcon /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((row, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <CopyableAddress address={row.wallet} />
                                    </td>
                                    <td>{formatDate(row.firstTrade)}</td>
                                    <td>
                                        <div className="tooltip-container">
                                            {row.referralCode || '-'}
                                            {row.referralCode && <span className="info-icon">ⓘ</span>}
                                            <div className="tooltip-text">
                                                {row.referralCode
                                                    ? `Referral code ${row.referralCode} has been publicly observed in connection with this wallet. No claim of ownership or control.`
                                                    : `Referral code has not been publicly observed in connection with this wallet. No claim of ownership or control.`}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div className="tooltip-container">
                                            {row.telegram || '-'}
                                            {row.telegram && <span className="info-icon">ⓘ</span>}
                                            <div className="tooltip-text">
                                                {row.telegram
                                                    ? `This wallet has been publicly observed in connection with Telegram @${row.telegram}. No claim of ownership or control.`
                                                    : `This wallet has not been publicly observed in connection with a Telegram @handle. No claim of ownership or control.`}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div className="tooltip-container">
                                            {row.discord || '-'}
                                            {row.discord && <span className="info-icon">ⓘ</span>}
                                            <div className="tooltip-text">
                                                {row.discord
                                                    ? `This wallet has been publicly observed in connection with Discord @${row.discord}. No claim of ownership or control.`
                                                    : `This wallet has not been publicly observed in connection with a Discord @handle. No claim of ownership or control.`}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div className="tooltip-container">
                                            {row.x || '-'}
                                            {row.x && <span className="info-icon">ⓘ</span>}
                                            <div className="tooltip-text">
                                                {row.x
                                                    ? `This wallet has been publicly observed in connection with X @${row.x}. No claim of ownership or control.`
                                                    : `This wallet has not been publicly observed in connection with an X @handle. No claim of ownership or control.`}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default ReverseSearchPage
