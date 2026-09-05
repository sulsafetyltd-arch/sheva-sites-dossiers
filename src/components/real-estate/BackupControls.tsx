import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import {
  downloadAppBackup,
  importAppBackupFromText,
  type ImportMode,
} from '@/lib/app-backup';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  /** Called after a successful import so the page can refresh state */
  onImported?: () => void;
  compact?: boolean;
}

export function BackupControls({ onImported, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onExport = () => {
    try {
      downloadAppBackup();
      toast.success('הורדת קובץ גיבוי הושלמה');
    } catch {
      toast.error('ייצוא הגיבוי נכשל');
    }
  };

  const runImport = async (file: File, mode: ImportMode) => {
    setBusy(true);
    try {
      const text = await file.text();
      const result = importAppBackupFromText(text, mode);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        mode === 'replace'
          ? `יובאו ${result.modules} מודולים ו־${result.deals} תיקים (החלפה)`
          : `מוזגו נתונים · ${result.modules} מודולים, ${result.deals} תיקים`,
      );
      onImported?.();
      // Soft reload so all pages pick up localStorage
      window.setTimeout(() => window.location.reload(), 400);
    } catch {
      toast.error('ייבוא הגיבוי נכשל');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onPick = (mode: ImportMode) => {
    const input = inputRef.current;
    if (!input) return;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const label =
        mode === 'replace'
          ? 'להחליף את כל ההתקדמות והתיקים שבדפדפן בקובץ הגיבוי?'
          : 'למזג את הגיבוי עם הנתונים הקיימים? (מזהים זהים יוחלפו)';
      if (!window.confirm(label)) {
        input.value = '';
        return;
      }
      void runImport(file, mode);
    };
    input.click();
  };

  return (
    <div className={compact ? 'flex flex-wrap gap-2' : 'space-y-3'}>
      {!compact && (
        <div>
          <p className="text-sm font-semibold">גיבוי מקומי</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ההתקדמות בהכשרה והתיקים נשמרים בדפדפן בלבד. ייצאו קובץ JSON למחשב, וייבאו אותו אחרי החלפת
            דפדפן או מחשב.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onExport} disabled={busy}>
          <Download className="w-3.5 h-3.5" />
          ייצוא גיבוי
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onPick('merge')}
          disabled={busy}
        >
          <Upload className="w-3.5 h-3.5" />
          ייבוא (מיזוג)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => onPick('replace')}
          disabled={busy}
        >
          <Upload className="w-3.5 h-3.5" />
          ייבוא (החלפה מלאה)
        </Button>
      </div>
      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" />
    </div>
  );
}

export default BackupControls;
