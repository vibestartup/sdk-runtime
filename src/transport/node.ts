import type { Transport } from '../client.ts'
import type { Message, HostMsg } from '../protocol.ts'

/** node transport via worker_threads.parentPort or arbitrary IO channel. */
export function nodeTransport(channel: {
  send: (m: Message) => void
  on: (h: (m: HostMsg) => void) => () => void
  close?: () => void
}): Transport {
  const hostHandlers = new Set<(m: HostMsg) => void>()
  const off = channel.on((m) => hostHandlers.forEach((h) => h(m)))
  return {
    post: (m) => channel.send(m),
    onHost: (h) => { hostHandlers.add(h); return () => hostHandlers.delete(h) },
    close: () => { off(); hostHandlers.clear(); channel.close?.() },
  }
}
