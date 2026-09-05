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

async function fetchPublishedBlogSlugs() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zmgdbiveaniwzkzefywm.supabase.co'
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_YBSutdmMEcSVsu0_f7Uvdg_SMKR_Weh'
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/blog_posts?select=slug,published_at&published=eq.true&order=published_at.desc`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })
    if (!response.ok) return []
    const rows = await response.json()
    return Array.isArray(rows)
      ? rows.map(row => ({ slug: String(row.slug || '').trim(), published_at: row.published_at })).filter(row => /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(row.slug))
      : []
  } catch (error) {
    console.warn('TRACKEN SEO routing: could not fetch published blog slugs during build.', error?.message || error)
    return []
  }
}

function escapeXml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function generateSeoRouteEntries() {
  return {
    name: 'tracken-seo-route-entries',
    async closeBundle() {
      const distDir = path.resolve('dist')
      const indexFile = path.join(distDir, 'index.html')

      if (!fs.existsSync(indexFile)) {
        throw new Error('TRACKEN SEO routing: dist/index.html was not generated.')
      }

      const indexHtml = fs.readFileSync(indexFile, 'utf8')
      const staticRoutes = [...SEO_ROUTES]
      for (const route of staticRoutes) {
        const routeDir = path.join(distDir, route)
        fs.mkdirSync(routeDir, { recursive: true })
        fs.writeFileSync(path.join(routeDir, 'index.html'), indexHtml)
      }

      const posts = await fetchPublishedBlogSlugs()
      for (const post of posts) {
        const routeDir = path.join(distDir, 'blog', post.slug)
        fs.mkdirSync(routeDir, { recursive: true })
        const canonical = `https://tracken.in/blog/${encodeURIComponent(post.slug)}/`
        const routeHtml = indexHtml
          .replace(/<title>[^<]*<\/title>/i, '<title>TRACKEN Blog — Article</title>')
          .replace(/<link rel="canonical" href="[^"]*"\s*\/>/i, `<link rel="canonical" href="${canonical}" />`)
          .replace(/<meta property="og:url" content="[^"]*"\s*\/>/i, `<meta property="og:url" content="${canonical}" />`)
        fs.writeFileSync(path.join(routeDir, 'index.html'), routeHtml)
      }

      const sitemapPath = path.join(distDir, 'sitemap.xml')
      const staticSitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://tracken.in/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n  <url><loc>https://tracken.in/blog/</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n  <url><loc>https://tracken.in/contact/</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n  <url><loc>https://tracken.in/about/</loc><changefreq>yearly</changefreq><priority>0.4</priority></url>\n  <url><loc>https://tracken.in/privacy-policy/</loc><changefreq>yearly</changefreq><priority>0.2</priority></url>\n  <url><loc>https://tracken.in/terms-and-conditions/</loc><changefreq>yearly</changefreq><priority>0.2</priority></url>\n  <url><loc>https://tracken.in/cookie-policy/</loc><changefreq>yearly</changefreq><priority>0.2</priority></url>\n  <url><loc>https://tracken.in/disclaimer/</loc><changefreq>yearly</changefreq><priority>0.2</priority></url>\n  <url><loc>https://tracken.in/advertising/</loc><changefreq>yearly</changefreq><priority>0.2</priority></url>\n${posts.map(post => `  <url><loc>https://tracken.in/blog/${escapeXml(post.slug)}/</loc><changefreq>monthly</changefreq><priority>0.7</priority>${post.published_at ? `<lastmod>${escapeXml(new Date(post.published_at).toISOString())}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`
      fs.writeFileSync(sitemapPath, staticSitemap)
    },
  }
}

export default defineConfig({
  plugins: [react(), generateSeoRouteEntries()],
  base: '/',
})
