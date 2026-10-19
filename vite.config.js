import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

// The offline build (VITE_API_BASE_URL=same-origin, served by the event box) is its own app on the phone's home
// screen: "Spark Offline", with its own icon. Everything below only touches that build's index.html; the normal
// build is unchanged.
const isBoxBuild = process.env.VITE_API_BASE_URL === 'same-origin'
const offlineIdentity = () => ({
  name: 'spark-offline-identity',
  transformIndexHtml(html) {
    if (!isBoxBuild) return html
    return html
      .replace('<title>SPARK</title>', '<title>Spark Offline</title>\n    <link rel="manifest" href="/offline-manifest.webmanifest" />')
      .replace('href="/apple-touch-icon.png"', 'href="/offline-apple-touch-icon.png"')
      .replace('content="Spark" />', 'content="Spark Offline" />')
  },
})

// MapLibre GL 6 runs its map engine in a module worker made of two files that must sit side by side at a fixed address (a bundler would
// rename and separate them). They are published as /maplibre/*.mjs, same origin, and Live.jsx points MapLibre at them (setWorkerUrl).
// Not needed by the event box build, which has no map.
const MAPLIBRE_FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']
const maplibreWorker = () => {
  const dist = () => path.join(path.dirname(createRequire(import.meta.url).resolve('maplibre-gl/package.json')), 'dist')
  return {
    name: 'spark-maplibre-worker',
    configureServer(server) { // dev: served straight from node_modules
      server.middlewares.use('/maplibre', (req, res, next) => {
        const name = path.basename((req.url || '').split('?')[0])
        if (!MAPLIBRE_FILES.includes(name)) return next()
        res.setHeader('Content-Type', 'text/javascript'); res.end(readFileSync(path.join(dist(), name)))
      })
    },
    generateBundle() { // build: emitted next to the app
      if (isBoxBuild) return
      for (const name of MAPLIBRE_FILES) this.emitFile({ type: 'asset', fileName: `maplibre/${name}`, source: readFileSync(path.join(dist(), name)) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), offlineIdentity(), maplibreWorker()],
})
