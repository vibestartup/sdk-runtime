/**
 * UndoManager — coarse-grained snapshot stack for T0 param edits.
 *
 * SDKs call pushIfNeeded(snapshot, label) before mutating the store;
 * if the time since last push exceeds `debounceMs` the snapshot becomes a new entry,
 * otherwise it replaces the last entry's label (batching rapid slider drags).
 */

import type { ParamValue } from './protocol.ts'

export type UndoSnapshot = {
  values: Record<string, ParamValue>
  label: string
  ts: number
}

export class UndoManager {
  private stack: UndoSnapshot[] = []
  private cursor = -1
  private lastPushTs = 0

  constructor(public debounceMs = 400, public maxDepth = 200) {}

  pushIfNeeded(values: Record<string, ParamValue>, label: string) {
    const now = Date.now()
    if (now - this.lastPushTs < this.debounceMs && this.cursor >= 0) {
      this.stack[this.cursor] = { values: { ...values }, label, ts: now }
    } else {
      if (this.cursor < this.stack.length - 1) this.stack.length = this.cursor + 1
      this.stack.push({ values: { ...values }, label, ts: now })
      if (this.stack.length > this.maxDepth) this.stack.shift()
      this.cursor = this.stack.length - 1
    }
    this.lastPushTs = now
  }

  undo(): UndoSnapshot | null {
    if (this.cursor <= 0) return null
    this.cursor--
    return this.stack[this.cursor] ?? null
  }

  redo(): UndoSnapshot | null {
    if (this.cursor >= this.stack.length - 1) return null
    this.cursor++
    return this.stack[this.cursor] ?? null
  }

  peek(): UndoSnapshot | null { return this.stack[this.cursor] ?? null }
  canUndo() { return this.cursor > 0 }
  canRedo() { return this.cursor < this.stack.length - 1 }
  clear() { this.stack = []; this.cursor = -1; this.lastPushTs = 0 }
}
