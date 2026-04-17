import { describe, it, expect } from 'vitest'
import { foldMessages, serializeDoc, deserializeDoc } from './doc.ts'
import type { Message } from './protocol.ts'

describe('Doc fold', () => {
  it('folds a minimal register/op stream', () => {
    const msgs: Message[] = [
      { type: 'register', studioId: 'root', kind: 'part', seq: 1 },
      { type: 'op', studioId: 'root', nodeId: 'n1', parentId: null, opType: 'sketch', props: { plane: 'XZ' }, orderIdx: 0, seq: 2 },
      { type: 'op', studioId: 'root', nodeId: 'n2', parentId: 'n1', opType: 'circle', props: { r: 5 }, orderIdx: 0, seq: 3 },
      { type: 'end', studioId: 'root', seq: 4 },
    ]
    const doc = foldMessages(msgs)
    expect(doc.kind).toBe('part')
    expect(doc.rootIds).toEqual(['n1'])
    expect(doc.ops.get('n1')?.children).toEqual(['n2'])
  })

  it('serialize roundtrip', () => {
    const msgs: Message[] = [
      { type: 'register', studioId: 'root', kind: 'part', seq: 1 },
      { type: 'param', studioId: 'root', nodeId: 'p1', name: 'r', default: { type: 'number', value: 5 }, seq: 2 },
      { type: 'op', studioId: 'root', nodeId: 'n1', parentId: null, opType: 'extrude', props: { depth: 3 }, orderIdx: 0, seq: 3 },
    ]
    const doc = foldMessages(msgs)
    const json = serializeDoc(doc)
    const back = deserializeDoc(JSON.parse(JSON.stringify(json)))
    expect(back.kind).toBe('part')
    expect(back.params).toHaveLength(1)
    expect(back.ops.size).toBe(1)
  })
})
