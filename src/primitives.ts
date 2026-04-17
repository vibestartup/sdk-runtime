/**
 * primitive SDK components — the universal ones every SDK builds on.
 *
 * design: every primitive is a plain React function component that
 *   - reads StudioScope (client + param store + undo)
 *   - emits the appropriate Message(s) on render
 *   - renders its children with an updated parent node id
 */

import { createElement, Children, useEffect, useMemo, useId, type ReactNode } from 'react'
import { StudioScopeContext, useStudioScope, type StudioScope } from './scope.ts'
import { StudioContext, useStudioContext, useNodeId } from './context.ts'
import type { StudioClient } from './client.ts'
import type { ParamStore } from './param-store.ts'
import type { UndoManager } from './undo.ts'
import type { ParamValue, RefTargetWire } from './protocol.ts'

export type StudioProps = {
  kind: string
  client?: StudioClient
  paramStore?: ParamStore
  undoManager?: UndoManager
  studioId?: string
  children?: ReactNode
}

/**
 * root boundary for any Thing. every `main.tsx` returns exactly one <Studio>.
 * the host injects `client`, `paramStore`, and `undoManager`. during compile()
 * these are injected synthetically.
 */
export function Studio({ kind, client, paramStore, undoManager, studioId, children }: StudioProps) {
  if (!client || !paramStore || !undoManager) {
    throw new Error('Studio: missing runtime deps (client/paramStore/undoManager) — host must provide')
  }
  const sid = studioId ?? 'root'
  const scope: StudioScope = useMemo(() => ({
    client, paramStore, undoManager, studioId: sid, kind,
  }), [client, paramStore, undoManager, sid, kind])

  // register once
  useEffect(() => {
    client.emit({ type: 'register', studioId: sid, kind })
    return () => { client.emit({ type: 'end', studioId: sid }) }
  }, [client, sid, kind])

  const ctx = { client, studioId: sid, parentId: null as string | null, orderIdx: 0 }
  return createElement(
    StudioScopeContext.Provider,
    { value: scope },
    createElement(
      StudioContext.Provider,
      { value: ctx },
      createElement(OrderedChildren, null, children),
    ),
  )
}

/** distributes child orderIdx automatically. */
function OrderedChildren({ children }: { children?: ReactNode }) {
  const parent = useStudioContext()
  const arr = Children.toArray(children)
  return createElement(
    StudioContext.Provider,
    { value: parent },
    arr.map((child, i) =>
      createElement(
        StudioContext.Provider,
        { value: { ...parent, orderIdx: i }, key: i },
        child,
      ),
    ),
  )
}

export type OpProps = {
  type: string
  props?: Record<string, unknown>
  children?: ReactNode
}

/** low-level escape hatch — every higher-level primitive is sugar for Op. */
export function Op({ type, props = {}, children }: OpProps) {
  const ctx = useStudioContext()
  const nodeId = useNodeId()
  // emit on every render — host dedupes by (studioId, nodeId). the useMemo guards
  // re-emit when args don't change.
  useMemo(() => {
    ctx.client.emit({
      type: 'op',
      studioId: ctx.studioId,
      nodeId,
      parentId: ctx.parentId,
      opType: type,
      props,
      orderIdx: ctx.orderIdx,
    })
  }, [ctx.client, ctx.studioId, nodeId, ctx.parentId, type, stableKey(props), ctx.orderIdx])

  // unmount hook
  useEffect(() => () => {
    ctx.client.emit({ type: 'unmount', studioId: ctx.studioId, nodeId })
  }, [ctx.client, ctx.studioId, nodeId])

  const childCtx = { ...ctx, parentId: nodeId, orderIdx: 0 }
  return createElement(
    StudioContext.Provider,
    { value: childCtx },
    createElement(OrderedChildren, null, children),
  )
}

function stableKey(p: Record<string, unknown>): string {
  const keys = Object.keys(p).sort()
  return keys.map((k) => `${k}=${JSON.stringify(p[k])}`).join('|')
}

export type RefProps = {
  id: string
  target: RefTargetWire
  role?: string
}

export function Ref({ id, target, role }: RefProps) {
  const ctx = useStudioContext()
  const nodeId = useNodeId()
  useMemo(() => {
    ctx.client.emit({
      type: 'ref',
      studioId: ctx.studioId,
      nodeId,
      refId: id,
      target,
      role,
    })
  }, [ctx.client, ctx.studioId, nodeId, id, JSON.stringify(target), role])
  return null
}

export type LinkProps = {
  ref: string
  at?: [number, number, number]
  rot?: [number, number, number]
  scale?: number
  children?: ReactNode
}
export function Link({ ref: refId, at, rot, scale, children }: LinkProps) {
  return createElement(Op, { type: 'link', props: { refId, at, rot, scale } }, children)
}

export type ImportProps = { from: string; at?: [number, number, number]; children?: ReactNode }
export function Import({ from, at, children }: ImportProps) {
  const ctx = useStudioContext()
  const idBase = useId().replace(/[^a-zA-Z0-9_-]/g, '_')
  const refNodeId = `${idBase}_ref`
  const opNodeId = `${idBase}_op`
  useMemo(() => {
    ctx.client.emit({
      type: 'ref',
      studioId: ctx.studioId,
      nodeId: refNodeId,
      refId: `import:${from}`,
      target: { kind: 'bundled', path: from },
    })
    ctx.client.emit({
      type: 'op',
      studioId: ctx.studioId,
      nodeId: opNodeId,
      parentId: ctx.parentId,
      opType: 'import',
      props: { from, at },
      orderIdx: ctx.orderIdx,
    })
  }, [ctx.client, ctx.studioId, refNodeId, opNodeId, ctx.parentId, from, JSON.stringify(at), ctx.orderIdx])
  const childCtx = { ...ctx, parentId: opNodeId, orderIdx: 0 }
  return createElement(StudioContext.Provider, { value: childCtx }, children ?? null)
}

export type CodeProps = { ref: string; role?: string }
export function Code({ ref: refId, role = 'code' }: CodeProps) {
  return createElement(Op, { type: 'code', props: { refId, role } })
}

/** the Param primitive — declarative alternative to the useParam hook. */
export type ParamProps = {
  name: string
  default: ParamValue
  min?: number
  max?: number
  step?: number
  unit?: string
  description?: string
}

export function Param({ name, default: def, ...constraints }: ParamProps) {
  const { client, paramStore, studioId } = useStudioScope()
  const nodeId = useNodeId()
  useEffect(() => {
    paramStore.getState().register(name, def, constraints)
    client.emit({
      type: 'param',
      studioId,
      nodeId,
      name,
      default: def,
      constraints,
    })
    return () => paramStore.getState().unregister(name)
  }, [paramStore, client, studioId, nodeId, name, JSON.stringify(def), JSON.stringify(constraints)])
  return null
}

// re-export the hook-based API
export { useParam, useNumberParam, useStringParam, useBooleanParam, useVec3Param } from './hooks.ts'
