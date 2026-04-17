import { useCallback, useEffect } from 'react'
import { useStore } from 'zustand'
import { useStudioScope } from './scope.ts'
import type { ParamValue } from './protocol.ts'
import type { ParamMeta } from './param-store.ts'

function toParamValue(v: unknown): ParamValue {
  if (typeof v === 'number') return { type: 'number', value: v }
  if (typeof v === 'string') return { type: 'string', value: v }
  if (typeof v === 'boolean') return { type: 'boolean', value: v }
  if (Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number')) return { type: 'vec2', value: v as [number, number] }
  if (Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number')) return { type: 'vec3', value: v as [number, number, number] }
  throw new Error('useParam: unsupported default type')
}

function fromParamValue(v: ParamValue | undefined): unknown {
  if (!v) return undefined
  return v.value
}

/** generic useParam — returns [value, setter]. */
export function useParam<T>(
  name: string,
  defaultValue: T,
  meta?: ParamMeta,
): [T, (v: T) => void] {
  const { client, paramStore, undoManager, studioId } = useStudioScope()
  const defPV = toParamValue(defaultValue)

  useEffect(() => {
    paramStore.getState().register(name, defPV, meta)
    client.emit({
      type: 'param',
      studioId,
      nodeId: `param:${name}`,
      name,
      default: defPV,
      constraints: meta,
    })
    return () => paramStore.getState().unregister(name)
  }, [paramStore, client, studioId, name, JSON.stringify(defPV), JSON.stringify(meta)])

  const value = useStore(paramStore, (s) => (s.values[name] ?? defPV)) as ParamValue
  const typedValue = fromParamValue(value) as T

  const setter = useCallback((next: T) => {
    undoManager.pushIfNeeded(paramStore.getState().getSnapshot(), `set ${name}`)
    paramStore.getState().setValue(name, toParamValue(next))
  }, [paramStore, undoManager, name])

  return [typedValue, setter]
}

export function useNumberParam(name: string, def: number, meta?: ParamMeta) {
  return useParam<number>(name, def, { ...meta, type: 'number' })
}
export function useStringParam(name: string, def: string, meta?: ParamMeta) {
  return useParam<string>(name, def, { ...meta, type: 'string' })
}
export function useBooleanParam(name: string, def: boolean, meta?: ParamMeta) {
  return useParam<boolean>(name, def, { ...meta, type: 'boolean' })
}
export function useVec3Param(name: string, def: [number, number, number], meta?: ParamMeta) {
  return useParam<[number, number, number]>(name, def, { ...meta, type: 'vec3' })
}
