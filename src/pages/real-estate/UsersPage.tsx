import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllDeals } from '@/lib/real-estate-store';
import { Button } from '@/components/ui/button';

/**
 * Workload roster derived from deals — not a fake auth/users admin.
 * Shows attorneys that appear as responsible on files.
 */
const UsersPage = () => {
  const [deals, setDeals] = useState(() => getAllDeals());

  useEffect(() => {
    setDeals(getAllDeals());
  }, []);

  const attorneys = useMemo(() => {
    const names = [...new Set(deals.map((d) => d.responsibleAttorney).filter(Boolean))];
    return names
      .map((name) => ({
        name,
        open: deals.filter(
          (d) =>
            d.responsibleAttorney === name &&
            d.status !== 'closed' &&
            d.status !== 'cancelled',
        ).length,
        total: deals.filter((d) => d.responsibleAttorney === name).length,
      }))
      .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name, 'he'));
  }, [deals]);

  return (
    <div className="space-y-4">
      <section className="re-card p-5 space-y-2">
        <h2 className="font-semibold text-lg">צוות מתיקים</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          רשימה הנגזרת אוטומטית משמות עורכי הדין האחראים בתיקים. אין כאן ניהול הרשאות או
          משתמשים מדומים — כדי להוסיף שם, עדכנו את שדה «בטיפול של» בעסקה.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/real-estate/deals">לעסקאות</Link>
        </Button>
      </section>

      <section className="re-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold">עורכי דין מתוך התיקים</h3>
          <p className="text-sm text-muted-foreground">{attorneys.length} שמות פעילים</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="re-table text-right">
                <th className="px-4 py-3">שם</th>
                <th className="px-4 py-3">תיקים פתוחים</th>
                <th className="px-4 py-3">סה״כ תיקים</th>
              </tr>
            </thead>
            <tbody>
              {attorneys.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center text-muted-foreground">
                    אין עדיין שמות בתיקים — פתחו עסקה ומלאו «בטיפול של»
                  </td>
                </tr>
              )}
              {attorneys.map((user) => (
                <tr key={user.name} className="border-t">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
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
