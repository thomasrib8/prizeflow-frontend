import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), offlineIdentity()],
})
