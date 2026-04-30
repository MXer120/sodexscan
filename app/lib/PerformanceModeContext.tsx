'use client'
import { createContext, useContext } from 'react'

export const PerformanceModeContext = createContext(false)
export const usePerformanceMode = () => useContext(PerformanceModeContext)
