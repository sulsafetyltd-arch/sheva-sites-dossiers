import { useEffect, useMemo, useState } from 'react';
import { getAllDeals } from '@/lib/real-estate-store';

const UsersPage = () => {
  const [deals, setDeals] = useState(() => getAllDeals());

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

  return (
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
  );
};

export default UsersPage;
