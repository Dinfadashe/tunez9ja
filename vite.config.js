import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2018',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Content hash on every filename — forces browsers to fetch fresh
        // files on every deploy while still allowing long-term caching of
        // unchanged chunks.
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',

        // Manual chunking: split heavy/rarely-changing vendor code away
        // from app code so browsers can cache it independently and so the
        // initial JS payload for any single page is smaller.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
              return 'vendor-react'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            return 'vendor'
          }
        },
      },
    },
  },
  // Pre-bundle these so the dev server (and first production load) doesn't
  // need to crawl + transform them on every cold start.
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js', 'lucide-react'],
  },
  server: {
    // Warm these modules immediately on dev server start.
    warmup: {
      clientFiles: ['./src/App.jsx', './src/pages/Home.jsx'],
    },
  },
})
