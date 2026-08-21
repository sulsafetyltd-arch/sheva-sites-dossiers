import { useMemo, useState } from 'react';
import { Calculator, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/real-estate/Field';
import { calcPurchaseTax } from '@/lib/purchase-tax';
import { estimateCapitalGains, lateInterest, linkedAmount } from '@/lib/calculators';
import { formatMoney } from '@/lib/real-estate-utils';

function num(value: string): number {
  const n = Number(value.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

const CalculatorsPage = () => {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        כלי עזר לחישובים נפוצים בעסקאות נדל"ן. כל התוצאות הן אומדן בלבד ואינן תחליף לשומה או לחוות דעת.
      </p>
      <div className="grid lg:grid-cols-2 gap-4">
        <PurchaseTaxCalc />
        <CapitalGainsCalc />
        <LinkageCalc />
        <LateInterestCalc />
      </div>
    </div>
  );
};

function CalcCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="re-card p-5 space-y-3">
      <h2 className="font-semibold flex items-center gap-2">
        <Calculator className="w-4 h-4 text-primary" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function PurchaseTaxCalc() {
  const [price, setPrice] = useState('');
  const [singleHome, setSingleHome] = useState(true);
  const result = useMemo(() => calcPurchaseTax(num(price), singleHome), [price, singleHome]);

  return (
    <CalcCard title="מס רכישה">
      <div className="grid grid-cols-2 gap-3">
        <Field label="שווי הרכישה (₪)">
          <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2,500,000" />
        </Field>
        <label className="flex items-center gap-2 text-sm self-end pb-2">
          <input type="checkbox" className="rounded border" checked={singleHome} onChange={(e) => setSingleHome(e.target.checked)} />
          דירה יחידה
        </label>
      </div>
      {num(price) > 0 && (
        <>
          <p className="text-lg">
            מס רכישה משוער: <strong className="tabular-nums">{formatMoney(result.total)}</strong>
          </p>
          <div className="text-xs text-muted-foreground space-y-0.5">
            {result.rows.map((row) => (
              <p key={`${row.from}-${row.rate}`} className="tabular-nums">
                {formatMoney(row.from)} — {row.to != null ? formatMoney(Math.min(row.to, num(price))) : formatMoney(num(price))} · {(row.rate * 100).toLocaleString('he-IL')}% = {formatMoney(row.tax)}
              </p>
            ))}
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">מדרגות 2025–2026 (רשות המסים)</p>
    </CalcCard>
  );
}

function CapitalGainsCalc() {
  const [purchase, setPurchase] = useState('');
  const [linkedPurchase, setLinkedPurchase] = useState('');
  const [sale, setSale] = useState('');
  const [expenses, setExpenses] = useState('');
  const result = useMemo(
    () =>
      estimateCapitalGains({
        purchasePrice: num(purchase),
        salePrice: num(sale),
        expenses: num(expenses),
        linkedPurchasePrice: num(linkedPurchase),
      }),
    [purchase, sale, expenses, linkedPurchase],
  );

  return (
    <CalcCard title="מס שבח (אומדן גס)">
      <div className="grid grid-cols-2 gap-3">
        <Field label="מחיר רכישה מקורי (₪)">
          <Input inputMode="numeric" value={purchase} onChange={(e) => setPurchase(e.target.value)} />
        </Field>
        <Field label="שווי רכישה מוצמד (₪, רשות)">
          <Input inputMode="numeric" value={linkedPurchase} onChange={(e) => setLinkedPurchase(e.target.value)} placeholder="אם ידוע" />
        </Field>
        <Field label="מחיר מכירה (₪)">
          <Input inputMode="numeric" value={sale} onChange={(e) => setSale(e.target.value)} />
        </Field>
        <Field label="הוצאות מוכרות (₪)">
          <Input inputMode="numeric" value={expenses} onChange={(e) => setExpenses(e.target.value)} placeholder="שיפוצים, מס רכישה, שכ״ט..." />
        </Field>
      </div>
      {num(sale) > 0 && (
        <div className="space-y-1 text-sm">
          <p>שבח ריאלי משוער: <strong className="tabular-nums">{formatMoney(result.realGain)}</strong></p>
          <p className="text-lg">
            מס שבח משוער (25%): <strong className="tabular-nums">{formatMoney(result.estimatedTax)}</strong>
          </p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        לא כולל פטור דירת מגורים יחידה, חישוב ליניארי מוטב לנכסים שנרכשו לפני 2014, פחת וניכויים נוספים —{' '}
        <a
          className="underline inline-flex items-center gap-0.5"
          href="https://www.gov.il/he/service/real-estate-tax-calculators"
          target="_blank"
          rel="noreferrer"
        >
          סימולטור רשות המסים
          <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </CalcCard>
  );
}

function LinkageCalc() {
  const [amount, setAmount] = useState('');
  const [baseIndex, setBaseIndex] = useState('');
  const [currentIndex, setCurrentIndex] = useState('');
  const result = linkedAmount(num(amount), num(baseIndex), num(currentIndex));

  return (
    <CalcCard title="הצמדה למדד">
      <div className="grid grid-cols-3 gap-3">
        <Field label="סכום בסיס (₪)">
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="מדד בסיס">
          <Input inputMode="decimal" value={baseIndex} onChange={(e) => setBaseIndex(e.target.value)} placeholder="למשל 108.6" />
        </Field>
        <Field label="מדד עדכני">
          <Input inputMode="decimal" value={currentIndex} onChange={(e) => setCurrentIndex(e.target.value)} placeholder="למשל 112.4" />
        </Field>
      </div>
      {result > 0 && (
        <p className="text-lg">
          סכום מוצמד: <strong className="tabular-nums">{formatMoney(result)}</strong>{' '}
          <span className="text-sm text-muted-foreground tabular-nums">
            ({num(currentIndex) >= num(baseIndex) ? '+' : ''}{formatMoney(result - num(amount))})
          </span>
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        מתאים למדד המחירים לצרכן ולמדד תשומות הבנייה —{' '}
        <a className="underline inline-flex items-center gap-0.5" href="https://www.cbs.gov.il/he/Pages/default.aspx" target="_blank" rel="noreferrer">
          ערכי המדד באתר הלמ"ס
          <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </CalcCard>
  );
}

function LateInterestCalc() {
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [days, setDays] = useState('');
  const result = lateInterest(num(amount), num(rate), num(days));

  return (
    <CalcCard title="ריבית פיגורים">
      <div className="grid grid-cols-3 gap-3">
        <Field label="סכום בפיגור (₪)">
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="ריבית שנתית (%)">
          <Input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="לפי החוזה" />
        </Field>
        <Field label="ימי פיגור">
          <Input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
      </div>
      {result > 0 && (
        <p className="text-lg">
          ריבית מצטברת: <strong className="tabular-nums">{formatMoney(result)}</strong>{' '}
          <span className="text-sm text-muted-foreground tabular-nums">(סה"כ לתשלום {formatMoney(num(amount) + result)})</span>
        </p>
      )}
      <p className="text-xs text-muted-foreground">חישוב ליניארי פשוט לפי השיעור החוזי — ללא ריבית דריבית</p>
    </CalcCard>
  );
}

export default CalculatorsPage;
