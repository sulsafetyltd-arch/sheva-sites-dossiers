import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDossier } from '@/lib/dossier-store';
import { sectionConfigs } from '@/data/section-config';
import { Dossier, SectionConfig } from '@/types/dossier';

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
      const d = getDossier(id);
      if (d) setDossier(d);
      else navigate('/');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
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

      {/* Printable content */}
      <div className="container max-w-4xl py-8 space-y-0">
        {/* Cover page */}
        <div className="bg-card border rounded-lg p-8 md:p-12 text-center mb-8 page-break avoid-break shadow-sm">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Flame className="w-8 h-8 text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-2">תיק שטח לכיבוי אש ובטיחות אש</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight" style={{ lineHeight: '1.3' }}>
            {cover.buildingName || dossier.name}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {cover.address}{cover.city ? `, ${cover.city}` : ''}
          </p>
          <div className="border-t pt-6 mt-6 grid grid-cols-2 gap-4 text-sm max-w-md mx-auto text-right">
            {cover.organization && <div><span className="text-muted-foreground">ארגון:</span> <span className="font-medium">{cover.organization}</span></div>}
            {cover.preparedBy && <div><span className="text-muted-foreground">הוכן ע"י:</span> <span className="font-medium">{cover.preparedBy}</span></div>}
            {cover.preparedDate && <div><span className="text-muted-foreground">תאריך:</span> <span className="font-medium">{cover.preparedDate}</span></div>}
            {cover.version && <div><span className="text-muted-foreground">גרסה:</span> <span className="font-medium">{cover.version}</span></div>}
            {cover.approvedBy && <div><span className="text-muted-foreground">אושר ע"י:</span> <span className="font-medium">{cover.approvedBy}</span></div>}
          </div>
          <p className="text-xs text-muted-foreground mt-8">
            מסמך פנימי לצרכי תכנון בטיחות אש בלבד. אינו מהווה מסמך רשמי של רשות כיבוי אש.
          </p>
        </div>

        {/* Table of contents */}
        <div className="bg-card border rounded-lg p-8 mb-8 page-break avoid-break shadow-sm">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b">תוכן עניינים</h2>
          <ol className="space-y-2">
            {sectionsWithContent.map((section, i) => (
              <li key={section.id} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-muted-foreground w-6">{sectionNumber(i)}</span>
                <span>{section.title}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Sections */}
        {sectionsWithContent.map((section, idx) => {
          const data = dossier.data[section.id];
          const photos = dossier.data[`${section.id}_photos`] as any[] | undefined;

          return (
            <div key={section.id} className="bg-card border rounded-lg p-6 md:p-8 mb-4 page-break avoid-break shadow-sm">
              <h2 className="text-lg font-bold mb-4 pb-2 border-b flex items-center gap-2">
                <span className="text-primary font-mono text-sm">{sectionNumber(idx)}</span>
                {section.title}
              </h2>

              {/* Fields section */}
              {section.fields && !Array.isArray(data) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {section.fields.map(field => {
                    const val = data?.[field.key];
                    if (!val) return null;
                    return (
                      <div key={field.key} className={`${field.fullWidth ? 'col-span-full' : ''}`}>
                        <dt className="text-xs text-muted-foreground mb-0.5">{field.label}</dt>
                        <dd className="text-sm whitespace-pre-wrap">{renderFieldValue(section, val, field.key)}</dd>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Repeatable section */}
              {section.repeatable && Array.isArray(data) && data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="border-b py-2 px-2 text-right font-medium text-muted-foreground w-8">#</th>
                        {section.repeatable.columns.map(col => (
                          <th key={col.key} className="border-b py-2 px-2 text-right font-medium text-muted-foreground">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row: any, i: number) => (
                        <tr key={row.id || i}>
                          <td className="border-b py-2 px-2 text-muted-foreground">{i + 1}</td>
                          {section.repeatable!.columns.map(col => {
                            const cellVal = row[col.key] || '—';
                            let cellClass = 'border-b py-2 px-2';
                            if (section.id === 'risks' && col.key === 'riskScore') {
                              if (cellVal === 'גבוה' || cellVal === 'קריטי') cellClass += ' text-destructive font-medium';
                              else if (cellVal === 'בינוני') cellClass += ' text-warning font-medium';
                              else if (cellVal === 'נמוך') cellClass += ' text-success font-medium';
                            }
                            return (
                              <td key={col.key} className={cellClass}>
                                {cellVal}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Section photos */}
              {photos && photos.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-3">תמונות — {section.title}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((photo: any) => (
                      <div key={photo.id} className="space-y-1">
                        <img
                          src={photo.dataUrl}
                          alt={photo.caption || section.title}
                          className="w-full rounded border object-cover"
                          style={{ maxHeight: 200 }}
                        />
                        {photo.caption && (
                          <p className="text-xs text-muted-foreground text-center">{photo.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Signatures */}
        {dossier.data.signatures && Object.keys(dossier.data.signatures).length > 0 && (
          <div className="bg-card border rounded-lg p-6 md:p-8 mb-4 page-break avoid-break shadow-sm">
            <h2 className="text-lg font-bold mb-4 pb-2 border-b">חתימות</h2>
            <div className="grid grid-cols-2 gap-6">
              {[
                { key: 'preparer', label: 'מכין התיק' },
                { key: 'checker', label: 'בודק' },
                { key: 'approver', label: 'מאשר' },
                { key: 'client', label: 'לקוח' },
              ].map(role => {
                const sig = dossier.data.signatures[role.key];
                if (!sig) return null;
                return (
                  <div key={role.key} className="border rounded p-4 space-y-2">
                    <p className="font-medium text-sm">{role.label}</p>
                    {sig.signatureDataUrl && (
                      <img src={sig.signatureDataUrl} alt={`חתימת ${role.label}`} className="max-h-16 mx-auto" />
                    )}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{sig.name}</span>
                      <span>{sig.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer disclaimer */}
        <div className="text-center text-xs text-muted-foreground py-8 print-only">
          <p>תיק שטח כיבוי אש — מסמך פנימי לצרכי תכנון בלבד</p>
          <p>{cover.buildingName || dossier.name} · {cover.city} · גרסה {cover.version || '1.0'}</p>
        </div>
      </div>
    </div>
  );
};

export default DossierPreview;
