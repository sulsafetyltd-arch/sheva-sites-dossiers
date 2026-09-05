import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { HardHat, KeyRound, Mail, UserRoundPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSafetyAuth } from '@/contexts/SafetyAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Stable callback URL for magic-link / OTP redirects (must be allowlisted in Supabase). */
function authCallbackUrl(): string {
  const base = (import.meta.env.BASE_URL || '/').endsWith('/')
    ? (import.meta.env.BASE_URL || '/')
    : `${import.meta.env.BASE_URL || '/'}/`;
  return new URL(`${base}safety/login`, window.location.origin).toString();
}

function readAuthRedirectError(): string | null {
  const fromHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(fromHash || window.location.search);
  const description = params.get('error_description') || params.get('error');
  if (!description) return null;
  return decodeURIComponent(description.replace(/\+/g, ' '));
}

export default function SafetyLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useSafetyAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const destination = (location.state as { from?: string } | null)?.from || '/safety';
  const callbackUrl = useMemo(() => authCallbackUrl(), []);

  useEffect(() => {
    const redirectError = readAuthRedirectError();
    if (redirectError) {
      setError(
        redirectError.includes('redirect') || redirectError.includes('Redirect')
          ? `כתובת החזרה לא מאושרת ב־Supabase. יש להוסיף תחת Authentication → URL Configuration את: ${window.location.origin}/**`
          : redirectError,
      );
      // Clear broken hash/query so refresh does not re-show the same error forever.
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search.split('#')[0]}`.replace(/\?$/, ''));
    }
  }, []);

  useEffect(() => {
    if (!loading && session) navigate(destination, { replace: true });
  }, [destination, loading, navigate, session]);

  if (!loading && session) return <Navigate to={destination} replace />;

  const sendMagicLink = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    setLinkSent(false);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: callbackUrl,
          shouldCreateUser: mode === 'register',
          data: mode === 'register' ? { full_name: fullName.trim() } : undefined,
        },
      });
      if (otpError) throw otpError;
      setLinkSent(true);
      setMessage(
        mode === 'register'
          ? 'נשלח אליך מייל עם קישור וקוד. אם הקישור לא נפתח — הזן את הקוד למטה.'
          : 'נשלח אליך מייל עם קישור וקוד. אם הקישור לא נפתח — הזן את הקוד למטה.',
      );
    } catch (cause) {
      const rawMessage = cause instanceof Error ? cause.message : '';
      if (rawMessage.toLowerCase().includes('signups not allowed')
        || rawMessage.toLowerCase().includes('user not found')) {
        setError('לא נמצא חשבון עם כתובת מייל זו. פתח חשבון חדש או פנה למנהל.');
      } else {
        setError(rawMessage || 'שליחת קישור הכניסה נכשלה');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const verifyEmailCode = async () => {
    setVerifying(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      });
      if (verifyError) throw verifyError;
      navigate(destination, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'אימות הקוד נכשל');
    } finally {
      setVerifying(false);
    }
  };

  const resendMagicLink = async () => {
    setResending(true);
    setError(null);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: callbackUrl,
          shouldCreateUser: mode === 'register',
          data: mode === 'register' ? { full_name: fullName.trim() } : undefined,
        },
      });
      if (otpError) throw otpError;
      setMessage('מייל חדש נשלח. יש לבדוק גם בספאם. אם הקישור שבור — השתמש בקוד מהמייל.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'שליחת קישור חדש נכשלה');
    } finally {
      setResending(false);
    }
  };

  const canSubmit = Boolean(email.trim()) && (mode === 'login' || Boolean(fullName.trim()));

  return (
    <div dir="rtl" className="min-h-screen bg-[#0f2744] grid place-items-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#f4c95d] text-[#0f2744] grid place-items-center">
            <HardHat className="w-8 h-8" />
          </div>
          <p className="text-xs text-slate-500 mt-4">סול בטיחות בע״מ</p>
          <h1 className="text-2xl font-bold mt-1">
            {mode === 'login' ? 'כניסה למערכת' : 'פתיחת חשבון עובד'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'login'
              ? 'הזן מייל ונשלח אליך קישור או קוד כניסה — ללא סיסמה'
              : 'חשבון עובד חדש ימתין לאישור מנהל'}
          </p>
        </div>

        <div className="space-y-3">
          {mode === 'register' && (
            <div className="relative">
              <UserRoundPlus className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pr-9"
                placeholder="שם מלא"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              dir="ltr"
              className="pr-9 text-left"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>

        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
        {message && (
          <div className="rounded-lg bg-emerald-50 text-emerald-700 p-3 text-sm space-y-2">
            <div>{message}</div>
            {linkSent && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={resending || !email.trim()}
                onClick={() => void resendMagicLink()}
              >
                {resending ? 'שולח…' : 'שלח שוב מייל'}
              </Button>
            )}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          disabled={submitting || !canSubmit}
          onClick={() => void sendMagicLink()}
        >
          {submitting
            ? 'שולח…'
            : mode === 'login'
              ? 'שלח קישור / קוד למייל'
              : 'שלח קישור לפתיחת חשבון'}
        </Button>

        {(linkSent || otpCode) && (
          <div className="rounded-xl border bg-slate-50 p-4 space-y-3">
            <div className="text-sm font-medium">כניסה עם קוד מהמייל</div>
            <div className="relative">
              <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                dir="ltr"
                className="pr-9 text-left tracking-[0.3em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={8}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\s/g, ''))}
              />
            </div>
            <Button
              className="w-full"
              variant="secondary"
              disabled={verifying || !email.trim() || otpCode.trim().length < 6}
              onClick={() => void verifyEmailCode()}
            >
              {verifying ? 'מאמת…' : 'אמת קוד והיכנס'}
            </Button>
          </div>
        )}

        <button
          type="button"
          className="block mx-auto text-sm text-slate-600 underline"
          onClick={() => {
            setMode((current) => (current === 'login' ? 'register' : 'login'));
            setError(null);
            setMessage(null);
            setLinkSent(false);
            setOtpCode('');
          }}
        >
          {mode === 'login' ? 'עובד חדש? פתיחת חשבון' : 'כבר יש חשבון? כניסה'}
        </button>
      </div>
    </div>
  );
}
