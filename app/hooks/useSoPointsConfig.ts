'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface WeekConfig {
    week_num: number
    include_spot: boolean
    include_futures: boolean
    spot_multiplier: number
    notes: string | null
    updated_at: string | null
}

const DEFAULTS: Omit<WeekConfig, 'week_num' | 'notes' | 'updated_at'> = {
    include_spot: true,
    include_futures: true,
    spot_multiplier: 2.0
}

export function useSoPointsConfig() {
    const [configs, setConfigs] = useState<WeekConfig[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchConfigs = async () => {
            try {
                const { data, error } = await supabase
                    .from('sopoints_week_config')
                    .select('*')
                if (error) throw error
                setConfigs(data || [])
            } catch (err) {
                console.error('Failed to load sopoints week config:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchConfigs()
    }, [])

    const getWeekConfig = (weekNum: number): typeof DEFAULTS => {
        const found = configs.find(c => c.week_num === weekNum)
        if (!found) return { ...DEFAULTS }
        return {
            include_spot: found.include_spot ?? DEFAULTS.include_spot,
            include_futures: found.include_futures ?? DEFAULTS.include_futures,
            spot_multiplier: found.spot_multiplier ?? DEFAULTS.spot_multiplier
        }
    }

    return { getWeekConfig, loading }
}
