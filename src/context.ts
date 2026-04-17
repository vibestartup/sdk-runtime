import { createContext, useContext, useId } from 'react'
import type { StudioClient } from './client.ts'
import type { StudioId, NodeId } from './protocol.ts'

export type StudioContextValue = {
  client: StudioClient
  studioId: StudioId
  parentId: NodeId | null
  orderIdx: number
}

export const StudioContext = createContext<StudioContextValue | null>(null)

export function useStudioContext(): StudioContextValue {
  const v = useContext(StudioContext)
  if (!v) throw new Error('useStudioContext must be used inside <Studio>')
  return v
}

/** stable per-mount id scoped to a studio */
export function useNodeId(): NodeId {
  const id = useId()
  return id.replace(/[^a-zA-Z0-9_-]/g, '_')
}
