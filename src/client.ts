import type { Message, HostMsg } from './protocol.ts'

/** the "wire" — whatever carries messages between sdk process and host. */
export interface Transport {
  post(msg: Message): void
  onHost(handler: (msg: HostMsg) => void): () => void
  close(): void
}

/**
 * StudioClient — the sdk-side surface.
 *
 * primitives obtain the active client via React context and call emit() to
 * push messages to the host. a single process may host multiple studios
 * (not common; useful for composition tests).
 */
export class StudioClient {
  private seq = 0
  constructor(private transport: Transport) {}

  // accept any message union member without seq; TS union-Omit loses
  // per-variant fields, so we type-erase to `unknown` and re-assert.
  emit(msg: { type: Message['type'] } & Record<string, unknown>): number {
    const s = ++this.seq
    this.transport.post({ ...msg, seq: s } as unknown as Message)
    return s
  }

  onHost(handler: (msg: HostMsg) => void) {
    return this.transport.onHost(handler)
  }

  close() {
    this.transport.close()
  }
}

/**
 * CollectorClient — in-process sink that buffers all messages.
 * used by compile() for deterministic node-side codegen.
 */
export class CollectorClient extends StudioClient {
  readonly messages: Message[] = []

  constructor() {
    const buf: Message[] = []
    super({
      post: (m) => buf.push(m),
      onHost: () => () => {},
      close: () => {},
    })
    this.messages = buf
  }
}
