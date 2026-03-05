'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

// Stored in global_templates with description='type:layout' to avoid schema changes
const LAYOUT_MARKER = 'type:layout'

export interface GlobalLayout {
  id: string
  name: string
  description: string
  layouts: { lg: any[]; md: any[]; sm: any[] }
  widgets: Record<string, any>
  sort_order: number
  created_at: string
}

const QK = ['global-layouts']

export function useGlobalLayouts() {
  return useQuery<GlobalLayout[]>({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_templates')
        .select('id, name, description, layouts, widgets, sort_order, created_at')
        .eq('description', LAYOUT_MARKER)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

function validateWidgets(widgets: Record<string, any>) {
  const invalid = Object.values(widgets).filter((w: any) => w?.type !== 'master-element')
  if (invalid.length > 0) {
    throw new Error('Global layouts may only contain master-element widgets')
  }
}

export function useGlobalLayoutMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: QK })

  const create = useMutation({
    mutationFn: async ({
      name,
      layouts,
      widgets,
    }: {
      name: string
      layouts: GlobalLayout['layouts']
      widgets: Record<string, any>
    }) => {
      validateWidgets(widgets)
      const maxSortOrder = await supabase
        .from('global_templates')
        .select('sort_order')
        .eq('description', LAYOUT_MARKER)
        .order('sort_order', { ascending: false })
        .limit(1)
      const nextOrder = ((maxSortOrder.data?.[0]?.sort_order ?? -1) as number) + 1
      const { error } = await supabase.from('global_templates').insert({
        name,
        icon: '',
        description: LAYOUT_MARKER,
        layouts,
        widgets,
        sort_order: nextOrder,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: async ({
      id,
      name,
      widgets,
    }: {
      id: string
      name?: string
      widgets?: Record<string, any>
    }) => {
      if (widgets) validateWidgets(widgets)
      const patch: Record<string, any> = {}
      if (name !== undefined) patch.name = name
      if (widgets !== undefined) patch.widgets = widgets
      const { error } = await supabase
        .from('global_templates')
        .update(patch)
        .eq('id', id)
        .eq('description', LAYOUT_MARKER)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('global_templates')
        .delete()
        .eq('id', id)
        .eq('description', LAYOUT_MARKER)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
