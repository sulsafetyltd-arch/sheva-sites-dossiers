/** Register the app service worker (no-op in unsupported browsers / non-secure contexts). */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Skip during Vite HMR / unit tests
  if (import.meta.env.MODE === 'test') return;

  const base = import.meta.env.BASE_URL || '/';
  const swUrl = `${base}sw.js`.replace(/\/{2,}/g, '/').replace(':/', '://');

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl, { scope: base }).catch(() => {
      // Installability is best-effort; ignore registration failures in restricted hosts
    });
  });
}
