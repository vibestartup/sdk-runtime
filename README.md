# @vibestartup/sdk-runtime

protocol + transports + compile() for declarative vibestartup SDKs.

shared foundation for `@vibestartup/cad`, `@vibestartup/pcb`, `@vibestartup/ic`,
`@vibestartup/sch`, `@vibestartup/vse`, `@vibestartup/doc` and any future SDK.

```ts
import { Studio, compile } from '@vibestartup/sdk-runtime'
import { Extrude, Sketch, Circle, useNumberParam } from '@vibestartup/cad'

function Flywheel() {
  const [d] = useNumberParam('diameter', 60)
  return (
    <Studio kind="part">
      <Sketch plane="XZ"><Circle r={d/2} /></Sketch>
      <Extrude depth={8} />
    </Studio>
  )
}

const doc = compile(<Flywheel />, { kind: 'part' })
// → { kind, params, ops, refs, ... } — the canonical Doc.
```

MIT licensed. see [oss/PROMOTE.md](../PROMOTE.md) for the promotion workflow
from in-tree to standalone repo.
