import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const require = createRequire(import.meta.url);

/**
 * Dev only: phones choke on the dev server because barrel imports make it ship whole libraries
 * (all ~4,300 lucide icons were 5 MB, every radix primitive 2 MB). This rewrites
 *   import { Ghost, X as Y } from 'lucide-react'  →  one import per icon file
 *   import { Dialog as D } from 'radix-ui'         →  import * as D from '@radix-ui/react-dialog'
 * Production builds tree-shake on their own, so the plugin is skipped there.
 */
function slimBarrels(): Plugin {
  const lucideIndex = path.join(path.dirname(require.resolve('lucide-react')), '../esm/lucide-react.mjs');
  const iconFile = new Map<string, string>();
  for (const m of fs.readFileSync(lucideIndex, 'utf8').matchAll(/export \{([^}]*)\} from '\.\/icons\/([^']+)';/g)) {
    for (const spec of m[1].split(',')) {
      const name = spec.trim().replace(/^default as /, '');
      if (name) iconFile.set(name, `lucide-react/dist/esm/icons/${m[2]}`);
    }
  }
  const kebab = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const importRe = /import\s*\{([^}]*)\}\s*from\s*['"](lucide-react|radix-ui)['"];?/g;

  return {
    name: 'relai-slim-barrels',
    apply: 'serve',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('node_modules') || !/\.[jt]sx?$/.test(id.split('?')[0])) return null;
      if (!code.includes('lucide-react') && !code.includes('radix-ui')) return null;
      return code.replace(importRe, (whole, specs: string, pkg: string) => {
        const out: string[] = [];
        const kept: string[] = [];
        for (const raw of specs.split(',').map((s) => s.trim()).filter(Boolean)) {
          if (raw.startsWith('type ')) continue; // erased by TypeScript anyway
          const [name, local = name] = raw.split(/\s+as\s+/).map((s) => s.trim());
          if (pkg === 'lucide-react' && iconFile.has(name)) out.push(`import ${local} from '${iconFile.get(name)}';`);
          else if (pkg === 'radix-ui') out.push(`import * as ${local} from '@radix-ui/react-${kebab(name)}';`);
          else kept.push(raw);
        }
        if (kept.length) out.push(`import { ${kept.join(', ')} } from '${pkg}';`);
        return out.length ? out.join('\n') : whole;
      });
    },
  };
}

export default defineConfig({
  // PWA manifest and service worker are static files in public/ (SRS §7.4: the worker never caches).
  plugins: [slimBarrels(), react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // The barrels are never imported at runtime in dev (see slimBarrels), so don't pre-bundle them whole.
  optimizeDeps: { exclude: ['lucide-react', 'radix-ui'] },
  server: {
    host: true,
    port: 5173,
    // 127.0.0.1, not localhost: the API listens on IPv4 only and Windows resolves localhost to ::1 first.
    proxy: { '/api': process.env.API_PROXY ?? 'http://127.0.0.1:3001' },
  },
  // Phones over LAN: `npm run mobile` serves the minified build here (inherits host + proxy from `server`).
  preview: { port: 4173 },
});
