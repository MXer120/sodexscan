'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionContext } from '../lib/SessionContext'
import { supabase } from '../lib/supabaseClient'
import { useCallback, useRef, useState, useEffect } from 'react'
import { DEFAULT_LAYOUT_V2, WIDGET_REGISTRY, PRESET_TEMPLATES } from '../components/aggregator/WidgetRegistry'

// ── Types ──────────────────────────────────────────────────────────
interface WidgetConfig {
  type: string
  settings: Record<string, any>
}

interface PageConfig {
  name: string
  templateId: string | null
  defaultWallet: string
  layouts: { lg: any[]; md: any[]; sm: any[] }
  widgets: Record<string, WidgetConfig>
}

interface TemplateConfig {
  id: string
  name: string
  layouts: { lg: any[]; md: any[]; sm: any[] }
  widgets: Record<string, WidgetConfig>
  recentColors: string[]
}

interface QuickLink {
  id: string
  name: string
  url: string
  icon: string
  folder: string | null
}

interface FolderConfig {
  name: string
}

interface AggregatorData {
  version: number
  navDock: 'left' | 'right' | 'top' | 'bottom'
  navPosition: { x: number; y: number } | null
  navExpanded: boolean
  activePageIndex: number
  globalWallet: string
  pages: PageConfig[]
  templates: TemplateConfig[]
  quickLinks: QuickLink[]
  folders: FolderConfig[]
}

// ── Template sync helper ──────────────────────────────────────────
function syncPageToTemplate(d: AggregatorData, page: PageConfig): AggregatorData['templates'] {
  if (!page.templateId) return d.templates
  return d.templates.map(t => {
    if (t.id !== page.templateId) return t
    return {
      ...t,
      layouts: JSON.parse(JSON.stringify(page.layouts)),
      widgets: JSON.parse(JSON.stringify(page.widgets)),
    }
  })
}

// ── V1 → V2 Migration ─────────────────────────────────────────────
function migrateV1toV2(v1: any): AggregatorData {
  return {
    version: 2,
    navDock: 'left',
    navPosition: null,
    navExpanded: false,
    activePageIndex: 0,
    globalWallet: '',
    pages: [{
      name: 'Page 1',
      templateId: null,
      defaultWallet: '',
      layouts: v1.layouts || { lg: [], md: [], sm: [] },
      widgets: v1.widgets || {}
    }],
    templates: [],
    quickLinks: [],
    folders: []
  }
}

function ensureV2(data: any): AggregatorData {
  if (!data) return JSON.parse(JSON.stringify(DEFAULT_LAYOUT_V2)) as AggregatorData
  if (data.version === 2) {
    if (!data.quickLinks) data.quickLinks = []
    if (!data.folders) data.folders = []
    if (!data.globalWallet) data.globalWallet = ''
    // On load: populate pages from their templates + ensure defaultWallet exists
    if (data.pages) {
      data.pages = data.pages.map((p: any) => {
        const page = { defaultWallet: '', ...p }
        if (!page.templateId || !data.templates) return page
        const t = (data.templates || []).find((t: any) => t.id === page.templateId)
        if (!t) return { ...page, templateId: null }
        return {
          ...page,
          layouts: JSON.parse(JSON.stringify(t.layouts)),
          widgets: JSON.parse(JSON.stringify(t.widgets))
        }
      })
    }
    return data as AggregatorData
  }
  if (data.layouts && data.widgets && !data.pages) return migrateV1toV2(data)
  return JSON.parse(JSON.stringify(DEFAULT_LAYOUT_V2)) as AggregatorData
}

// ── localStorage cache helpers ──────────────────────────────────────
const LS_KEY = (userId: string) => `agg-v2-${userId}`

function readLS(userId: string): AggregatorData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY(userId))
    if (!raw) return null
    return ensureV2(JSON.parse(raw))
  } catch { return null }
}

function writeLS(userId: string, data: AggregatorData) {
  try { localStorage.setItem(LS_KEY(userId), JSON.stringify(data)) } catch {}
}

