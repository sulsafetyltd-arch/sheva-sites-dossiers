import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Copy, Eraser, MessageCircle, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/real-estate/Field';
import { STATUTORY_WARNING, encodeSignPayload } from '@/lib/remote-sign';
import soloLogoUrl from '@/assets/solo-logo.svg';

const SignPage = () => {
  const [params] = useSearchParams();
  const sessionId = params.get('session') ?? '';
  const docTitle = params.get('doc') ?? '';
  const lawyerPhone = (params.get('phone') ?? '').replace(/\D/g, '');
  const [name, setName] = useState(params.get('name') ?? '');
  const [idNumber, setIdNumber] = useState(params.get('tz') ?? '');
  const [agreed, setAgreed] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [code, setCode] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a2a6c';
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const submit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Downscale so the code stays short enough for a WhatsApp message.
    const small = document.createElement('canvas');
    small.width = 300;
    small.height = 120;
    const sctx = small.getContext('2d');
    if (!sctx) return;
    sctx.drawImage(canvas, 0, 0, small.width, small.height);
    const generated = encodeSignPayload({
      sessionId,
      name: name.trim(),
      idNumber: idNumber.trim(),
      dataUrl: small.toDataURL('image/png'),
      signedAt: new Date().toISOString(),
    });
    setCode(generated);
  };

  const waHref = lawyerPhone
    ? `https://wa.me/${lawyerPhone.startsWith('0') ? `972${lawyerPhone.slice(1)}` : lawyerPhone}?text=${encodeURIComponent(
        `שלום, חתמתי על «${docTitle}» באימות מרחוק:\n\n${code}`,
      )}`
    : '';

  return (
    <div className="re-app min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <div className="text-center space-y-2">
          <img src={soloLogoUrl} alt="לוגו" className="w-20 h-20 mx-auto" />
          <h1 className="text-2xl font-bold">חתימה מרחוק באימות עורך דין</h1>
          {docTitle && (
            <p className="text-sm text-muted-foreground">
              המסמך לחתימה: <strong className="text-foreground">{docTitle}</strong>
            </p>
          )}
        </div>

        {!code ? (
          <>
            <section className="re-card p-5 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="שם מלא (כמו בתעודת הזהות)">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="מספר תעודת זהות">
                  <Input inputMode="numeric" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                </Field>
              </div>
            </section>

            <section className="re-card p-5 space-y-3">
              <p className="text-sm font-medium">הצהרה ואזהרה</p>
              <p className="text-sm text-muted-foreground">
                עורך הדין יזהה אתכם בשיחת וידאו מול תעודת זהות ויקריא את האזהרה הבאה:
              </p>
              <p className="text-sm rounded-lg border bg-muted/30 p-3">"{STATUTORY_WARNING}"</p>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="mt-1 rounded border" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>
                  אני מאשר/ת כי הבנתי את האזהרה, כי אני חותם/ת מרצוני החופשי במהלך שיחת וידאו עם עורך הדין,
                  וכי החתימה שאצייר להלן היא חתימתי.
                </span>
              </label>
            </section>

            <section className="re-card p-5 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <PenLine className="w-4 h-4" />
                ציירו את חתימתכם באצבע
              </p>
              <canvas
                ref={canvasRef}
                width={560}
                height={220}
                className="w-full rounded-lg border-2 border-dashed bg-white touch-none cursor-crosshair"
                onPointerDown={(e) => {
                  drawing.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const ctx = canvasRef.current?.getContext('2d');
                  if (!ctx) return;
                  const p = getPoint(e);
                  ctx.beginPath();
                  ctx.moveTo(p.x, p.y);
                }}
                onPointerMove={(e) => {
                  if (!drawing.current) return;
                  const ctx = canvasRef.current?.getContext('2d');
                  if (!ctx) return;
                  const p = getPoint(e);
                  ctx.lineTo(p.x, p.y);
                  ctx.stroke();
                  setHasInk(true);
                }}
                onPointerUp={() => { drawing.current = false; }}
                onPointerLeave={() => { drawing.current = false; }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const canvas = canvasRef.current;
                  canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
                  setHasInk(false);
                }}
              >
                <Eraser className="w-4 h-4" />
                ניקוי וחתימה מחדש
              </Button>
            </section>

            <Button
              size="lg"
              className="w-full gap-2"
              disabled={!name.trim() || !idNumber.trim() || !agreed || !hasInk}
              onClick={submit}
            >
              <CheckCircle2 className="w-5 h-5" />
              אישור החתימה ויצירת קוד לשליחה
            </Button>
          </>
        ) : (
          <section className="re-card p-5 space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <h2 className="text-lg font-semibold">החתימה נקלטה</h2>
            <p className="text-sm text-muted-foreground">
              שלחו את הקוד לעורך הדין — החתימה תשולב באישור האימות
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
            <Button variant="ghost" onClick={() => setCode('')}>חזרה לחתימה מחדש</Button>
          </section>
        )}

        <p className="text-xs text-muted-foreground text-center">
          החתימה אינה נשמרת בשרת — היא מועברת ישירות לעורך הדין בלבד.
        </p>
      </div>
    </div>
  );
};

export default SignPage;
