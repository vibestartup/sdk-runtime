import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/primitives.ts',
    'src/compile.ts',
    'src/transport/direct.ts',
    'src/transport/worker.ts',
    'src/transport/node.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  external: ['react', 'react-dom'],
})
