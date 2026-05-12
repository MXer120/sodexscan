import { Suspense } from 'react'
import ToolsPage from '../components/tools/ToolsPage'

export const metadata = {
  title: 'Tools | CommunityScan SoDEX',
}

export default function ToolsRoute() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="size-6 rounded-full border-2 border-border border-t-primary animate-spin" /></div>}>
      <ToolsPage />
    </Suspense>
  )
}
