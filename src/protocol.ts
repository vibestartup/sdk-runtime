/**
 * wire protocol between declarative SDK components (the "studio") and the host
 * (the editor / kernel executor).
 *
 * messages are structured-clone-safe (no functions, no DOM refs).
 *
 * flow:
 *   1. host spawns worker/iframe/node subprocess, imports main.tsx
 *   2. main.tsx calls render(<Studio kind=... >) → sdk-runtime mounts the tree
 *   3. each primitive, on mount/update/unmount, posts a Message via the transport
 *   4. host's StudioClient aggregates Messages into a Doc
 *   5. host diffs Doc vs previous; schedules op recompute via the kernel
 *
 * all messages carry (studioId, nodeId, seq) so the host can order and diff.
 */

import type { ThingURI } from '@vibestartup/thing'

export type StudioId = string
export type NodeId = string

/** registration: a root <Studio kind="part"> mounted */
export type MsgRegister = {
  type: 'register'
  studioId: StudioId
  kind: string
  seq: number
}

/** parameter declaration (useParam, <Param>) */
export type MsgParam = {
  type: 'param'
  studioId: StudioId
  nodeId: NodeId
  name: string
  default: ParamValue
  constraints?: ParamConstraints
  seq: number
}

/** an op-graph node emitted by an SDK primitive (Extrude, Sketch, Pad, Trace, …) */
export type MsgOp = {
  type: 'op'
  studioId: StudioId
  nodeId: NodeId
  parentId: NodeId | null
  opType: string
  props: Record<string, unknown>
  /** ordering amongst siblings — react child index */
  orderIdx: number
  seq: number
}

/** link to another thing / relpath / url / bundled asset */
export type MsgRef = {
  type: 'ref'
  studioId: StudioId
  nodeId: NodeId
  refId: string
  target: RefTargetWire
  role?: string
  seq: number
}

/** geometry / output payload (host-computed OR SDK-computed; usually host) */
export type MsgGeom = {
  type: 'geom'
  studioId: StudioId
  nodeId: NodeId
  format: 'occ-shape' | 'mesh' | 'svg' | 'raster' | 'gds' | 'gerber' | 'unknown'
  blobId?: string
  meta?: Record<string, unknown>
  seq: number
}

/** thumbnail advisory from sdk */
export type MsgThumb = {
  type: 'thumb'
  studioId: StudioId
  dataUrl?: string
  seq: number
}

/** remove a previously registered node (unmount) */
export type MsgUnmount = {
  type: 'unmount'
  studioId: StudioId
  nodeId: NodeId
  seq: number
}

/** exec error from sdk side */
export type MsgError = {
  type: 'error'
  studioId: StudioId | null
  nodeId?: NodeId
  message: string
  stack?: string
  seq: number
}

/** end of run — sdk has no more messages */
export type MsgEnd = {
  type: 'end'
  studioId: StudioId
  seq: number
}

export type Message =
  | MsgRegister
  | MsgParam
  | MsgOp
  | MsgRef
  | MsgGeom
  | MsgThumb
  | MsgUnmount
  | MsgError
  | MsgEnd

export type ParamValue =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'vec2'; value: [number, number] }
  | { type: 'vec3'; value: [number, number, number] }
  | { type: 'enum'; value: string; options: string[] }

export type ParamConstraints = {
  min?: number
  max?: number
  step?: number
  unit?: string
  description?: string
}

/** wire representation of a Ref target (serializable subset). */
export type RefTargetWire =
  | { kind: 'bundled'; path: string }
  | { kind: 'linked'; uri: ThingURI | string; mode: 'reference' | 'snapshot' }
  | { kind: 'relpath'; path: string; watch?: boolean }
  | { kind: 'url'; url: string; cache?: boolean }

/** inbound from host → sdk (param updates, refreshes, kill signals) */
export type HostMsg =
  | { type: 'paramUpdate'; studioId: StudioId; name: string; value: ParamValue }
  | { type: 'refresh'; studioId: StudioId }
  | { type: 'stop'; studioId: StudioId }
