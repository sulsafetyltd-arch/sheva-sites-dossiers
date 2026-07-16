import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import {
  exportSafetyAuditBackup,
  importSafetyAuditBackup,
  type SafetyAuditBackup,
} from '@/lib/safety-audit-store';
import { Button } from '@/components/ui/button';

interface Props {
  onImported: () => void;
}

export default function DataBackupCard({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const downloadBackup = () => {
    const backup = exportSafetyAuditBackup();
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sol-safety-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('קובץ הגיבוי הורד למכשיר');
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as SafetyAuditBackup;
      importSafetyAuditBackup(backup);
      setMessage('הגיבוי שוחזר בהצלחה');
      onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'שחזור הגיבוי נכשל');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <section className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
      <div>
        <h2 className="font-semibold">גיבוי והעברה למכשיר אחר</h2>
        <p className="text-xs text-slate-500 mt-1">
          עד לחיבור ענן מרכזי, מומלץ להוריד גיבוי בסוף כל יום.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={downloadBackup} className="gap-1">
          <Download className="w-4 h-4" /> הורד גיבוי
        </Button>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="gap-1">
          <Upload className="w-4 h-4" /> שחזר גיבוי
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void importBackup(event.target.files?.[0])}
      />
      {message && <div className="text-xs text-slate-600">{message}</div>}
    </section>
  );
}
