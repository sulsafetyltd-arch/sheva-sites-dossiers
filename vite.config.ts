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
        "favicon-32.png",
        "favicon-48.png",
        "safety-app-icon.svg",
        "apple-touch-icon.png",
        "pwa-192.png",
        "pwa-512.png",
        "safety-apple-touch-icon.png",
        "safety-pwa-192.png",
        "safety-pwa-512.png",
        "safety-favicon-32.png",
        "safety-favicon-48.png",
        "dossiers-apple-touch-icon.png",
        "dossiers-pwa-192.png",
        "dossiers-pwa-512.png",
        "dossiers-favicon-32.png",
        "dossiers-favicon-48.png",
        "manifest-dossiers.webmanifest",
      ],
      manifest: {
        id: `${base}safety`,
        name: "סול בטיחות — דוחות מצולמים",
        short_name: "סול בטיחות",
        description: "הכנת דוחות ביקורת בטיחות עם צילום וזיהוי ליקויים באתרי עבודה, בנייה ומוסדות חינוך",
        lang: "he",
        dir: "rtl",
        start_url: `${base}safety`,
        scope: base,
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#000000",
        theme_color: "#000000",
        categories: ["business", "productivity", "utilities"],
        icons: [
          {
            // Classic paths so Safari / cached manifests still resolve SOLO after deploy
            src: `${base}pwa-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
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
          {
            src: `${base}apple-touch-icon.png`,
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        // Do NOT precache trade-risk / induction PDF `.txt` assets — they inflate
        // the SW cache past iOS limits (~11MB) and leave the PWA stuck on a stale
        // shell with missing CSS after deploy. PDFs are fetched on demand.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
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
          {
            // On-demand PDF catalog (encoded as .txt) — cache after first use only.
            urlPattern: /\/assets\/.*\.pdf-[A-Za-z0-9_-]+\.txt$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "safety-pdf-documents",
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
