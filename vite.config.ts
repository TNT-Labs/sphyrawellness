import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use BASE_URL environment variable or default to '/' for Docker
  // For GitHub Pages, set BASE_URL=/sphyrawellness/
  const base = process.env.BASE_URL || process.env.VITE_BASE_PATH || '/'

  console.log(`Building with base path: ${base}`)

  return {
    base,
    // Optimize dependency pre-bundling for CommonJS modules
    optimizeDeps: {
      include: [
        // Common dependencies
        'uuid',
        'events'
      ],
      esbuildOptions: {
        // Ensure proper module resolution for mixed ESM/CommonJS dependencies
        mainFields: ['module', 'main'],
        // Support for Node.js built-ins polyfills
        platform: 'browser'
      }
    },
    // Resolve configuration to handle module resolution
    resolve: {
      alias: {
        // Polyfill Node.js built-in modules for browser
        events: 'rollup-plugin-node-polyfills/polyfills/events',
        util: 'rollup-plugin-node-polyfills/polyfills/util',
        buffer: 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
        process: 'rollup-plugin-node-polyfills/polyfills/process-es6',
      }
    },
    define: {
      // Define global for browser compatibility
      'global': 'globalThis',
      'process.env': {},
    },
    // Build configuration for production
    build: {
      // Handle CommonJS modules during production build
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
        defaultIsModuleExports: 'auto',
        requireReturnsDefault: 'auto',
      },
      // Optimize chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['lucide-react'],
            'utils': ['date-fns', 'zod']
          }
        }
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.svg', 'mask-icon.svg', 'version.json'],
        manifest: {
          name: 'Sphyra Wellness Lab - Gestione Centro Estetico',
          short_name: 'Sphyra',
          description: 'Applicazione per la gestione completa di centri estetici',
          theme_color: '#db2777',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'pwa-192x192.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'pwa-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            },
            {
              src: 'pwa-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          globIgnores: ['**/offline.html'], // Exclude offline.html from automatic caching
          navigateFallback: null, // Disable automatic offline fallback
          skipWaiting: true, // Force new service worker to activate immediately
          clientsClaim: true, // Take control of all clients immediately
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache version.json with NetworkFirst strategy to check for updates
              urlPattern: /version\.json$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'version-cache',
                expiration: {
                  maxEntries: 1,
                  maxAgeSeconds: 60 * 5 // 5 minutes
                }
              }
            }
          ],
          // Include offline page manually with explicit revision
          additionalManifestEntries: [
            { url: `${base}offline.html`, revision: null }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ],
  }
})
