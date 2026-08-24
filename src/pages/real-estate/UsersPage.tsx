import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Cloud, Download, PenLine, Upload } from 'lucide-react';
import { SignaturePad } from '@/components/real-estate/SignaturePad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/real-estate/Field';
import { getAllDeals } from '@/lib/real-estate-store';
import { getOfficeProfile, saveOfficeProfile, type OfficeProfile } from '@/lib/office-profile';
import { SETUP_SQL, getCloudSettings, saveCloudSettings, syncNow, type CloudSettings } from '@/lib/cloud-sync';
import { downloadBackup, getBackupHistory, restoreBackup } from '@/lib/backup';
import { formatDateHe } from '@/lib/real-estate-utils';

const MAX_LOGO_BYTES = 500 * 1024;

const UsersPage = () => {
  const [deals, setDeals] = useState(() => getAllDeals());
  const [office, setOffice] = useState<OfficeProfile>(() => getOfficeProfile());
  const [cloud, setCloud] = useState<CloudSettings>(() => getCloudSettings());
  const [backupHistory, setBackupHistory] = useState<string[]>(() => getBackupHistory());
  const [syncing, setSyncing] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const restoreRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);
  const [sigPadOpen, setSigPadOpen] = useState(false);

  const setSignature = (dataUrl: string) => {
    const next = { ...office, signatureDataUrl: dataUrl };
    setOffice(next);
    saveOfficeProfile(next);
    toast.success(
      dataUrl
        ? 'חתימת עו״ד נשמרה — תשולב אוטומטית באישורי האימות ובמסמכים שעורך הדין מאשר'
        : 'החתימה הוסרה — במסמכים יופיע קו לחתימה ידנית',
    );
  };

  const handleSignatureUpload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('קובץ החתימה גדול מדי — עד 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSignature(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setDeals(getAllDeals());
  }, []);

  const users = useMemo(() => {
    const names = [...new Set(deals.map((d) => d.responsibleAttorney).filter(Boolean))];
    return names.map((name) => ({
      name,
      role: 'עורך/ת דין',
      open: deals.filter((d) => d.responsibleAttorney === name && d.status !== 'closed' && d.status !== 'cancelled').length,
      total: deals.filter((d) => d.responsibleAttorney === name).length,
    }));
  }, [deals]);

  const handleLogoUpload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('הלוגו גדול מדי — עד 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const next = { ...office, logoDataUrl: String(reader.result ?? '') };
      setOffice(next);
      saveOfficeProfile(next);
      toast.success('הלוגו נשמר ויופיע בראש כל מסמך');
    };
    reader.readAsDataURL(file);
  };

  const handleSync = async () => {
    saveCloudSettings(cloud);
    setSyncing(true);
    try {
      const result = await syncNow();
      setCloud(getCloudSettings());
      setDeals(getAllDeals());
      toast.success(`סונכרן: ${result.pulled} נמשכו · ${result.pushed} הועלו · ${result.total} תיקים`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאת סנכרון');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="re-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold">פרטי המשרד להפקת מסמכים</h2>
          <p className="text-sm text-muted-foreground">הפרטים האלה יוזנו אוטומטית בכל הסט: ייפוי כוח, שטר מכר והצהרות מס</p>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="עו״ד מטפל/ת">
            <Input value={office.attorneyName} onChange={(e) => setOffice({ ...office, attorneyName: e.target.value })} />
          </Field>
          <Field label="מספר רישיון">
            <Input value={office.license} onChange={(e) => setOffice({ ...office, license: e.target.value })} />
          </Field>
          <Field label="כתובת המשרד">
            <Input value={office.officeAddress} onChange={(e) => setOffice({ ...office, officeAddress: e.target.value })} />
          </Field>
          <Field label="עיר חתימה">
            <Input value={office.officeCity} onChange={(e) => setOffice({ ...office, officeCity: e.target.value })} />
          </Field>
          <Field label="טלפון המשרד (לוואטסאפ וטופס לקוח)">
            <Input
              inputMode="tel"
              value={office.officePhone ?? ''}
              onChange={(e) => setOffice({ ...office, officePhone: e.target.value })}
              placeholder="050-0000000"
            />
          </Field>
          <Field label="עו״ד נוסף (אופציונלי)" className="md:col-span-2">
            <Input value={office.secondAttorneyName} onChange={(e) => setOffice({ ...office, secondAttorneyName: e.target.value })} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              saveOfficeProfile(office);
              toast.success('פרטי המשרד נשמרו');
            }}
          >
            שמירת פרטי משרד
          </Button>
          <input
            ref={logoRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => handleLogoUpload(e.target.files?.[0])}
          />
          <Button variant="outline" className="gap-2" onClick={() => logoRef.current?.click()}>
            <Upload className="w-4 h-4" />
            {office.logoDataUrl ? 'החלפת לוגו' : 'העלאת לוגו למסמכים'}
          </Button>
          {office.logoDataUrl && (
            <>
              <img src={office.logoDataUrl} alt="לוגו המשרד" className="h-10 rounded border bg-white p-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const next = { ...office, logoDataUrl: '' };
                  setOffice(next);
                  saveOfficeProfile(next);
                  toast.success('הלוגו הוסר');
                }}
              >
                הסרת לוגו
              </Button>
            </>
          )}
        </div>

        <div className="border-t pt-4 space-y-2">
          <div>
            <p className="font-medium">חתימת עו״ד למסמכים</p>
            <p className="text-sm text-muted-foreground">
              החתימה משולבת אוטומטית בכל מקום שבו עורך הדין מאשר או מאמת: אימותי חתימה על ייפויי כוח ותצהירים,
              אישורי עו״ד בשטר המכר, הסכם שכר הטרחה ואישור האימות מרחוק. ללא חתימה שמורה יופיע קו לחתימה ידנית.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={sigRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                handleSignatureUpload(file);
              }}
            />
            <Button variant="outline" className="gap-2" onClick={() => setSigPadOpen(true)}>
              <PenLine className="w-4 h-4" />
              ציור חתימה על המסך
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => sigRef.current?.click()}>
              <Upload className="w-4 h-4" />
              {office.signatureDataUrl ? 'החלפה בתמונת חתימה' : 'העלאת תמונת חתימה'}
            </Button>
            {office.signatureDataUrl && (
              <>
                <img src={office.signatureDataUrl} alt="חתימת עו״ד" className="h-10 rounded border bg-white p-1" />
                <Button variant="ghost" size="sm" onClick={() => setSignature('')}>
                  הסרת חתימה
                </Button>
              </>
            )}
          </div>
        </div>

        <SignaturePad
          open={sigPadOpen}
          onOpenChange={setSigPadOpen}
          onSave={(dataUrl) => setSignature(dataUrl)}
          title="ציור חתימת עו״ד"
          description="ציירו את חתימתכם באצבע או בעכבר — היא תישמר ותשולב אוטומטית במסמכים"
          hideName
        />
      </section>

      <section className="re-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              גיבוי וסנכרון ענן (Supabase)
            </h2>
            <p className="text-sm text-muted-foreground">
              חיבור חינמי שמסנכרן את התיקים בין המחשב במשרד, הבית והנייד.
              {cloud.lastSyncAt ? ` סונכרן לאחרונה: ${formatDateHe(cloud.lastSyncAt.slice(0, 10))}` : ''}
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncing || !cloud.url.trim() || !cloud.anonKey.trim()}>
            {syncing ? 'מסנכרן…' : 'סנכרן עכשיו'}
          </Button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Supabase URL">
            <Input dir="ltr" placeholder="https://xxxx.supabase.co" value={cloud.url} onChange={(e) => setCloud({ ...cloud, url: e.target.value })} />
          </Field>
          <Field label="Anon Key">
            <Input dir="ltr" type="password" placeholder="eyJhbGciOi..." value={cloud.anonKey} onChange={(e) => setCloud({ ...cloud, anonKey: e.target.value })} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="rounded border"
            checked={cloud.autoSync}
            onChange={(e) => setCloud({ ...cloud, autoSync: e.target.checked })}
          />
          סנכרון אוטומטי בכניסה למערכת
        </label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              saveCloudSettings(cloud);
              toast.success('הגדרות הענן נשמרו');
            }}
          >
            שמירת הגדרות
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSql((v) => !v)}>
            {showSql ? 'הסתר הוראות התקנה' : 'הוראות התקנה (פעם אחת)'}
          </Button>
        </div>
        {showSql && (
          <div className="text-sm space-y-2 bg-muted/40 rounded-lg p-4">
            <p>1. פתחו פרויקט חינמי ב-<a className="text-primary underline" href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>.</p>
            <p>2. בתפריט SQL Editor הריצו את הפקודה הבאה (יצירת טבלאות):</p>
            <pre dir="ltr" className="text-xs bg-background border rounded p-3 overflow-x-auto whitespace-pre-wrap">{SETUP_SQL}</pre>
            <p>3. העתיקו מ-Settings → API את ה-URL ואת ה-anon key לשדות למעלה ולחצו «סנכרן עכשיו».</p>
            <p className="text-muted-foreground">הערה: ההגדרה הזו פתוחה לכל מי שמחזיק במפתח — שמרו עליו כמו על סיסמה.</p>
          </div>
        )}
      </section>

      <section className="re-card p-5 space-y-3">
        <div>
          <h2 className="font-semibold">גיבוי מקומי לקובץ</h2>
          <p className="text-sm text-muted-foreground">ייצוא כל התיקים, פרטי המשרד, התבניות והעריכות לקובץ JSON — ושחזור ממנו במחשב אחר</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-muted-foreground text-xs">תיקים</p>
            <p className="font-bold tabular-nums">{deals.length}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-muted-foreground text-xs">לקוחות וצדדים</p>
            <p className="font-bold tabular-nums">{deals.reduce((s, d) => s + d.parties.length, 0)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-muted-foreground text-xs">משימות</p>
            <p className="font-bold tabular-nums">{deals.reduce((s, d) => s + d.tasks.length, 0)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-muted-foreground text-xs">מסמכים ותשלומים</p>
            <p className="font-bold tabular-nums">
              {deals.reduce((s, d) => s + d.documents.length + d.payments.length, 0)}
            </p>
          </div>
        </div>

        {backupHistory.length === 0 ? (
          <p className="text-sm rounded-lg border border-amber-300 bg-amber-50 text-amber-800 px-3 py-2">
            ⚠️ טרם בוצע גיבוי למערכת — מומלץ מאוד לייצא גיבוי ולשמור במקום בטוח (Google Drive, Dropbox וכו׳)
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            גיבוי אחרון: {formatDateHe(backupHistory[0].slice(0, 10))} · סה״כ {backupHistory.length} גיבויים אחרונים נרשמו
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              downloadBackup();
              setBackupHistory(getBackupHistory());
            }}
          >
            <Download className="w-4 h-4" />
            ייצוא גיבוי מלא
          </Button>
          <input
            ref={restoreRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                const { deals: count } = await restoreBackup(file);
                setDeals(getAllDeals());
                setOffice(getOfficeProfile());
                toast.success(`שוחזרו ${count} תיקים מהגיבוי`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'קובץ גיבוי לא תקין');
              }
            }}
          />
          <Button variant="outline" className="gap-2" onClick={() => restoreRef.current?.click()}>
            <Upload className="w-4 h-4" />
            שחזור מגיבוי
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">שימו לב: שחזור מחליף את כל התיקים הקיימים בדפדפן זה.</p>
      </section>

      <section className="re-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">משתמשי המשרד</h2>
          <p className="text-sm text-muted-foreground">עורכי דין המופיעים כמטופלי תיק</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="re-table text-right">
                <th className="px-4 py-3">שם</th>
                <th className="px-4 py-3">תפקיד</th>
                <th className="px-4 py-3">תיקים פתוחים</th>
                <th className="px-4 py-3">סה״כ תיקים</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center text-muted-foreground">
                    אין משתמשים להצגה
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.name} className="border-t">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3 tabular-nums">{user.open}</td>
                  <td className="px-4 py-3 tabular-nums">{user.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default UsersPage;
