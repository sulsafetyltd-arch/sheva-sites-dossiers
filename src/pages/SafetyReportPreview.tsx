import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Download, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getDomain, SEVERITY_LABELS, SEVERITY_ORDER } from '@/data/safety-domains';
import { exportToPdf } from '@/lib/pdf-export';
import { getSafetyReport, saveSafetyReport } from '@/lib/safety-report-store';
import { SafetyReport, Severity } from '@/types/safety-report';

const severityClass: Record<Severity, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-600 text-white',
  medium: 'bg-amber-500 text-black',
  low: 'bg-slate-200 text-slate-700',
};

export default function SafetyReportPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    void getSafetyReport(id).then((r) => setReport(r ?? null));
  }, [id]);

  const findings = useMemo(() => {
    if (!report) return [];
    return report.detections
      .filter((d) => d.status !== 'rejected')
      .sort(
        (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
      );
  }, [report]);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) c[f.severity] += 1;
    return c;
  }, [findings]);

  const handlePdf = async () => {
    if (!printRef.current || !report) return;
    setExporting(true);
    try {
      await exportToPdf(
        printRef.current,
        `דוח-בטיחות-${report.siteName.replace(/\s+/g, '_')}.pdf`,
      );
      await saveSafetyReport({ ...report, status: 'exported' });
      toast.success('הדוח יוצא ל-PDF');
    } catch (err) {
      console.error(err);
      toast.error('יצוא PDF נכשל');
    } finally {
      setExporting(false);
    }
  };

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const domain = getDomain(report.domain);
  const dateStr = new Date(report.updatedAt).toLocaleString('he-IL');

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="container flex flex-wrap items-center justify-between gap-2 py-3">
          <Button variant="ghost" size="sm" asChild className="gap-1">
            <Link to={`/safety/${report.id}`}>
              <ArrowRight className="h-4 w-4" />
              חזרה לבדיקה
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              הדפסה
            </Button>
            <Button size="sm" className="gap-1" disabled={exporting} onClick={() => void handlePdf()}>
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div
          ref={printRef}
          className="mx-auto max-w-3xl space-y-6 rounded-none bg-white p-4 text-foreground sm:p-8 print:p-0"
        >
          <header className="border-b border-primary/30 pb-4">
            <div className="mb-2 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-primary">
                  סול בטיחות · דוח ליקויי בטיחות
                </p>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{report.siteName}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{report.title}</p>
              </div>
              <div className="text-left text-xs text-muted-foreground">
                <div>{dateStr}</div>
                <div>{domain.label}</div>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">כתובת</dt>
                <dd className="font-medium">{report.address || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">מפקח</dt>
                <dd className="font-medium">{report.inspectorName || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ממצאים</dt>
                <dd className="font-medium">{findings.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ניתוח</dt>
                <dd className="font-medium">
                  {report.analysisMode === 'vision-api'
                    ? 'AI Vision'
                    : report.analysisMode === 'local-ai'
                      ? 'AI תחומי'
                      : 'ידני'}
                </dd>
              </div>
            </dl>
          </header>

          <section>
            <h2 className="mb-3 text-lg font-bold">סיכום חומרה</h2>
            <div className="grid grid-cols-4 gap-2">
              {SEVERITY_ORDER.map((s) => (
                <div key={s} className="rounded-lg border p-3 text-center">
                  <div className="text-xl font-bold tabular-nums">{counts[s]}</div>
                  <div className="text-xs text-muted-foreground">{SEVERITY_LABELS[s]}</div>
                </div>
              ))}
            </div>
          </section>

          {report.photos.length > 0 && (
            <section className="avoid-break">
              <h2 className="mb-3 text-lg font-bold">תיעוד מצולם</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {report.photos.map((p, i) => (
                  <figure key={p.id} className="overflow-hidden rounded-lg border">
                    <img
                      src={p.previewUrl || p.url}
                      alt={`תיעוד ${i + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                    <figcaption className="px-2 py-1 text-[11px] text-muted-foreground">
                      תמונה {i + 1}
                      {p.caption ? ` · ${p.caption}` : ''}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-lg font-bold">פירוט ליקויים</h2>
            {findings.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין ממצאים לדיווח.</p>
            ) : (
              <ol className="space-y-4">
                {findings.map((f, idx) => (
                  <li key={f.id} className="avoid-break rounded-lg border p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground">{idx + 1}.</span>
                      <Badge className={severityClass[f.severity]}>
                        {SEVERITY_LABELS[f.severity]}
                      </Badge>
                      <Badge variant="outline">{f.category}</Badge>
                      {f.source === 'ai' && (
                        <Badge variant="secondary">AI {Math.round(f.confidence * 100)}%</Badge>
                      )}
                      {f.source === 'catalog' && <Badge variant="secondary">מרשימה</Badge>}
                      {f.source === 'manual' && <Badge variant="secondary">ידני</Badge>}
                      {f.status === 'fixed' && <Badge className="bg-success text-white">תוקן</Badge>}
                    </div>
                    <h3 className="text-base font-semibold">{f.title}</h3>
                    {f.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                    )}
                    {f.recommendation && (
                      <p className="mt-2 text-sm">
                        <strong>המלצה: </strong>
                        {f.recommendation}
                      </p>
                    )}
                    {f.regulationHint && (
                      <p className="mt-1 text-xs text-muted-foreground">{f.regulationHint}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {report.notes.trim() && (
            <section className="avoid-break">
              <h2 className="mb-2 text-lg font-bold">הערות שטח</h2>
              <p className="whitespace-pre-wrap text-sm">{report.notes}</p>
            </section>
          )}

          <footer className="border-t pt-4 text-xs text-muted-foreground">
            <p>
              דוח זה הופק באמצעות מערכת דוחות ליקויי בטיחות. ממצאי AI מיועדים לסיוע למפקח ודורשים
              אישור מקצועי בשטח. אין להסתמך עליהם כתחליף לביקורת בטיחות מלאה.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
