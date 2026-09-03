import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const SEO_ROUTES = [
  'blog',
  'contact',
  'about',
  'privacy-policy',
  'terms-and-conditions',
  'cookie-policy',
  'disclaimer',
  'advertising',
]

function generateSeoRouteEntries() {
  return {
    name: 'tracken-seo-route-entries',
    closeBundle() {
      const distDir = path.resolve('dist')
      const indexFile = path.join(distDir, 'index.html')

      if (!fs.existsSync(indexFile)) {
        throw new Error('TRACKEN SEO routing: dist/index.html was not generated.')
      }

      const indexHtml = fs.readFileSync(indexFile, 'utf8')

      for (const route of SEO_ROUTES) {
        const routeDir = path.join(distDir, route)
        fs.mkdirSync(routeDir, { recursive: true })
        fs.writeFileSync(path.join(routeDir, 'index.html'), indexHtml)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), generateSeoRouteEntries()],
  base: '/',
})
