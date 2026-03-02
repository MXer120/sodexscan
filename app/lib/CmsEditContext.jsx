'use client'

import { createContext, useContext, useState } from 'react'

const CmsEditContext = createContext({ editMode: false, toggleEditMode: () => {} })

export function CmsEditProvider({ children }) {
  const [editMode, setEditMode] = useState(false)
  return (
    <CmsEditContext.Provider value={{ editMode, toggleEditMode: () => setEditMode(m => !m) }}>
      {children}
    </CmsEditContext.Provider>
  )
}

export const useCmsEdit = () => useContext(CmsEditContext)
