import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// adresse publique du site, pour les balises de partage, l'adresse canonique et le plan du site :
// SITE_URL si on la fournit, sinon l'adresse principale que Netlify donne à la construction (URL),
// qui devient le nom de domaine dès qu'il est branché
const SITE = (process.env.SITE_URL || process.env.URL || 'http://localhost:4173').replace(/\/$/, '');
// pages à référencer (la 404 n'en fait pas partie)
const PAGES = ['/', '/mentions-legales'];

// polices préchargées : les jeux latins des deux familles, demandés dès la lecture de la page
const FONTS = [/archivo-latin-wdth-normal-.*\.woff2$/, /newsreader-latin-opsz-normal-.*\.woff2$/, /newsreader-latin-opsz-italic-.*\.woff2$/];

function seo() {
  return {
    name: 'ridoux-seo',
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle }) {
        html = html.replaceAll('%SITE_URL%', SITE);
        if (!bundle) return html;
        const files = Object.keys(bundle).filter((f) => FONTS.some((re) => re.test(f)));
        const links = files.map((f) => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin />`).join('\n    ');
        return links ? html.replace('</title>', `</title>\n    ${links}`) : html;
      },
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
      });
      const day = new Date().toISOString().slice(0, 10);
      const urls = PAGES.map((p) => `  <url>\n    <loc>${SITE}${p}</loc>\n    <lastmod>${day}</lastmod>\n  </url>`).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
  };
}

const page = (name) => fileURLToPath(new URL(name, import.meta.url));

export default defineConfig({
  server: { port: 5173, watch: { ignored: ['**/Photos/**'] } },
  plugins: [seo()],
  build: {
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: page('index.html'),
        mentions: page('mentions-legales.html'),
        introuvable: page('404.html'),
      },
    },
  },
});
