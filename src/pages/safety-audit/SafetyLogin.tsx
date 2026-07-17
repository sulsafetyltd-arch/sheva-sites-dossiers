import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { HardHat, LockKeyhole, Mail, UserRoundPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSafetyAuth } from '@/contexts/SafetyAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SafetyLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useSafetyAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const destination = (location.state as { from?: string } | null)?.from || '/safety';

  useEffect(() => {
    if (!loading && session) navigate(destination, { replace: true });
  }, [destination, loading, navigate, session]);

  if (!loading && session) return <Navigate to={destination} replace />;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/safety`,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          navigate('/safety', { replace: true });
        } else {
          setMessage('נשלח אליך מייל לאימות החשבון. לאחר האימות ניתן להתחבר.');
          setMode('login');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        navigate(destination, { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'הפעולה נכשלה');
    } finally {
      setSubmitting(false);
    }
  };

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
              ? 'התחבר כדי לצפות בלקוחות ובדוחות שהוקצו לך'
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
          <div className="relative">
            <LockKeyhole className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              dir="ltr"
              className="pr-9 text-left"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="סיסמה – לפחות 6 תווים"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </div>

        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
        {message && <div className="rounded-lg bg-emerald-50 text-emerald-700 p-3 text-sm">{message}</div>}

        <Button
          className="w-full"
          size="lg"
          disabled={submitting || !email.trim() || password.length < 6 || (mode === 'register' && !fullName.trim())}
          onClick={() => void submit()}
        >
          {submitting ? 'מתבצע…' : mode === 'login' ? 'כניסה' : 'יצירת חשבון'}
        </Button>

        <button
          type="button"
          className="block mx-auto text-sm text-slate-600 underline"
          onClick={() => {
            setMode((current) => current === 'login' ? 'register' : 'login');
            setError(null);
            setMessage(null);
          }}
        >
          {mode === 'login' ? 'עובד חדש? פתיחת חשבון' : 'כבר יש חשבון? כניסה'}
        </button>
      </div>
    </div>
  );
}
