import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/extension.ts'],
    splitting: true,
    sourcemap: false,
    clean: true,
    noExternal: ["gogocode"],
    external: ["vscode"],
})
