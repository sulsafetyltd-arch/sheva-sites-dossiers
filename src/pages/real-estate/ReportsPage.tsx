import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllDeals } from '@/lib/real-estate-store';
import {
  DEAL_TYPE_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_TYPE_LABEL,
  formatMoney,
  formatShortDate,
} from '@/lib/real-estate-utils';

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function csvDownload(filename: string, rows: string[][]): void {
  const body = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n');
  // BOM so Excel opens Hebrew correctly.
  const blob = new Blob(['\ufeff', body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const ReportsPage = () => {
  const deals = useMemo(() => getAllDeals(), []);
  const years = useMemo(() => {
    const set = new Set<string>();
    for (const deal of deals) {
      for (const p of deal.payments) {
        const d = p.paidDate || p.dueDate;
        if (d) set.add(d.slice(0, 4));
      }
    }
    set.add(String(new Date().getFullYear()));
    return [...set].sort().reverse();
  }, [deals]);
  const [year, setYear] = useState(() => String(new Date().getFullYear()));

  const feeRows = useMemo(() => {
    const rows: Array<{
      fileNumber: string;
      dealTitle: string;
      dealType: string;
      title: string;
      amount: number;
      status: string;
      date: string;
      paid: boolean;
    }> = [];
    for (const deal of deals) {
      for (const p of deal.payments) {
        if (p.type !== 'fees') continue;
        const date = p.paidDate || p.dueDate;
        if (!date?.startsWith(year)) continue;
        rows.push({
          fileNumber: deal.fileNumber,
          dealTitle: deal.title,
          dealType: DEAL_TYPE_LABEL[deal.type],
          title: p.title || PAYMENT_TYPE_LABEL[p.type],
          amount: p.amount || 0,
          status: PAYMENT_STATUS_LABEL[p.status],
          date,
          paid: p.status === 'paid',
        });
      }
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [deals, year]);

  const monthly = useMemo(() => {
    const paid = Array.from({ length: 12 }, () => 0);
    const expected = Array.from({ length: 12 }, () => 0);
    for (const row of feeRows) {
      const m = Number(row.date.slice(5, 7)) - 1;
      if (m < 0 || m > 11) continue;
      if (row.paid) paid[m] += row.amount;
      else expected[m] += row.amount;
    }
    return MONTHS.map((label, i) => ({ label, paid: paid[i], expected: expected[i] }));
  }, [feeRows]);

  const totalPaid = feeRows.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0);
  const totalExpected = feeRows.filter((r) => !r.paid).reduce((s, r) => s + r.amount, 0);
  const vat = Math.round(totalPaid * 0.18);

  const exportCsv = () => {
    csvDownload(`fees-${year}.csv`, [
      ['מספר תיק', 'שם תיק', 'סוג עסקה', 'תיאור', 'סכום', 'סטטוס', 'תאריך'],
      ...feeRows.map((r) => [r.fileNumber, r.dealTitle, r.dealType, r.title, String(r.amount), r.status, formatShortDate(r.date)]),
      [],
      ['סה"כ שולם', String(totalPaid)],
      ['סה"כ צפוי (טרם שולם)', String(totalExpected)],
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          דוח שכר טרחה שנתי — להעברה לרואה החשבון. מבוסס על תשלומים מסוג «שכ"ט» בכל התיקים.
        </p>
        <div className="flex gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={feeRows.length === 0}>
            <Download className="w-4 h-4" />
            ייצוא ל-Excel (CSV)
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="re-card p-4">
          <p className="text-sm text-muted-foreground">שכ"ט שהתקבל ב-{year}</p>
          <p className="text-2xl font-bold tabular-nums">{formatMoney(totalPaid)}</p>
        </div>
        <div className="re-card p-4">
          <p className="text-sm text-muted-foreground">שכ"ט צפוי (טרם שולם)</p>
          <p className="text-2xl font-bold tabular-nums">{formatMoney(totalExpected)}</p>
        </div>
        <div className="re-card p-4">
          <p className="text-sm text-muted-foreground">מע"מ משוער על ההכנסות (18%)</p>
          <p className="text-2xl font-bold tabular-nums">{formatMoney(vat)}</p>
        </div>
      </div>

      <section className="re-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">פירוט חודשי {year}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="re-table text-right">
                <th className="px-4 py-2.5">חודש</th>
                <th className="px-4 py-2.5">התקבל</th>
                <th className="px-4 py-2.5">צפוי</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.label} className="border-t">
                  <td className="px-4 py-2">{m.label}</td>
                  <td className="px-4 py-2 tabular-nums">{m.paid ? formatMoney(m.paid) : '—'}</td>
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">{m.expected ? formatMoney(m.expected) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="re-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">פירוט תשלומי שכ"ט ({feeRows.length})</h2>
        </div>
        {feeRows.length === 0 ? (
          <p className="px-5 py-12 text-center text-muted-foreground text-sm">
            אין תשלומי שכ"ט בשנת {year} — הוסיפו תשלום מסוג «שכ"ט» בתיקים
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="re-table text-right">
                  <th className="px-4 py-2.5">תיק</th>
                  <th className="px-4 py-2.5">תיאור</th>
                  <th className="px-4 py-2.5">תאריך</th>
                  <th className="px-4 py-2.5">סכום</th>
                  <th className="px-4 py-2.5">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {feeRows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">
                      <p className="font-medium">{r.dealTitle}</p>
                      <p className="text-xs text-muted-foreground">{r.fileNumber} · {r.dealType}</p>
                    </td>
                    <td className="px-4 py-2">{r.title}</td>
                    <td className="px-4 py-2 tabular-nums">{formatShortDate(r.date)}</td>
                    <td className="px-4 py-2 tabular-nums font-medium">{formatMoney(r.amount)}</td>
                    <td className="px-4 py-2">
                      <span className={r.paid ? 'text-success' : 'text-muted-foreground'}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ReportsPage;
