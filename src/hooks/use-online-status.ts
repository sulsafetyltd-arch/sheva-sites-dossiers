import { useState, useEffect, useCallback } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncs, setPendingSyncs] = useState(0);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      // Trigger sync of any pending changes
      const pending = localStorage.getItem('fire-dossiers-pending');
      if (pending) {
        const ids: string[] = JSON.parse(pending);
        if (ids.length > 0) {
          // In localStorage mode, data is already saved locally.
          // Clear pending list since there's no remote to sync to yet.
          localStorage.removeItem('fire-dossiers-pending');
          setPendingSyncs(0);
        }
      }
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const markPendingSync = useCallback((dossierId: string) => {
    const pending = JSON.parse(localStorage.getItem('fire-dossiers-pending') || '[]') as string[];
    if (!pending.includes(dossierId)) {
      pending.push(dossierId);
      localStorage.setItem('fire-dossiers-pending', JSON.stringify(pending));
      setPendingSyncs(pending.length);
    }
  }, []);

  // Load initial pending count
  useEffect(() => {
    const pending = JSON.parse(localStorage.getItem('fire-dossiers-pending') || '[]') as string[];
    setPendingSyncs(pending.length);
  }, []);

  return { isOnline, pendingSyncs, markPendingSync };
}
