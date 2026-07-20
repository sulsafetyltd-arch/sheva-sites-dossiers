import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Camera, FolderOpen, Save, Sparkles, Trash2 } from 'lucide-react';
import SignaturePad from '@/components/dossier/SignaturePad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSafetyAuth } from '@/contexts/SafetyAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { resizeImageToBlob } from '@/lib/storage-utils';
import { getVisionApiKeys, saveVisionApiKeys } from '@/lib/safety-defect-vision';

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('קריאת התמונה נכשלה'));
    reader.readAsDataURL(blob);
  });
}

export default function SafetyUserProfile() {
  const { profile, refreshProfile } = useSafetyAuth();
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [signature, setSignature] = useState<string | undefined>();
  const [stamp, setStamp] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [processingStamp, setProcessingStamp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [visionMessage, setVisionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName ?? '');
    setJobTitle(profile.jobTitle ?? '');
    setPhone(profile.phone ?? '');
    setSignature(profile.signatureDataUrl);
    setStamp(profile.stampDataUrl);
  }, [profile]);

  useEffect(() => {
    const keys = getVisionApiKeys();
    setGeminiKey(keys.gemini || '');
    setOpenaiKey(keys.openai || '');
  }, []);

  const uploadStamp = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('יש לבחור קובץ תמונה');
      return;
    }
    setProcessingStamp(true);
    setError(null);
    try {
      const blob = await resizeImageToBlob(file, 800, 0.82);
      setStamp(await blobToDataUrl(blob));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'עיבוד החותמת נכשל');
    } finally {
      setProcessingStamp(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { error: rpcError } = await supabase.rpc('update_own_safety_profile', {
        profile_full_name: fullName,
        profile_job_title: jobTitle,
        profile_phone: phone,
        profile_signature_data_url: signature ?? null,
        profile_stamp_data_url: stamp ?? null,
      });
      if (rpcError) throw rpcError;
      await refreshProfile();
      setMessage('הפרטים נשמרו וישולבו אוטומטית בדוחות חדשים');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שמירת הפרופיל נכשלה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-2xl p-4 space-y-5">
        <Link to="/safety" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowRight className="w-4 h-4" /> חזרה ללקוחות
        </Link>

        <header className="rounded-2xl bg-[#0f2744] text-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#f4c95d] text-[#0f2744] grid place-items-center">
              <BadgeCheck className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs text-slate-300">פרופיל משתמש</p>
              <h1 className="text-2xl font-bold">פרטים, חתימה וחותמת</h1>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-3">
            הפרטים נשמרים בחשבון ויועתקו אוטומטית לכל דוח חדש שתיצור.
          </p>
        </header>

        <section className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="font-semibold">פרטים מקצועיים</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="שם מלא *" />
            <Input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="תפקיד, לדוגמה: ממונה בטיחות" />
            <Input dir="ltr" className="text-right sm:col-span-2" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="טלפון" />
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4 space-y-3">
          <div>
            <h2 className="font-semibold">חתימה דיגיטלית</h2>
            <p className="text-xs text-slate-500 mt-1">חתום במסגרת ולחץ „אשר חתימה”.</p>
          </div>
          <SignaturePad
            value={signature}
            onChange={(dataUrl) => setSignature(dataUrl ?? undefined)}
            width={520}
            height={170}
          />
        </section>

        <section className="rounded-xl border bg-white p-4 space-y-3">
          <div>
            <h2 className="font-semibold">חותמת</h2>
            <p className="text-xs text-slate-500 mt-1">צלם או העלה תמונה ברורה של החותמת על רקע בהיר.</p>
          </div>
          {stamp && (
            <div className="rounded-lg border bg-slate-50 p-3 flex items-center justify-between gap-3">
              <img src={stamp} alt="חותמת המשתמש" className="h-28 max-w-[220px] object-contain mix-blend-multiply" />
              <Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => setStamp(undefined)} aria-label="מחיקת החותמת">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className={`rounded-lg border-2 border-dashed p-5 flex flex-col items-center gap-2 hover:bg-slate-50 ${processingStamp ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
              <FolderOpen className="w-7 h-7 text-slate-500" />
              <span className="text-sm font-medium">{processingStamp ? 'מעבד תמונה…' : stamp ? 'החלף מהגלריה / קבצים' : 'בחר מהגלריה / קבצים'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={processingStamp}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  void uploadStamp(file);
                }}
              />
            </label>
            <label className={`rounded-lg border-2 border-dashed p-5 flex flex-col items-center gap-2 hover:bg-slate-50 ${processingStamp ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
              <Camera className="w-7 h-7 text-slate-500" />
              <span className="text-sm font-medium">צלם חותמת במצלמה</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={processingStamp}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  void uploadStamp(file);
                }}
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="font-semibold">זיהוי ליקויים מתמונה (אבטיפוס)</h2>
              <p className="text-xs text-slate-500 mt-1">
                צרו מפתח ב־AI Studio (Create API key), העתיקו מפתח שמתחיל ב־AQ. או AIza, ושמרו כאן.
                המפתח נשמר במכשיר זה בלבד.
              </p>
              <a
                className="text-xs text-blue-700 underline"
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
              >
                פתיחת Google AI Studio
              </a>
            </div>
          </div>
          <Input
            dir="ltr"
            className="text-left"
            type="password"
            placeholder="Gemini API key"
            value={geminiKey}
            onChange={(event) => setGeminiKey(event.target.value)}
          />
          <Input
            dir="ltr"
            className="text-left"
            type="password"
            placeholder="OpenAI API key (אופציונלי)"
            value={openaiKey}
            onChange={(event) => setOpenaiKey(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                saveVisionApiKeys({ gemini: geminiKey, openai: openaiKey });
                setVisionMessage('מפתחות הזיהוי נשמרו במכשיר');
              }}
            >
              שמור מפתחות Vision
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                saveVisionApiKeys({ gemini: '', openai: '' });
                setGeminiKey('');
                setOpenaiKey('');
                setVisionMessage('מפתחות הזיהוי הוסרו');
              }}
            >
              נקה מפתחות
            </Button>
          </div>
          {visionMessage && <div className="text-sm text-emerald-700">{visionMessage}</div>}
        </section>

        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
        {message && <div className="rounded-lg bg-emerald-50 text-emerald-700 p-3 text-sm">{message}</div>}

        <Button className="w-full gap-2" size="lg" disabled={saving || !fullName.trim()} onClick={() => void save()}>
          <Save className="w-4 h-4" /> {saving ? 'שומר…' : 'שמור פרופיל'}
        </Button>
      </div>
    </div>
  );
}
