import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Flame, GraduationCap, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getClient } from '@/lib/safety-audit-store';
import {
  createTrainingSession,
  deleteTrainingSession,
  listTrainingSessions,
} from '@/lib/safety-training-store';
import type { SafetyAuditClient } from '@/types/safety-audit';
import type { SafetyTrainingSession, TrainingCategory } from '@/types/safety-training';
import { TRAINING_CATEGORY_DETAILS, trainingCategoryLabel } from '@/types/safety-training';
import { useSafetyAuth } from '@/contexts/SafetyAuthContext';

const categories: Array<{ value: TrainingCategory; icon: typeof ShieldCheck }> = [
  { value: 'general', icon: ShieldCheck },
  { value: 'work_at_height', icon: GraduationCap },
  { value: 'fire', icon: Flame },
];

export default function SafetyTrainingClient() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useSafetyAuth();
  const [client, setClient] = useState<SafetyAuditClient | null>(null);
  const [sessions, setSessions] = useState<SafetyTrainingSession[]>([]);
  const [category, setCategory] = useState<TrainingCategory>('general');
  const [location, setLocation] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!clientId) return;
    try {
      const [nextClient, nextSessions] = await Promise.all([
        getClient(clientId),
        listTrainingSessions(clientId),
      ]);
      setClient(nextClient);
      setSessions(nextSessions);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'טעינת ההדרכות נכשלה');
    }
  }, [clientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async () => {
    if (!clientId) return;
    setCreating(true);
    try {
      const session = await createTrainingSession(clientId, category, location.trim());
      navigate(`/safety/training/editor/${session.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'יצירת ההדרכה נכשלה');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (session: SafetyTrainingSession) => {
    if (!confirm(`למחוק את ההדרכה ${session.sessionNumber}?`)) return;
    try {
      await deleteTrainingSession(session.id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'מחיקת ההדרכה נכשלה');
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <main className="container mx-auto max-w-3xl p-4 space-y-5">
        <Link to={`/safety/client/${clientId}`} className="inline-flex items-center gap-1 text-sm text-slate-500">
          <ArrowRight className="w-4 h-4" /> חזרה לדוחות הלקוח
        </Link>

        <header className="rounded-2xl bg-[#0f2744] text-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#f4c95d] text-[#0f2744] p-3"><GraduationCap /></div>
            <div>
              <h1 className="text-2xl font-bold">הדרכות בטיחות</h1>
              <p className="text-sm text-slate-300">{client?.name || 'טוען לקוח…'}</p>
            </div>
          </div>
        </header>

        <section className="rounded-xl border bg-white p-4 space-y-4">
          <h2 className="font-semibold">פתיחת הדרכה חדשה</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {categories.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`rounded-xl border p-3 text-right min-h-24 touch-manipulation ${
                  category === value ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5 mb-2" />
                <div className="font-semibold">{TRAINING_CATEGORY_DETAILS[value].shortLabel}</div>
                <div className={`text-xs mt-1 ${category === value ? 'text-slate-300' : 'text-slate-500'}`}>
                  {value === 'work_at_height' ? 'טופס קבוצתי + אישורים אישיים' : 'טופס קבוצתי וחתימות'}
                </div>
              </button>
            ))}
          </div>
          <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="מיקום ההדרכה / אתר" />
          <Button onClick={() => void create()} disabled={creating} className="gap-1">
            <Plus className="w-4 h-4" /> {creating ? 'יוצר…' : 'צור הדרכה'}
          </Button>
        </section>

        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        <section className="space-y-2">
          <h2 className="font-semibold">הדרכות קודמות</h2>
          {sessions.length === 0 && <div className="rounded-xl border border-dashed bg-white p-6 text-center text-slate-500">אין הדרכות עדיין</div>}
          {sessions.map((session) => (
            <div key={session.id} className="rounded-xl border bg-white p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-semibold">{trainingCategoryLabel(session.category)}</div>
                  <div className="text-sm text-slate-500">{session.sessionNumber} · {session.trainingDate}</div>
                  {session.location && <div className="text-sm">{session.location}</div>}
                </div>
                {isAdmin && (
                  <Button size="icon" variant="ghost" onClick={() => void remove(session)} aria-label="מחיקת הדרכה">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button asChild size="sm"><Link to={`/safety/training/editor/${session.id}`}>עריכה וחתימות</Link></Button>
                <Button asChild size="sm" variant="secondary"><Link to={`/safety/training/preview/${session.id}`}>תצוגה / PDF</Link></Button>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
