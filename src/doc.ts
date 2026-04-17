/**
 * Doc — the host-side, canonical representation of a Thing after execution.
 * built by folding the Message stream.
 */

import type { Message, ParamValue, RefTargetWire, StudioId, NodeId } from './protocol.ts'

export type OpNode = {
  id: NodeId
  parentId: NodeId | null
  type: string
  props: Record<string, unknown>
  orderIdx: number
  children: NodeId[]
}

export type ParamDecl = {
  nodeId: NodeId
  name: string
  default: ParamValue
  constraints?: Record<string, unknown>
}

export type DocRef = {
  nodeId: NodeId
  refId: string
  target: RefTargetWire
  role?: string
}

export type GeomAttachment = {
  nodeId: NodeId
  format: string
  blobId?: string
  meta?: Record<string, unknown>
}

export type Doc = {
  studioId: StudioId
  kind: string
  params: ParamDecl[]
  ops: Map<NodeId, OpNode>
  rootIds: NodeId[]
  refs: DocRef[]
  geom: GeomAttachment[]
  thumbDataUrl?: string
  errors: { nodeId?: NodeId; message: string }[]
}

export function emptyDoc(kind = 'unknown'): Doc {
  return {
    studioId: '',
    kind,
    params: [],
    ops: new Map(),
    rootIds: [],
    refs: [],
    geom: [],
    errors: [],
  }
}

/** fold a stream of messages into a Doc (idempotent; latest-wins per nodeId). */
export function foldMessages(messages: Iterable<Message>): Doc {
  const doc = emptyDoc()
  const orderPerParent = new Map<string, NodeId[]>() // parentId or '' → ordered children
  for (const m of messages) {
    switch (m.type) {
      case 'register':
        doc.studioId = m.studioId
        doc.kind = m.kind
        break
      case 'param':
        doc.params.push({ nodeId: m.nodeId, name: m.name, default: m.default, constraints: m.constraints })
        break
      case 'op': {
        const existing = doc.ops.get(m.nodeId)
        if (existing && existing.parentId) {
          const arr = orderPerParent.get(existing.parentId) ?? []
          const idx = arr.indexOf(m.nodeId)
          if (idx >= 0) arr.splice(idx, 1)
        }
        const node: OpNode = {
          id: m.nodeId,
          parentId: m.parentId,
          type: m.opType,
          props: m.props,
          orderIdx: m.orderIdx,
          children: existing?.children ?? [],
        }
        doc.ops.set(m.nodeId, node)
        const key = m.parentId ?? ''
        const arr = orderPerParent.get(key) ?? []
        arr.push(m.nodeId)
        orderPerParent.set(key, arr)
        if (m.parentId) {
          const parent = doc.ops.get(m.parentId)
          if (parent && !parent.children.includes(m.nodeId)) parent.children.push(m.nodeId)
        }
        break
      }
      case 'ref':
        doc.refs.push({ nodeId: m.nodeId, refId: m.refId, target: m.target, role: m.role })
        break
      case 'geom':
        doc.geom.push({ nodeId: m.nodeId, format: m.format, blobId: m.blobId, meta: m.meta })
        break
      case 'thumb':
        doc.thumbDataUrl = m.dataUrl
        break
      case 'unmount':
        doc.ops.delete(m.nodeId)
        break
      case 'error':
        doc.errors.push({ nodeId: m.nodeId, message: m.message })
        break
      case 'end':
        // end-of-run marker; no state change
        break
    }
  }
  // finalize: compute rootIds as op nodes with parentId === null, ordered by orderIdx
  const roots = Array.from(doc.ops.values())
    .filter((n) => n.parentId === null)
    .sort((a, b) => a.orderIdx - b.orderIdx)
  doc.rootIds = roots.map((n) => n.id)
  // children sorted by orderIdx
  for (const n of doc.ops.values()) {
    n.children.sort((a, b) => (doc.ops.get(a)?.orderIdx ?? 0) - (doc.ops.get(b)?.orderIdx ?? 0))
  }
  return doc
}

/** JSON-serializable snapshot, written to state.json. */
export function serializeDoc(doc: Doc) {
  return {
    _version: 1,
    studioId: doc.studioId,
    kind: doc.kind,
    params: doc.params,
    ops: Array.from(doc.ops.values()),
    rootIds: doc.rootIds,
    refs: doc.refs,
    geom: doc.geom,
    thumbDataUrl: doc.thumbDataUrl,
    errors: doc.errors,
  }
}

export function deserializeDoc(json: unknown): Doc {
  const j = json as ReturnType<typeof serializeDoc>
  if (!j || j._version !== 1) throw new Error(`unsupported doc version: ${(j as { _version?: number })?._version}`)
  const ops = new Map<NodeId, OpNode>()
  for (const n of j.ops) ops.set(n.id, { ...n, children: n.children ?? [] })
  return {
    studioId: j.studioId,
    kind: j.kind,
    params: j.params,
    ops,
    rootIds: j.rootIds,
    refs: j.refs,
    geom: j.geom,
    thumbDataUrl: j.thumbDataUrl,
    errors: j.errors,
  }
}
