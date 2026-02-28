'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { PRESET_TEMPLATES } from '../components/aggregator/WidgetRegistry'

export interface GlobalTemplate {
  id: string
  name: string
  icon: string
  description: string
  layouts: { lg: any[]; md: any[]; sm: any[] }
  widgets: Record<string, any>
  sort_order: number
  created_at: string
}

const QK = ['global-templates']

export function useGlobalTemplates() {
  return useQuery<GlobalTemplate[]>({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_templates')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

export function useGlobalTemplateMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: QK })

  const create = useMutation({
    mutationFn: async (t: Omit<GlobalTemplate, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('global_templates').insert(t)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<GlobalTemplate> & { id: string }) => {
      const { error } = await supabase.from('global_templates').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('global_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  // Import all hardcoded presets into DB (one-time owner action)
  const importPresets = useMutation({
    mutationFn: async () => {
      const rows = PRESET_TEMPLATES.map((p: any, i: number) => ({
        name: p.name,
        icon: p.icon,
        description: p.description || '',
        layouts: p.layouts,
        widgets: p.widgets,
        sort_order: i,
      }))
      const { error } = await supabase.from('global_templates').insert(rows)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { create, update, remove, importPresets }
}
