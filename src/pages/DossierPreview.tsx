import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, Flame, Shield, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDossier } from '@/lib/dossier-store';
import { sectionConfigs } from '@/data/section-config';
import { Dossier, SectionConfig } from '@/types/dossier';
import { exportToPdf } from '@/lib/pdf-export';
import { toast } from 'sonner';

const buildingTypeLabels: Record<string, string> = {
  residential: 'מגורים',
  commercial: 'מסחרי',
  industrial: 'תעשייתי',
  public: 'ציבורי',
  mixed: 'שימוש מעורב',
  office: 'משרדים',
};

const DossierPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<Dossier | null>(null);

  useEffect(() => {
    if (id) {
      getDossier(id).then(d => {
        if (d) setDossier(d);
        else navigate('/');
      });
    }
  }, [id, navigate]);

  if (!dossier) return null;

  const cover = dossier.data.cover ?? {};
  const sectionNumber = (i: number) => (i + 1).toString();

  const renderFieldValue = (section: SectionConfig, value: any, key: string) => {
    if (key === 'buildingType' && buildingTypeLabels[value]) return buildingTypeLabels[value];
    return value || '—';
  };

  const sectionsWithContent = sectionConfigs.filter(s => {
    const data = dossier.data[s.id];
    if (!data) return false;
    if (Array.isArray(data)) return data.length > 0;
    return Object.values(data).some(v => v !== '');
  });

  const projectTitle = cover.buildingName || dossier.name;
  const versionLabel = cover.version || '1.0';

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Top bar — screen only */}
      <header className="border-b bg-card sticky top-0 z-20 no-print">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/editor/${dossier.id}`)}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <h1 className="font-bold">תצוגה מקדימה</h1>
          </div>
          <Button onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" />
            הדפסה / PDF
          </Button>
        </div>
      </header>

      {/* Fixed running header for print */}
      <div className="print-running-header">
        <div className="flex justify-between items-center">
          <span>{projectTitle}</span>
          <span>גרסה {versionLabel} · תיק שטח כיבוי אש</span>
        </div>
      </div>

      {/* Fixed running footer for print */}
      <div className="print-running-footer">
        מסמך פנימי לצרכי תכנון בטיחות אש — {cover.organization || ''}
      </div>

      {/* Printable content */}
      <div className="container max-w-4xl py-8 space-y-0">

        {/* ═══ COVER PAGE ═══ */}
        <div className="print-cover bg-card border rounded-lg p-8 md:p-16 text-center mb-8 shadow-sm">
          {/* Top decorative bar */}
          <div className="w-full h-1.5 bg-primary rounded-full mb-12 print:mb-16" />

          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Flame className="w-10 h-10 text-primary" />
            </div>
          </div>

          <p className="text-sm tracking-widest uppercase text-muted-foreground mb-4">תיק שטח לכיבוי אש ובטיחות אש</p>

          <h1 className="text-3xl md:text-5xl font-bold mb-3" style={{ lineHeight: '1.25', letterSpacing: '-0.01em' }}>
            {projectTitle}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10">
            {cover.address}{cover.city ? `, ${cover.city}` : ''}
          </p>

          {/* Metadata grid */}
          <div className="border-t border-b py-6 my-8 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 text-sm max-w-lg mx-auto text-right">
            {cover.organization && (
              <div className="col-span-full text-center mb-2">
                <span className="text-xs text-muted-foreground block">ארגון</span>
                <span className="font-semibold text-base">{cover.organization}</span>
              </div>
            )}
            {cover.preparedBy && (
              <div>
                <span className="text-xs text-muted-foreground block">הוכן על ידי</span>
                <span className="font-medium">{cover.preparedBy}</span>
              </div>
            )}
            {cover.approvedBy && (
              <div>
                <span className="text-xs text-muted-foreground block">אושר על ידי</span>
                <span className="font-medium">{cover.approvedBy}</span>
              </div>
            )}
            {cover.preparedDate && (
              <div>
                <span className="text-xs text-muted-foreground block">תאריך</span>
                <span className="font-medium">{cover.preparedDate}</span>
              </div>
            )}
            {cover.version && (
              <div>
                <span className="text-xs text-muted-foreground block">גרסה</span>
                <span className="font-medium">{cover.version}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-8">
            <Shield className="w-3.5 h-3.5" />
            <span>מסמך פנימי לצרכי תכנון בטיחות אש בלבד — אינו מהווה מסמך רשמי של רשות כיבוי אש</span>
          </div>

          {/* Bottom decorative bar */}
          <div className="w-full h-1 bg-primary/30 rounded-full mt-12 print:mt-16" />
        </div>

        {/* ═══ TABLE OF CONTENTS ═══ */}
        <div className="bg-card border rounded-lg p-8 mb-8 page-break avoid-break shadow-sm print-section">
          <h2 className="text-xl font-bold mb-6 pb-3 border-b-2 border-primary print-section-header">תוכן עניינים</h2>
          <ol className="space-y-1">
            {sectionsWithContent.map((section, i) => (
              <li key={section.id} className="flex items-baseline gap-3 py-1.5 border-b border-dotted border-muted">
                <span className="font-mono text-primary font-bold w-6 text-left tabular-nums">{sectionNumber(i)}</span>
                <span className="flex-1 font-medium text-sm">{section.title}</span>
                {section.description && (
                  <span className="text-xs text-muted-foreground hidden md:inline max-w-[200px] truncate">{section.description}</span>
                )}
              </li>
            ))}
          </ol>
          {/* Appendices reference */}
          {dossier.data.signatures && Object.keys(dossier.data.signatures).length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-sm text-muted-foreground">נספח א׳ — חתימות ואישורים</p>
            </div>
          )}
        </div>

        {/* ═══ SECTIONS ═══ */}
        {sectionsWithContent.map((section, idx) => {
          const data = dossier.data[section.id];
          const photos = dossier.data[`${section.id}_photos`] as any[] | undefined;

          return (
            <div key={section.id} className="bg-card border rounded-lg p-6 md:p-8 mb-6 page-break avoid-break shadow-sm print-section">
              {/* Section header with number + red underline */}
              <div className="print-section-header mb-6">
                <div className="flex items-baseline gap-3 pb-3 border-b-2 border-primary">
                  <span className="text-primary font-mono font-bold text-lg tabular-nums">{sectionNumber(idx)}</span>
                  <h2 className="text-lg font-bold flex-1">{section.title}</h2>
                </div>
                {section.description && (
                  <p className="text-xs text-muted-foreground mt-2">{section.description}</p>
                )}
              </div>

              {/* Fields */}
              {section.fields && !Array.isArray(data) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {section.fields.map(field => {
                    const val = data?.[field.key];
                    if (!val) return null;
                    return (
                      <div key={field.key} className={`${field.fullWidth ? 'col-span-full' : ''} py-1.5`}>
                        <dt className="text-xs text-muted-foreground mb-0.5 font-medium">{field.label}</dt>
                        <dd className="text-sm whitespace-pre-wrap leading-relaxed">{renderFieldValue(section, val, field.key)}</dd>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Repeatable table */}
              {section.repeatable && Array.isArray(data) && data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-muted">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border border-muted py-2 px-3 text-right font-semibold text-xs text-muted-foreground w-8">#</th>
                        {section.repeatable.columns.map(col => (
                          <th key={col.key} className="border border-muted py-2 px-3 text-right font-semibold text-xs text-muted-foreground">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row: any, i: number) => (
                        <tr key={row.id || i} className={i % 2 === 1 ? 'bg-muted/20' : ''}>
                          <td className="border border-muted py-2 px-3 text-muted-foreground tabular-nums text-center">{i + 1}</td>
                          {section.repeatable!.columns.map(col => {
                            const cellVal = row[col.key] || '—';
                            let cellClass = 'border border-muted py-2 px-3';
                            if (section.id === 'risks' && col.key === 'riskScore') {
                              if (cellVal === 'גבוה' || cellVal === 'קריטי') cellClass += ' text-destructive font-bold bg-destructive/5';
                              else if (cellVal === 'בינוני') cellClass += ' text-warning font-semibold bg-warning/5';
                              else if (cellVal === 'נמוך') cellClass += ' text-success font-medium';
                            }
                            return <td key={col.key} className={cellClass}>{cellVal}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Photos */}
              {photos && photos.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-3">תמונות — {section.title}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print-photo-grid">
                    {photos.map((photo: any, pi: number) => (
                      <figure key={photo.id} className="space-y-1 avoid-break">
                        <img
                          src={photo.dataUrl}
                          alt={photo.caption || section.title}
                          className="w-full rounded border object-cover"
                          style={{ maxHeight: 200 }}
                        />
                        <figcaption className="text-xs text-muted-foreground text-center">
                          {photo.caption || `תמונה ${pi + 1}`}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ═══ APPENDIX: SIGNATURES ═══ */}
        {dossier.data.signatures && Object.keys(dossier.data.signatures).length > 0 && (
          <div className="bg-card border rounded-lg p-6 md:p-8 mb-6 page-break avoid-break shadow-sm print-section">
            <div className="print-section-header mb-6">
              <div className="flex items-baseline gap-3 pb-3 border-b-2 border-primary">
                <span className="text-primary font-mono font-bold text-lg">נספח</span>
                <h2 className="text-lg font-bold flex-1">חתימות ואישורים</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 print-sig-grid">
              {[
                { key: 'preparer', label: 'מכין התיק' },
                { key: 'checker', label: 'בודק' },
                { key: 'approver', label: 'מאשר' },
                { key: 'client', label: 'לקוח' },
              ].map(role => {
                const sig = dossier.data.signatures?.[role.key];
                if (!sig) return null;
                return (
                  <div key={role.key} className="border rounded-lg p-4 space-y-3 avoid-break">
                    <p className="font-semibold text-sm border-b pb-2">{role.label}</p>
                    {sig.signatureDataUrl && (
                      <div className="bg-white border rounded p-3">
                        <img src={sig.signatureDataUrl} alt={`חתימת ${role.label}`} className="max-h-16 mx-auto" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block">שם</span>
                        <span className="font-medium">{sig.name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">תאריך</span>
                        <span className="font-medium">{sig.date || '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ BACK COVER / DISCLAIMER ═══ */}
        <div className="text-center py-12 page-break print-only">
          <div className="w-12 h-0.5 bg-primary mx-auto mb-6" />
          <p className="text-sm font-medium mb-1">{projectTitle}</p>
          <p className="text-xs text-muted-foreground mb-1">
            {cover.address}{cover.city ? `, ${cover.city}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            גרסה {versionLabel} · {cover.preparedDate || ''} · {cover.organization || ''}
          </p>
          <div className="w-12 h-0.5 bg-primary mx-auto mt-6" />
          <p className="text-[10px] text-muted-foreground mt-4">
            תיק שטח כיבוי אש — מסמך פנימי לצרכי תכנון בטיחות אש בלבד
          </p>
        </div>
      </div>
    </div>
  );
};

export default DossierPreview;
