/**
 * ParamStore — live runtime store for parameter values.
 * adapted from vibeStudio's core/param-store.ts.
 *
 * lifecycle:
 *   - SDK primitive calls register(name, default, meta) on mount
 *   - host (editor) calls setValue(name, v) when slider is dragged
 *   - SDK components subscribe via useStore to re-render with new value
 *   - on save, flush() returns the snapshot serialized into state.json
 *   - on load, hydrate(values) applies state.json values before first render
 */

import { createStore, type StoreApi } from 'zustand/vanilla'
import type { ParamValue, ParamConstraints } from './protocol.ts'

export type ParamMeta = ParamConstraints & {
  type?: ParamValue['type']
}

export type ParamStoreState = {
  values: Record<string, ParamValue>
  metadata: Record<string, ParamMeta>
}

export type ParamStoreActions = {
  register(name: string, defaultValue: ParamValue, meta?: ParamMeta): void
  unregister(name: string): void
  setValue(name: string, value: ParamValue): void
  getValue(name: string): ParamValue | undefined
  getSnapshot(): Record<string, ParamValue>
  restoreSnapshot(snapshot: Record<string, ParamValue>): void
  hydrate(values: Record<string, ParamValue>): void
  flush(): Record<string, ParamValue>
}

export type ParamStore = StoreApi<ParamStoreState & ParamStoreActions>

function clampNumber(value: number, meta: ParamMeta): number {
  let v = value
  if (meta.min != null) v = Math.max(meta.min, v)
  if (meta.max != null) v = Math.min(meta.max, v)
  if (meta.step != null && meta.step > 0) v = Math.round(v / meta.step) * meta.step
  return v
}

function applyConstraints(value: ParamValue, meta: ParamMeta): ParamValue {
  if (value.type === 'number') return { type: 'number', value: clampNumber(value.value, meta) }
  if (value.type === 'enum') {
    if (!value.options.includes(value.value)) {
      return { type: 'enum', value: value.options[0] ?? value.value, options: value.options }
    }
  }
  return value
}

export function createParamStore(initial?: Record<string, ParamValue>): ParamStore {
  return createStore<ParamStoreState & ParamStoreActions>((set, get) => ({
    values: initial ?? {},
    metadata: {},

    register(name, defaultValue, meta) {
      set((s) => {
        if (name in s.values) {
          // already hydrated; just record metadata
          return { metadata: { ...s.metadata, [name]: meta ?? {} } }
        }
        return {
          values: { ...s.values, [name]: defaultValue },
          metadata: { ...s.metadata, [name]: meta ?? {} },
        }
      })
    },
    unregister(name) {
      set((s) => {
        const { [name]: _a, ...values } = s.values
        const { [name]: _b, ...metadata } = s.metadata
        return { values, metadata }
      })
    },
    setValue(name, value) {
      const meta = get().metadata[name] ?? {}
      const constrained = applyConstraints(value, meta)
      set((s) => ({ values: { ...s.values, [name]: constrained } }))
    },
    getValue(name) { return get().values[name] },
    getSnapshot() { return { ...get().values } },
    restoreSnapshot(snapshot) { set(() => ({ values: { ...snapshot } })) },
    hydrate(values) { set((s) => ({ values: { ...values, ...s.values } })) },
    flush() { return { ...get().values } },
  }))
}
