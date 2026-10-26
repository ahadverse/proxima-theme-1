import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDemo = loadEnv(mode, import.meta.dirname, 'VITE_').VITE_DEMO_MODE === 'true'
  const src = path.resolve(import.meta.dirname, './src')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        // A normal build has none of the demo's UI or transport: src/demo/normalBuild.tsx stands in for them (see that file).
        // Only the demo build (VITE_DEMO_MODE=true) gets the real modules. Before '@', which would match first.
        ...(isDemo
          ? []
          : ['adapter', 'DemoGate', 'DemoBar', 'DemoLogins'].map((name) => ({
              find: `@/demo/${name}`,
              replacement: path.join(src, 'demo', 'normalBuild.tsx'),
            }))),
        { find: '@', replacement: src },
      ],
    },
    server: {
      port: 5173,
    },
  }
})
