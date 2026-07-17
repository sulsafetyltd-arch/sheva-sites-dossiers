import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, UserRoundCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSafetyAuth } from '@/contexts/SafetyAuthContext';

export default function RequireSafetyAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { session, profile, loading, profileError, signOut } = useSafetyAuth();

  if (loading) {
    return <div dir="rtl" className="min-h-screen grid place-items-center bg-slate-50">טוען חשבון…</div>;
  }

  if (!session) {
    return <Navigate to="/safety/login" replace state={{ from: location.pathname }} />;
  }

  if (profileError) {
    return (
      <StatusCard
        icon={<ShieldAlert className="w-9 h-9 text-red-600" />}
        title="לא ניתן לטעון הרשאות"
        message={profileError}
        onSignOut={() => void signOut()}
      />
    );
  }

  if (!profile?.isActive) {
    return (
      <StatusCard
        icon={<UserRoundCheck className="w-9 h-9 text-amber-600" />}
        title="החשבון ממתין לאישור"
        message="מנהל המערכת צריך להפעיל את החשבון ולהקצות לך לקוחות. לאחר האישור חזור לאפליקציה או רענן את המסך."
        onSignOut={() => void signOut()}
      />
    );
  }

  return <>{children}</>;
}

function StatusCard({
  icon,
  title,
  message,
  onSignOut,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  onSignOut: () => void;
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 grid place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 grid place-items-center">{icon}</div>
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-slate-600 mt-2">{message}</p>
        </div>
        <Button variant="outline" onClick={onSignOut}>התנתק</Button>
      </div>
    </div>
  );
}
