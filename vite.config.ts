import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import { defineConfig, type PreviewServer, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

const localPaymentQrPath = fileURLToPath(new URL('./local-preview-assets/company-payment-qr.png', import.meta.url))

function localPaymentQrMiddleware(server: ViteDevServer | PreviewServer) {
  server.middlewares.use((request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const hostname = (request.headers.host ?? '').replace(/^\[/, '').replace(/\].*$/, '').split(':')[0]
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
    if (request.url !== '/kuakua-ai/__local/company-payment-qr.png') return next()
    if (!isLocalHost) {
      response.statusCode = 404
      response.end()
      return
    }
    response.setHeader('Content-Type', 'image/png')
    response.setHeader('Cache-Control', 'no-store')
    response.end(readFileSync(localPaymentQrPath))
  })
}

export default defineConfig({
  base: '/kuakua-ai/',
  build: { emptyOutDir: true },
  plugins: [
    react(),
    {
      name: 'kuakua-local-payment-qr',
      configureServer: localPaymentQrMiddleware,
      configurePreviewServer: localPaymentQrMiddleware,
    },
  ],
})
