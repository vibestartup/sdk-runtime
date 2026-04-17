/**
 * compile() — deterministically render a studio tree to a Doc, with no browser.
 *
 * usage (node):
 *   import { compile } from '@vibestartup/sdk-runtime/compile'
 *   const doc = await compile(<MyThing />, { kind: 'part' })
 *
 * implementation: wraps children in a CollectorClient-backed StudioContext,
 * renders to static markup (discarded) to trigger the emits, then folds.
 */

import { createElement, type ReactNode } from 'react'
// react-dom/server ships types via @types/react-dom but the subpath resolution
// depends on moduleResolution. use a local declaration to keep the compile
// ambient across consumers.
// @ts-expect-error — subpath type resolution varies per consumer
import { renderToStaticMarkup } from 'react-dom/server'
import { Studio } from './primitives.ts'
import { CollectorClient } from './client.ts'
import { foldMessages, type Doc } from './doc.ts'

export type CompileOptions = {
  kind: string
  studioId?: string
}

export function compile(tree: ReactNode, opts: CompileOptions): Doc {
  const client = new CollectorClient()
  const studioId = opts.studioId ?? 'root'
  const wrapped = createElement(
    Studio,
    { kind: opts.kind, client, studioId },
    tree,
  )
  // render discarded — we only care about side-effects (message emissions)
  renderToStaticMarkup(wrapped)
  return foldMessages(client.messages)
}
