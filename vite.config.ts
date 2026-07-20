import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const base = process.env.GITHUB_PAGES ? "/sheva-sites-dossiers/" : "/";
  return {
  base,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "safety-app-icon.svg",
        "apple-touch-icon.png",
      ],
      manifest: {
        id: `${base}safety`,
        name: "סול בטיחות — דוחות ביקורת",
        short_name: "סול בטיחות",
        description: "הכנת דוחות ביקורת בטיחות באתרי עבודה ובנייה",
        lang: "he",
        dir: "rtl",
        start_url: `${base}safety`,
        scope: base,
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#f8fafc",
        theme_color: "#0f2744",
        categories: ["business", "productivity", "utilities"],
        icons: [
          {
            src: `${base}pwa-192.png`,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: `${base}pwa-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `${base}pwa-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,txt}"],
        // Trade-risk PDF catalog increases the main bundle above the 2 MiB default.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
