import { useEffect, useMemo, useState } from 'react';
import { getAllDeals } from '@/lib/real-estate-store';
import { PARTY_ROLE_LABEL, listClients } from '@/lib/real-estate-utils';

const ClientsPage = () => {
  const [deals, setDeals] = useState(() => getAllDeals());

  useEffect(() => {
    setDeals(getAllDeals());
  }, []);

  const clients = useMemo(() => listClients(deals), [deals]);

  return (
    <section className="re-card overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h2 className="font-semibold">לקוחות המשרד</h2>
        <p className="text-sm text-muted-foreground">{clients.length} לקוחות מתוך תיקי העסקאות</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="re-table text-right">
              <th className="px-4 py-3">שם</th>
              <th className="px-4 py-3">תפקיד</th>
              <th className="px-4 py-3">טלפון</th>
              <th className="px-4 py-3">דוא״ל</th>
              <th className="px-4 py-3">תיקים</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                  אין לקוחות להצגה
                </td>
              </tr>
            )}
            {clients.map((client) => (
              <tr key={`${client.name}-${client.phone}`} className="border-t">
                <td className="px-4 py-3 font-medium">{client.name}</td>
                <td className="px-4 py-3">{PARTY_ROLE_LABEL[client.role]}</td>
                <td className="px-4 py-3 tabular-nums">{client.phone || '—'}</td>
                <td className="px-4 py-3">{client.email || '—'}</td>
                <td className="px-4 py-3 tabular-nums">{client.deals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ClientsPage;