// ── Hook ───────────────────────────────────────────────────────────
export function useAggregatorLayout() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  const [localData, setLocalData] = useState<AggregatorData | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const serverDataRef = useRef<AggregatorData | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // Fetch from DB — uses localStorage as initialData for instant load
  const { data: serverData, isLoading } = useQuery({
    queryKey: ['aggregator-layout', user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_LAYOUT_V2 as AggregatorData
      const { data, error } = await supabase
        .from('profiles')
        .select('aggregator_layout')
        .eq('id', user.id)
        .single()
      if (error) throw error
      const result = ensureV2(data?.aggregator_layout)
      // Keep LS in sync with server
      writeLS(user.id, result)
      return result
    },
    enabled: !!user,
    // Treat initialData (from LS) as immediately stale → always background-fetch
    // but UI won't show loading state when LS data is available
    initialData: () => (user ? readLS(user.id) ?? undefined : undefined),
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60_000,   // 5 min — skip refetch if already fresh
    gcTime: 24 * 60 * 60_000, // keep in memory 24h
  })

  // Loading progress animation — only runs when no LS data (true first-time load)
  useEffect(() => {
    if (!user) { setLoadingProgress(0); return }
    if (isLoading) {
      setLoadingProgress(15)
      const timers = [
        setTimeout(() => setLoadingProgress(35), 200),
        setTimeout(() => setLoadingProgress(55), 600),
        setTimeout(() => setLoadingProgress(70), 1200),
      ]
      return () => timers.forEach(clearTimeout)
    }
    if (serverData) {
      setLoadingProgress(90)
      const t = setTimeout(() => setLoadingProgress(100), 150)
      return () => clearTimeout(t)
    }
  }, [isLoading, !!serverData, !!user])

  // Sync server → local on first load; prefer server if different from LS
  useEffect(() => {
    if (serverData && !localData) {
      setLocalData(serverData)
      serverDataRef.current = serverData
    }
  }, [serverData, localData])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newData: AggregatorData) => {
      if (!user) return
      const { error } = await supabase
        .from('profiles')
        .update({ aggregator_layout: newData })
        .eq('id', user.id)
      if (error) throw error
    },
    onSuccess: (_, newData) => {
      queryClient.setQueryData(['aggregator-layout', user?.id], newData)
      serverDataRef.current = newData
      setIsDirty(false)
      // Keep LS immediately up-to-date so next tab opens with latest data
      if (user) writeLS(user.id, newData)
    }
  })

  // ── Auto-save (debounced) ────────────────────────────────────────
  useEffect(() => {
    if (!isDirty || !localData || !user) return
    // Write to localStorage immediately — instant cross-tab consistency
    writeLS(user.id, localData)
    // Debounce Supabase write
    const timer = setTimeout(() => {
      saveMutation.mutate(localData)
    }, 1500)
    return () => clearTimeout(timer)
  }, [localData, isDirty])

  const current = localData || serverData || DEFAULT_LAYOUT_V2 as AggregatorData

  // ── Local update helper ──────────────────────────────────────────
  const updateLocal = useCallback((updater: (prev: AggregatorData) => AggregatorData) => {
    setLocalData(prev => {
      const next = updater(prev || DEFAULT_LAYOUT_V2 as AggregatorData)
      setIsDirty(true)
      return next
    })
  }, [])

  // ── Active page helpers ───────────────────────────────────────
  const activePage = current.pages[current.activePageIndex] || current.pages[0]
  const activePageIndex = current.activePageIndex

  const setActivePage = useCallback((index: number) => {
    updateLocal(d => ({ ...d, activePageIndex: Math.min(index, d.pages.length - 1) }))
  }, [updateLocal])

  const addPage = useCallback(() => {
    updateLocal(d => {
      if (d.pages.length >= 3) return d
      const newPage: PageConfig = {
        name: `Page ${d.pages.length + 1}`,
        templateId: null,
        defaultWallet: '',
        layouts: { lg: [], md: [], sm: [] },
        widgets: {}
      }
      return { ...d, pages: [...d.pages, newPage], activePageIndex: d.pages.length }
    })
  }, [updateLocal])

  const removePage = useCallback((index: number) => {
    updateLocal(d => {
      if (d.pages.length <= 1) return d
      const pages = d.pages.filter((_, i) => i !== index)
      const newIndex = d.activePageIndex >= pages.length ? pages.length - 1 : d.activePageIndex
      return { ...d, pages, activePageIndex: newIndex }
    })
  }, [updateLocal])

  const renamePage = useCallback((index: number, name: string) => {
    updateLocal(d => {
      const pages = [...d.pages]
      pages[index] = { ...pages[index], name }
      return { ...d, pages }
    })
  }, [updateLocal])

  // ── Layout & widget ops (with template auto-sync) ─────────────
  const updateLayout = useCallback((newLayouts: any) => {
    updateLocal(d => {
      const pages = [...d.pages]
      const page = { ...pages[d.activePageIndex], layouts: newLayouts }
      pages[d.activePageIndex] = page
      return { ...d, pages, templates: syncPageToTemplate(d, page) }
    })
  }, [updateLocal])

  const updateWidgetConfig = useCallback((instanceId: string, settings: any) => {
    updateLocal(d => {
      const pages = [...d.pages]
      const page = { ...pages[d.activePageIndex] }
      page.widgets = {
        ...page.widgets,
        [instanceId]: { ...page.widgets[instanceId], settings }
      }
      pages[d.activePageIndex] = page
      return { ...d, pages, templates: syncPageToTemplate(d, page) }
    })
  }, [updateLocal])

  const addWidget = useCallback((typeId: string) => {
    const reg = WIDGET_REGISTRY[typeId]
    if (!reg) return
    const instanceId = `${typeId}-${Date.now()}`
    const { w, h, minW, minH } = reg.defaultSize
    const newItem = { i: instanceId, x: 0, y: Infinity, w, h, minW, minH }
    updateLocal(d => {
      const pages = [...d.pages]
      const page = { ...pages[d.activePageIndex] }
      page.layouts = {
        lg: [...(page.layouts?.lg || []), newItem],
        md: [...(page.layouts?.md || []), { ...newItem, w: Math.min(w, 6) }],
        sm: [...(page.layouts?.sm || []), { ...newItem, x: 0, w: 2 }],
      }
      page.widgets = {
        ...page.widgets,
        [instanceId]: { type: typeId, settings: { ...reg.defaultSettings } }
      }
      pages[d.activePageIndex] = page
      return { ...d, pages, templates: syncPageToTemplate(d, page) }
    })
  }, [updateLocal])

  const removeWidget = useCallback((instanceId: string) => {
    updateLocal(d => {
      const pages = [...d.pages]
      const page = { ...pages[d.activePageIndex] }
      const newWidgets = { ...page.widgets }
      delete newWidgets[instanceId]
      const filterLayout = (items: any[]) => (items || []).filter((item: any) => item.i !== instanceId)
      page.layouts = {
        lg: filterLayout(page.layouts?.lg),
        md: filterLayout(page.layouts?.md),
        sm: filterLayout(page.layouts?.sm),
      }
      page.widgets = newWidgets
      pages[d.activePageIndex] = page
      return { ...d, pages, templates: syncPageToTemplate(d, page) }
    })
  }, [updateLocal])

  // ── Nav dock ──────────────────────────────────────────────────
  const setNavDock = useCallback((dock: AggregatorData['navDock']) => {
    updateLocal(d => ({ ...d, navDock: dock }))
  }, [updateLocal])

  const setNavPosition = useCallback((pos: { x: number; y: number }) => {
    updateLocal(d => ({ ...d, navPosition: pos }))
  }, [updateLocal])

  const setNavExpanded = useCallback((expanded: boolean) => {
    updateLocal(d => ({ ...d, navExpanded: expanded }))
  }, [updateLocal])

  // ── Template CRUD ─────────────────────────────────────────────
  const saveAsTemplate = useCallback((name: string) => {
    updateLocal(d => {
      if (d.templates.length >= 3) return d
      const page = d.pages[d.activePageIndex]
      const id = `t-${Date.now()}`
      const template: TemplateConfig = {
        id, name,
        layouts: JSON.parse(JSON.stringify(page.layouts)),
        widgets: JSON.parse(JSON.stringify(page.widgets)),
        recentColors: []
      }
      const pages = [...d.pages]
      pages[d.activePageIndex] = { ...pages[d.activePageIndex], templateId: id }
      return { ...d, pages, templates: [...d.templates, template] }
    })
  }, [updateLocal])

  const updateTemplate = useCallback((templateId: string) => {
    updateLocal(d => {
      const idx = d.templates.findIndex(t => t.id === templateId)
      if (idx === -1) return d
      const page = d.pages[d.activePageIndex]
      const templates = [...d.templates]
      templates[idx] = {
        ...templates[idx],
        layouts: JSON.parse(JSON.stringify(page.layouts)),
        widgets: JSON.parse(JSON.stringify(page.widgets)),
      }
      return { ...d, templates }
    })
  }, [updateLocal])

  const loadTemplate = useCallback((templateId: string) => {
    updateLocal(d => {
      const template = d.templates.find(t => t.id === templateId)
      if (!template) return d
      const pages = [...d.pages]
      pages[d.activePageIndex] = {
        ...pages[d.activePageIndex],
        templateId,
        layouts: JSON.parse(JSON.stringify(template.layouts)),
        widgets: JSON.parse(JSON.stringify(template.widgets)),
      }
      return { ...d, pages }
    })
  }, [updateLocal])

  // Apply arbitrary layouts+widgets to current page (for global templates)
  const applyLayoutPreset = useCallback((layouts: any, widgets: any) => {
    updateLocal(d => {
      const pages = [...d.pages]
      pages[d.activePageIndex] = {
        ...pages[d.activePageIndex],
        templateId: null,
        layouts: JSON.parse(JSON.stringify(layouts)),
        widgets: JSON.parse(JSON.stringify(widgets)),
      }
      return { ...d, pages }
    })
  }, [updateLocal])

  // Load a preset (read-only) — copies layout without setting templateId
  const loadPresetTemplate = useCallback((presetId: string) => {
    const preset = PRESET_TEMPLATES.find((p: any) => p.id === presetId)
    if (!preset) return
    updateLocal(d => {
      const pages = [...d.pages]
      pages[d.activePageIndex] = {
        ...pages[d.activePageIndex],
        templateId: null,
        layouts: JSON.parse(JSON.stringify(preset.layouts)),
        widgets: JSON.parse(JSON.stringify(preset.widgets)),
      }
      return { ...d, pages }
    })
  }, [updateLocal])

  const deleteTemplate = useCallback((templateId: string) => {
    updateLocal(d => {
      const templates = d.templates.filter(t => t.id !== templateId)
      const pages = d.pages.map(p => p.templateId === templateId ? { ...p, templateId: null } : p)
      return { ...d, pages, templates }
    })
  }, [updateLocal])

  const renameTemplate = useCallback((templateId: string, name: string) => {
    updateLocal(d => {
      const templates = d.templates.map(t => t.id === templateId ? { ...t, name } : t)
      return { ...d, templates }
    })
  }, [updateLocal])

  const addRecentColor = useCallback((color: string) => {
    updateLocal(d => {
      const page = d.pages[d.activePageIndex]
      if (!page.templateId) return d
      const templates = d.templates.map(t => {
        if (t.id !== page.templateId) return t
        const colors = [color, ...t.recentColors.filter(c => c !== color)].slice(0, 8)
        return { ...t, recentColors: colors }
      })
      return { ...d, templates }
    })
  }, [updateLocal])

  // ── Reset ──────────────────────────────────────────────────────
  const resetToDefault = useCallback(() => {
    updateLocal(() => JSON.parse(JSON.stringify(DEFAULT_LAYOUT_V2)) as AggregatorData)
  }, [updateLocal])

  // ── Quick Links CRUD ────────────────────────────────────────────
  const addQuickLink = useCallback((link: Omit<QuickLink, 'id'>) => {
    updateLocal(d => ({
      ...d,
      quickLinks: [...(d.quickLinks || []), { ...link, id: `ql-${Date.now()}` }]
    }))
  }, [updateLocal])

  const removeQuickLink = useCallback((linkId: string) => {
    updateLocal(d => ({
      ...d,
      quickLinks: (d.quickLinks || []).filter(l => l.id !== linkId)
    }))
  }, [updateLocal])

  const updateQuickLink = useCallback((linkId: string, updates: Partial<QuickLink>) => {
    updateLocal(d => ({
      ...d,
      quickLinks: (d.quickLinks || []).map(l => l.id === linkId ? { ...l, ...updates } : l)
    }))
  }, [updateLocal])

  const reorderQuickLinks = useCallback((newOrder: QuickLink[]) => {
    updateLocal(d => ({ ...d, quickLinks: newOrder }))
  }, [updateLocal])

  // ── Folder CRUD ─────────────────────────────────────────────────
  const addFolder = useCallback((name: string) => {
    updateLocal(d => ({
      ...d,
      folders: [...(d.folders || []), { name }]
    }))
  }, [updateLocal])

  const renameFolder = useCallback((oldName: string, newName: string) => {
    updateLocal(d => ({
      ...d,
      folders: (d.folders || []).map(f => f.name === oldName ? { ...f, name: newName } : f),
      quickLinks: (d.quickLinks || []).map(l => l.folder === oldName ? { ...l, folder: newName } : l)
    }))
  }, [updateLocal])

  // ── Wallet ─────────────────────────────────────────────────────
  const setGlobalWallet = useCallback((wallet: string) => {
    updateLocal(d => ({ ...d, globalWallet: wallet }))
  }, [updateLocal])

  const setPageDefaultWallet = useCallback((pageIndex: number, wallet: string) => {
    updateLocal(d => {
      const pages = [...d.pages]
      pages[pageIndex] = { ...pages[pageIndex], defaultWallet: wallet }
      return { ...d, pages }
    })
  }, [updateLocal])

  const removeFolder = useCallback((name: string) => {
    updateLocal(d => ({
      ...d,
      folders: (d.folders || []).filter(f => f.name !== name),
      quickLinks: (d.quickLinks || []).map(l => l.folder === name ? { ...l, folder: null } : l)
    }))
  }, [updateLocal])

  return {
    // Data
    data: current,
    activePage,
    activePageIndex,
    pages: current.pages,
    templates: current.templates,
    navDock: current.navDock,
    navPosition: current.navPosition,
    navExpanded: current.navExpanded,
    layouts: activePage.layouts,
    widgets: activePage.widgets,

    // State
    isLoading,
    isSaving: saveMutation.isPending,
    loadingProgress,

    // Page ops
    setActivePage, addPage, removePage, renamePage,

    // Layout/widget ops
    updateLayout, updateWidgetConfig, addWidget, removeWidget, resetToDefault,

    // Nav
    setNavDock, setNavPosition, setNavExpanded,

    // Templates
    saveAsTemplate, updateTemplate, loadTemplate, loadPresetTemplate, applyLayoutPreset, deleteTemplate, renameTemplate, addRecentColor,

    // Quick Links
    quickLinks: current.quickLinks || [],
    addQuickLink, removeQuickLink, updateQuickLink, reorderQuickLinks,

    // Folders
    folders: current.folders || [],
    addFolder, renameFolder, removeFolder,

    // Wallet
    globalWallet: current.globalWallet || '',
    setGlobalWallet, setPageDefaultWallet,
  }
}
