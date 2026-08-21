import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    host: true,
    port: 4173,
    // Preview is exposed through public tunnels whose hostnames change per run.
    allowedHosts: true,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Always fetch the freshest HTML so new deploys show up immediately.
        navigateFallback: "index.html",
      },
      manifest: {
        name: "סולו נדלן — ניהול עסקאות נדל\"ן",
        short_name: "סולו נדלן",
        description: "ניהול תיקי נדל\"ן לעורכי דין: מסמכים, מועדים, תשלומים ודוחות",
        dir: "rtl",
        lang: "he",
        display: "standalone",
        start_url: "./",
        background_color: "#151f28",
        theme_color: "#151f28",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
