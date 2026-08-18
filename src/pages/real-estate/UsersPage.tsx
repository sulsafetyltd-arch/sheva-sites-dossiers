import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/real-estate/Field';
import { getAllDeals } from '@/lib/real-estate-store';
import { getOfficeProfile, saveOfficeProfile, type OfficeProfile } from '@/lib/office-profile';

const UsersPage = () => {
  const [deals, setDeals] = useState(() => getAllDeals());
  const [office, setOffice] = useState<OfficeProfile>(() => getOfficeProfile());

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
    <div className="space-y-4">
      <section className="re-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold">פרטי המשרד להפקת מסמכים</h2>
          <p className="text-sm text-muted-foreground">הפרטים האלה יוזנו אוטומטית בכל הסט: ייפוי כוח, שטר מכר והצהרות מס</p>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="עו״ד מטפל/ת">
            <Input value={office.attorneyName} onChange={(e) => setOffice({ ...office, attorneyName: e.target.value })} />
          </Field>
          <Field label="מספר רישיון">
            <Input value={office.license} onChange={(e) => setOffice({ ...office, license: e.target.value })} />
          </Field>
          <Field label="כתובת המשרד">
            <Input value={office.officeAddress} onChange={(e) => setOffice({ ...office, officeAddress: e.target.value })} />
          </Field>
          <Field label="עיר חתימה">
            <Input value={office.officeCity} onChange={(e) => setOffice({ ...office, officeCity: e.target.value })} />
          </Field>
          <Field label="עו״ד נוסף (אופציונלי)" className="md:col-span-2">
            <Input value={office.secondAttorneyName} onChange={(e) => setOffice({ ...office, secondAttorneyName: e.target.value })} />
          </Field>
        </div>
        <Button
          onClick={() => {
            saveOfficeProfile(office);
            toast.success('פרטי המשרד נשמרו');
          }}
        >
          שמירת פרטי משרד
        </Button>
      </section>

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
    </div>
  );
};

export default UsersPage;
