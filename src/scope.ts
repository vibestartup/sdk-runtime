/**
 * StudioScope — bundles the per-studio runtime deps (client + param store + undo).
 * primitives read from here via useStudioScope().
 */

import { createContext, useContext } from 'react'
import type { StudioClient } from './client.ts'
import type { ParamStore } from './param-store.ts'
import type { UndoManager } from './undo.ts'

export type StudioScope = {
  client: StudioClient
  paramStore: ParamStore
  undoManager: UndoManager
  studioId: string
  kind: string
}

export const StudioScopeContext = createContext<StudioScope | null>(null)

export function useStudioScope(): StudioScope {
  const s = useContext(StudioScopeContext)
  if (!s) throw new Error('useStudioScope requires an enclosing <Studio>')
  return s
}
