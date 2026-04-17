/**
 * show() / open() — entry-point sugar used in main.tsx files.
 *
 *   import { show } from '@vibestartup/sdk-runtime'
 *   show(<Flywheel />, { kind: 'part' })
 *
 * behavior:
 *   - in dev CLI (vbs run / vbs preview): compile() + print structured summary
 *   - in editor sandbox: posts to window.parent with the compiled doc
 *   - in server codegen: returns the Doc for the host to persist
 */

import type { ReactElement } from 'react'
import { compile } from './compile.ts'
import { serializeDoc, type Doc } from './doc.ts'

export type ShowOptions = {
  kind: string
  tabName?: string
  focus?: boolean
}

export function show(tree: ReactElement, opts: ShowOptions): Doc {
  const doc = compile(tree, { kind: opts.kind })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = (globalThis as any).window as any
  if (w && w.parent && w.parent !== w) {
    w.parent.postMessage({
      type: 'thing:show',
      doc: serializeDoc(doc),
      tabName: opts.tabName,
      focus: opts.focus ?? true,
    }, '*')
  }

  return doc
}

/** alias: some users prefer open() */
export const open = show
