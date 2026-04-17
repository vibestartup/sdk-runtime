import type { Transport } from '../client.ts'
import type { Message, HostMsg } from '../protocol.ts'

/**
 * worker-side transport: the sdk code runs inside a web worker; the host is the
 * main thread. messages go through postMessage; structured clone handles them.
 */
export function workerTransport(): Transport {
  const hostHandlers = new Set<(m: HostMsg) => void>()
  // DedicatedWorkerGlobalScope `self`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scope: { postMessage: (m: unknown) => void; addEventListener: (ev: string, h: (e: MessageEvent) => void) => void; removeEventListener: (ev: string, h: (e: MessageEvent) => void) => void } = (globalThis as any).self
  const listener = (e: MessageEvent) => {
    const msg = e.data as HostMsg
    if (msg && typeof msg === 'object' && 'type' in msg) {
      hostHandlers.forEach((h) => h(msg))
    }
  }
  scope.addEventListener('message', listener)
  return {
    post: (m: Message) => scope.postMessage(m),
    onHost: (h) => { hostHandlers.add(h); return () => hostHandlers.delete(h) },
    close: () => { hostHandlers.clear(); scope.removeEventListener('message', listener) },
  }
}
