import { useEffect, useState } from 'react';
import { Download, RefreshCw, Share, WifiOff, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function PwaInstallCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [installed, setInstalled] = useState(isStandalone());

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
  });

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === 'accepted') setInstalled(true);
      setInstallPrompt(null);
      return;
    }
    if (isIos()) setShowIosHelp(true);
  };

  return (
    <div className="space-y-2">
      {!online && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          מצב אופליין — ניתן להמשיך לעבוד; הנתונים נשמרים במכשיר.
        </div>
      )}

      {needRefresh && (
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 flex items-center justify-between gap-3">
          <div className="text-sm text-sky-900">קיימת גרסה חדשה של האפליקציה.</div>
          <div className="flex gap-1">
            <Button size="sm" onClick={() => void updateServiceWorker(true)} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> עדכן
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setNeedRefresh(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {!installed && (installPrompt || isIos()) && (
        <div className="rounded-xl bg-[#0f2744] text-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">התקן את סול בטיחות</div>
              <div className="text-sm text-slate-300 mt-1">
                גישה מהירה ממסך הבית ועבודה גם ללא קליטה.
              </div>
            </div>
            <img src="/pwa-192.png" alt="" className="w-12 h-12 rounded-xl" />
          </div>
          <Button
            type="button"
            onClick={() => void install()}
            className="w-full mt-3 bg-[#f4c95d] hover:bg-[#e7b943] text-[#0f2744] gap-2"
          >
            <Download className="w-4 h-4" /> התקנה במסך הבית
          </Button>
        </div>
      )}

      {showIosHelp && (
        <div className="rounded-xl border-2 border-[#0f2744] bg-white p-4 text-sm relative">
          <button
            type="button"
            className="absolute left-3 top-3 text-slate-500"
            onClick={() => setShowIosHelp(false)}
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="font-semibold mb-3">התקנה באייפון</div>
          <ol className="space-y-3">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              פתח את הקישור ב־Safari.
            </li>
            <li className="flex gap-2 items-center">
              <span className="font-bold">2.</span>
              לחץ על כפתור השיתוף <Share className="w-4 h-4" />.
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              בחר „הוסף למסך הבית” ואז „הוסף”.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
