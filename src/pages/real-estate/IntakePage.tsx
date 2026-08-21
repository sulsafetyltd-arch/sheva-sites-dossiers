import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Copy, MessageCircle, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/real-estate/Field';
import { encodeIntake, type IntakePerson } from '@/lib/intake';
import type { PartyRole } from '@/types/real-estate';
import soloLogoUrl from '@/assets/solo-logo.svg';

const ROLE_TITLE: Record<string, string> = {
  buyer: 'קונה/ים',
  seller: 'מוכר/ים',
  tenant: 'שוכר/ים',
  landlord: 'משכיר/ים',
};

function emptyPerson(): IntakePerson {
  return { name: '', idNumber: '', phone: '', email: '', address: '' };
}

const IntakePage = () => {
  const [params] = useSearchParams();
  const fileNumber = params.get('file') ?? '';
  const role = (params.get('role') ?? 'buyer') as PartyRole;
  const lawyerPhone = (params.get('phone') ?? '').replace(/\D/g, '');
  const [people, setPeople] = useState<IntakePerson[]>([emptyPerson()]);
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');

  const patch = (idx: number, field: keyof IntakePerson, value: string) => {
    setPeople(people.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const valid = people.some((p) => p.name.trim() && p.idNumber.trim());

  const submit = () => {
    const filled = people.filter((p) => p.name.trim());
    const generated = encodeIntake({ fileNumber, role, people: filled, notes: notes.trim() });
    setCode(generated);
  };

  const waHref = lawyerPhone
    ? `https://wa.me/${lawyerPhone.startsWith('0') ? `972${lawyerPhone.slice(1)}` : lawyerPhone}?text=${encodeURIComponent(
        `שלום, מילאתי את טופס הפרטים לתיק ${fileNumber || ''}:\n\n${code}`,
      )}`
    : '';

  return (
    <div className="re-app min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div className="text-center space-y-2">
          <img src={soloLogoUrl} alt="לוגו" className="w-20 h-20 mx-auto" />
          <h1 className="text-2xl font-bold">טופס פרטים לעסקת נדל"ן</h1>
          <p className="text-sm text-muted-foreground">
            {fileNumber && <>תיק {fileNumber} · </>}
            מלאו את פרטי ה{ROLE_TITLE[role] ?? 'לקוח/ות'} ושלחו חזרה לעורך הדין — במקום להקליד בפגישה
          </p>
        </div>

        {!code ? (
          <>
            {people.map((person, idx) => (
              <section key={idx} className="re-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">
                    {ROLE_TITLE[role] ? ROLE_TITLE[role].split('/')[0] : 'אדם'} {people.length > 1 ? idx + 1 : ''}
                  </h2>
                  {people.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setPeople(people.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="שם מלא (כמו בתעודת הזהות)">
                    <Input value={person.name} onChange={(e) => patch(idx, 'name', e.target.value)} />
                  </Field>
                  <Field label="מספר תעודת זהות">
                    <Input inputMode="numeric" value={person.idNumber} onChange={(e) => patch(idx, 'idNumber', e.target.value)} />
                  </Field>
                  <Field label="טלפון נייד">
                    <Input inputMode="tel" value={person.phone} onChange={(e) => patch(idx, 'phone', e.target.value)} />
                  </Field>
                  <Field label="דוא&quot;ל">
                    <Input inputMode="email" value={person.email} onChange={(e) => patch(idx, 'email', e.target.value)} />
                  </Field>
                  <Field label="כתובת מגורים" className="sm:col-span-2">
                    <Input value={person.address} onChange={(e) => patch(idx, 'address', e.target.value)} />
                  </Field>
                </div>
              </section>
            ))}

            <Button variant="outline" className="gap-2" onClick={() => setPeople([...people, emptyPerson()])}>
              <Plus className="w-4 h-4" />
              הוספת אדם נוסף (בן/בת זוג, שותף)
            </Button>

            <section className="re-card p-5">
              <Field label="הערות לעורך הדין (רשות)">
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="למשל: יש משכנתא קיימת בבנק לאומי..." />
              </Field>
            </section>

            <Button size="lg" className="w-full gap-2" disabled={!valid} onClick={submit}>
              <Send className="w-4 h-4" />
              סיום ויצירת קוד לשליחה
            </Button>
          </>
        ) : (
          <section className="re-card p-5 space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <h2 className="text-lg font-semibold">הפרטים מוכנים לשליחה</h2>
            <p className="text-sm text-muted-foreground">
              שלחו את הקוד לעורך הדין בוואטסאפ — הוא ייקלט אצלו ישירות לתיק
            </p>
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer">
                <Button size="lg" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <MessageCircle className="w-5 h-5" />
                  שליחה בוואטסאפ לעורך הדין
                </Button>
              </a>
            )}
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">או העתיקו את הקוד ושלחו בכל דרך אחרת:</p>
              <div className="flex gap-2">
                <Input readOnly value={code} className="font-mono text-xs" dir="ltr" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard?.writeText(code);
                    toast.success('הקוד הועתק');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button variant="ghost" onClick={() => setCode('')}>חזרה לעריכת הפרטים</Button>
          </section>
        )}

        <p className="text-xs text-muted-foreground text-center">
          הפרטים אינם נשמרים בשרת — הם מועברים ישירות לעורך הדין בלבד.
        </p>
      </div>
    </div>
  );
};

export default IntakePage;
