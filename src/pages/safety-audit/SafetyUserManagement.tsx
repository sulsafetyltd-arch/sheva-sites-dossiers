import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Check, Copy, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { useSafetyAuth, type SafetyProfile } from '@/contexts/SafetyAuthContext';
import { listClients } from '@/lib/safety-audit-store';
import {
  listClientMemberAssignments,
  listSafetyProfiles,
  setClientMemberAccess,
  updateSafetyProfile,
} from '@/lib/safety-access-control';
import type { SafetyAuditClient } from '@/types/safety-audit';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export default function SafetyUserManagement() {
  const { isAdmin, user } = useSafetyAuth();
  const [profiles, setProfiles] = useState<SafetyProfile[]>([]);
  const [clients, setClients] = useState<SafetyAuditClient[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [nextProfiles, nextClients, nextAssignments] = await Promise.all([
        listSafetyProfiles(),
        listClients(),
        listClientMemberAssignments(),
      ]);
      setProfiles(nextProfiles);
      setClients(nextClients);
      setAssignments(nextAssignments);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'טעינת המשתמשים נכשלה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  if (!isAdmin) return <Navigate to="/safety" replace />;

  const toggleActive = async (profile: SafetyProfile) => {
    setBusy(`active:${profile.id}`);
    try {
      await updateSafetyProfile(profile.id, { isActive: !profile.isActive });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'עדכון המשתמש נכשל');
    } finally {
      setBusy(null);
    }
  };

  const toggleClient = async (profile: SafetyProfile, client: SafetyAuditClient) => {
    const key = `${profile.id}:${client.id}`;
    const currentlyAllowed = assignments[profile.id]?.includes(client.id) ?? false;
    setBusy(key);
    try {
      await setClientMemberAccess(profile.id, client.id, !currentlyAllowed);
      setAssignments((current) => ({
        ...current,
        [profile.id]: !currentlyAllowed
          ? [...(current[profile.id] ?? []), client.id]
          : (current[profile.id] ?? []).filter((id) => id !== client.id),
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'עדכון ההרשאה נכשל');
    } finally {
      setBusy(null);
    }
  };

  const copyRegistrationLink = async () => {
    const registrationUrl = new URL(
      `${import.meta.env.BASE_URL}safety/login`,
      window.location.origin,
    ).toString();
    await navigator.clipboard.writeText(registrationUrl);
    setMessage('קישור ההרשמה הועתק');
  };

  const members = profiles.filter((profile) => profile.role === 'member');

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-4xl p-4 space-y-5">
        <Link to="/safety" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowRight className="w-4 h-4" /> חזרה ללקוחות
        </Link>

        <header className="rounded-2xl bg-[#0f2744] text-white p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-300">ניהול Admin</p>
            <h1 className="text-2xl font-bold mt-1">משתמשים והרשאות</h1>
            <p className="text-sm text-slate-300 mt-1">הפעל עובדים ובחר אילו לקוחות יופיעו לכל אחד</p>
          </div>
          <Button variant="secondary" className="gap-1" onClick={() => void copyRegistrationLink()}>
            <Copy className="w-4 h-4" /> העתק קישור הרשמה
          </Button>
        </header>

        <div className="rounded-xl border bg-white p-4 text-sm text-slate-600">
          שלח לעובד את קישור ההרשמה. לאחר שיפתח חשבון הוא יופיע כאן כ־Member ללא גישה,
          ורק לאחר הפעלה והקצאת לקוחות יוכל לצפות ולעבוד בדוחות שלהם.
        </div>

        {message && <div className="rounded-lg bg-emerald-50 text-emerald-700 p-3 text-sm">{message}</div>}
        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
        {loading && <div>טוען משתמשים…</div>}

        {!loading && members.length === 0 && (
          <div className="rounded-xl border border-dashed bg-white p-10 text-center">
            <UsersRound className="w-11 h-11 mx-auto text-slate-300" />
            <div className="font-semibold mt-2">עדיין אין משתמשי Member</div>
            <div className="text-sm text-slate-500 mt-1">העתק ושלח את קישור ההרשמה לעובדים.</div>
          </div>
        )}

        <div className="space-y-4">
          {members.map((profile) => (
            <section key={profile.id} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full grid place-items-center ${profile.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    <UserRound className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{profile.fullName || 'עובד ללא שם'}</div>
                    <div dir="ltr" className="text-xs text-slate-500 text-right truncate">{profile.email}</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={profile.isActive ? 'outline' : 'default'}
                  disabled={busy === `active:${profile.id}`}
                  onClick={() => void toggleActive(profile)}
                >
                  {profile.isActive ? 'השבת משתמש' : 'הפעל משתמש'}
                </Button>
              </div>

              <div className="p-4">
                <h2 className="text-sm font-semibold mb-3">לקוחות מורשים</h2>
                {clients.length === 0 ? (
                  <div className="text-sm text-slate-500">יש ליצור לקוחות לפני הקצאת הרשאות.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clients.map((client) => {
                      const key = `${profile.id}:${client.id}`;
                      const checked = assignments[profile.id]?.includes(client.id) ?? false;
                      return (
                        <label
                          key={client.id}
                          className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${checked ? 'border-emerald-300 bg-emerald-50' : 'bg-slate-50'}`}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={busy === key}
                            onCheckedChange={() => void toggleClient(profile, client)}
                          />
                          <span className="text-sm font-medium flex-1">{client.name}</span>
                          {checked && <Check className="w-4 h-4 text-emerald-600" />}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="rounded-xl border bg-white p-4 flex items-center gap-3 text-sm text-slate-600">
          <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
          ההרשאות נאכפות במסד הנתונים. משתמש אינו יכול לפתוח לקוח שלא הוקצה לו גם באמצעות קישור ישיר.
          {user?.email && <span className="sr-only">Admin: {user.email}</span>}
        </div>
      </div>
    </div>
  );
}
