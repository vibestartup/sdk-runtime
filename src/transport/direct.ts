import type { Transport } from '../client.ts'
import type { Message, HostMsg } from '../protocol.ts'

/** same-thread transport: used in dev and in compile(). messages hit the sink synchronously. */
export function directTransport(opts: {
  onMessage: (m: Message) => void
}): Transport & { emitHost: (m: HostMsg) => void } {
  const hostHandlers = new Set<(m: HostMsg) => void>()
  return {
    post: (m) => opts.onMessage(m),
    onHost: (h) => { hostHandlers.add(h); return () => hostHandlers.delete(h) },
    close: () => hostHandlers.clear(),
    emitHost: (m) => hostHandlers.forEach((h) => h(m)),
  }
}
