import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createClient, deleteClient, listClients, listReports } from '@/lib/safety-audit-store';
import type { SafetyAuditClient, SafetyAuditReport } from '@/types/safety-audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PwaInstallCard from '@/components/safety/PwaInstallCard';
import DataBackupCard from '@/components/safety/DataBackupCard';
import { Building2, Mail, MapPin, Phone, Plus, Search, Trash2 } from 'lucide-react';

const SafetyAuditIndex = () => {
  const [clients, setClients] = useState<SafetyAuditClient[]>([]);
  const [reports, setReports] = useState<SafetyAuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    try {
      const [clientItems, reportItems] = await Promise.all([listClients(), listReports()]);
      setClients(clientItems);
      setReports(reportItems);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'שגיאה בטעינת דוחות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onCreateClient = async () => {
    setCreating(true);
    try {
      await createClient({
        name,
        contactName,
        phone,
        email,
        address,
      });
      setName('');
      setContactName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setShowForm(false);
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? 'שגיאה ביצירת לקוח');
    } finally {
      setCreating(false);
    }
  };

  const onDeleteClient = async (client: SafetyAuditClient) => {
    const count = reports.filter((report) => report.clientId === client.id).length;
    if (!confirm(`למחוק את ${client.name}${count ? ` ואת ${count} הדוחות שלו` : ''}?`)) return;
    await deleteClient(client.id);
    await refresh();
  };

  const reportCount = (clientId: string) =>
    reports.filter((report) => report.clientId === clientId).length;

  const visibleClients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('he');
    if (!query) return clients;
    return clients.filter((client) =>
      [client.name, client.contactName, client.phone, client.email, client.address]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('he').includes(query))
    );
  }, [clients, search]);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-3xl p-4 space-y-6">
        <header className="space-y-1 pt-2">
          <p className="text-sm text-slate-500">סול בטיחות בע״מ</p>
          <h1 className="text-2xl font-bold text-slate-900">דוחות ביקורת בטיחות</h1>
          <p className="text-sm text-slate-600">בחר לקוח כדי לצפות וליצור את הדוחות שלו</p>
        </header>

        <PwaInstallCard />

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              dir="rtl"
              className="pr-9 bg-white"
              placeholder="חיפוש לקוח"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button onClick={() => setShowForm((value) => !value)} className="gap-1 shrink-0">
            <Plus className="w-4 h-4" /> לקוח חדש
          </Button>
        </div>

        {showForm && (
          <section className="rounded-xl border-2 border-slate-900 bg-white p-4 space-y-3 shadow-sm">
            <h2 className="font-semibold">הוספת לקוח</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input dir="rtl" placeholder="שם הלקוח / החברה *" value={name} onChange={(e) => setName(e.target.value)} />
              <Input dir="rtl" placeholder="איש קשר" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <Input dir="rtl" type="tel" placeholder="טלפון" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input dir="rtl" type="email" placeholder="דוא״ל" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input dir="rtl" className="sm:col-span-2" placeholder="כתובת" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={onCreateClient} disabled={creating || !name.trim()}>
                {creating ? 'שומר…' : 'שמור לקוח'}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>ביטול</Button>
            </div>
          </section>
        )}

        {loading && <div className="text-slate-600">טוען…</div>}
        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">לקוחות</h2>
            <span className="text-xs text-slate-500">{clients.length} לקוחות</span>
          </div>
          {visibleClients.length === 0 && !loading && (
            <div className="rounded-xl border border-dashed bg-white p-8 text-center">
              <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <div className="font-medium">{search ? 'לא נמצאו לקוחות' : 'עדיין אין לקוחות'}</div>
              <div className="text-sm text-slate-500 mt-1">הוסף לקוח ראשון כדי ליצור עבורו דוחות.</div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleClients.map((client) => (
              <div key={client.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <Link to={`/safety/client/${client.id}`} className="block p-4 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{client.name}</h3>
                      {client.contactName && <div className="text-sm text-slate-500">{client.contactName}</div>}
                    </div>
                    <span className="rounded-full bg-slate-900 text-white text-xs px-2.5 py-1 shrink-0">
                      {reportCount(client.id)} דוחות
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    {client.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{client.phone}</div>}
                    {client.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{client.email}</div>}
                    {client.address && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{client.address}</div>}
                  </div>
                </Link>
                <div className="border-t px-3 py-2 flex justify-between items-center">
                  <Button asChild size="sm">
                    <Link to={`/safety/client/${client.id}`}>פתח לקוח</Link>
                  </Button>
                  <Button size="icon" variant="ghost" className="text-slate-400 hover:text-red-600" onClick={() => void onDeleteClient(client)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <DataBackupCard onImported={() => void refresh()} />
      </div>
    </div>
  );
};

export default SafetyAuditIndex;
