import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DOSSIERS = {
  title: 'תיק שטח כיבוי אש',
  description: 'ניהול תיקי שטח לבטיחות אש',
  themeColor: '#0f2744',
  appleTitle: 'תיק שטח',
  // Dedicated dossiers assets — classic /apple-touch-icon.png & /pwa-*.png are SOLO for /safety iOS installs
  appleTouch: 'dossiers-apple-touch-icon.png',
  favicon32: 'dossiers-favicon-32.png',
  favicon48: 'dossiers-favicon-48.png',
  favicon192: 'dossiers-pwa-192.png',
  manifest: null as string | null, // VitePWA injects the safety manifest; dossiers uses static file
};

const SAFETY = {
  title: 'סול בטיחות — דוחות מצולמים',
  description: 'הכנת דוחות ביקורת בטיחות עם צילום וזיהוי ליקויים',
  themeColor: '#000000',
  appleTitle: 'סול בטיחות',
  // Prefer classic paths (also duplicated as safety-*) so iOS root fallbacks get SOLO
  appleTouch: 'apple-touch-icon.png',
  favicon32: 'favicon-32.png',
  favicon48: 'favicon-48.png',
  favicon192: 'pwa-192.png',
  manifest: null as string | null, // primary VitePWA manifest already targets /safety
};

function assetUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${file.replace(/^\//, '')}`;
}

function upsertLink(rel: string, attrs: Record<string, string>) {
  const selector = Object.entries(attrs)
    .filter(([key]) => key === 'sizes' || key === 'type' || key === 'id')
    .map(([key, value]) => `[${key}="${value}"]`)
    .join('');
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]${selector}`);
  if (!link) {
    // Prefer matching by data-brand-slot when present
    const slot = attrs['data-brand-slot'];
    if (slot) {
      link = document.head.querySelector(`link[data-brand-slot="${slot}"]`);
    }
  }
  if (!link) {
    link = document.createElement('link');
    document.head.appendChild(link);
  }
  link.setAttribute('rel', rel);
  Object.entries(attrs).forEach(([key, value]) => link!.setAttribute(key, value));
}

function applyBranding(isSafetyApp: boolean) {
  const brand = isSafetyApp ? SAFETY : DOSSIERS;
  document.title = brand.title;

  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', brand.description);

  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.setAttribute('content', brand.themeColor);

  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) appleTitle.setAttribute('content', brand.appleTitle);

  upsertLink('apple-touch-icon', {
    href: assetUrl(brand.appleTouch),
    'data-brand-slot': 'apple-touch',
  });
  upsertLink('icon', {
    type: 'image/png',
    sizes: '32x32',
    href: assetUrl(brand.favicon32),
    'data-brand-slot': 'favicon-32',
  });
  upsertLink('icon', {
    type: 'image/png',
    sizes: '48x48',
    href: assetUrl(brand.favicon48),
    'data-brand-slot': 'favicon-48',
  });
  upsertLink('icon', {
    type: 'image/png',
    sizes: '192x192',
    href: assetUrl(brand.favicon192),
    'data-brand-slot': 'favicon-192',
  });

  // Point the installable manifest at the safety app when on /safety;
  // for dossiers, swap to the dossiers manifest so home-screen install stays separate.
  const manifestHref = isSafetyApp
    ? null // keep Vite-injected safety manifest
    : assetUrl('manifest-dossiers.webmanifest');

  const manifestLinks = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]'),
  );
  if (!isSafetyApp && manifestHref) {
    if (manifestLinks.length === 0) {
      upsertLink('manifest', { href: manifestHref, 'data-brand-slot': 'manifest' });
    } else {
      manifestLinks.forEach((link) => {
        link.dataset.brandSlot = 'manifest';
        link.setAttribute('href', manifestHref);
      });
    }
  } else if (isSafetyApp) {
    // Restore Vite safety manifest if we previously overwrote it
    const injected = document.head.querySelector<HTMLLinkElement>(
      'link[rel="manifest"][href*="manifest.webmanifest"]',
    );
    if (!injected) {
      upsertLink('manifest', {
        href: assetUrl('manifest.webmanifest'),
        'data-brand-slot': 'manifest',
      });
    } else {
      injected.setAttribute('href', injected.getAttribute('href') || assetUrl('manifest.webmanifest'));
    }
  }
}

/** Switches document icons/title/manifest between dossiers (`/`) and photo reports (`/safety`). */
export default function AppBrandingSwitcher() {
  const location = useLocation();
  const isSafetyApp = location.pathname === '/safety' || location.pathname.startsWith('/safety/');

  useEffect(() => {
    applyBranding(isSafetyApp);
  }, [isSafetyApp]);

  return null;
}

export function isSafetyAppPath(pathname: string): boolean {
  return pathname === '/safety' || pathname.startsWith('/safety/');
}
