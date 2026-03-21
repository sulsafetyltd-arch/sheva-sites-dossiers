import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, FileBarChart, Phone, Droplets, Shield, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getDossier } from '@/lib/dossier-store';
import { validateDossier, readinessLabels } from '@/lib/validation-engine';
import { sectionConfigs } from '@/data/section-config';
import { Dossier } from '@/types/dossier';

type ReportType = 'summary' | 'gap' | 'contacts' | 'systems' | 'readiness';

const reportTabs: { id: ReportType; label: string; icon: any }[] = [
  { id: 'summary', label: 'סיכום עמוד אחד', icon: FileBarChart },
  { id: 'gap', label: 'דוח פערים', icon: AlertTriangle },
  { id: 'contacts', label: 'אנשי קשר', icon: Phone },
  { id: 'systems', label: 'מערכות כיבוי', icon: Droplets },
  { id: 'readiness', label: 'ציון מוכנות', icon: Shield },
];

const DossierReports = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [activeReport, setActiveReport] = useState<ReportType>('summary');

  useEffect(() => {
    if (id) {
      const d = getDossier(id);
      if (d) setDossier(d);
      else navigate('/');
    }
  }, [id, navigate]);

  const report = useMemo(() => dossier ? validateDossier(dossier) : null, [dossier]);

  if (!dossier || !report) return null;

  const cover = dossier.data.cover ?? {};
  const general = dossier.data.generalDetails ?? {};
  const contacts = Array.isArray(dossier.data.contacts) ? dossier.data.contacts : [];
  const risks = Array.isArray(dossier.data.risks) ? dossier.data.risks : [];
  const readiness = readinessLabels[report.readinessLevel];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-20 no-print">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/editor/${dossier.id}`)}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <h1 className="font-bold">דוחות — {dossier.name}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Download className="w-4 h-4" />
            הדפסה
          </Button>
        </div>
      </header>

      <div className="container max-w-5xl py-6">
        {/* Report tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-print">
          {reportTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                  activeReport === tab.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Summary report */}
        {activeReport === 'summary' && (
          <div className="bg-card border rounded-lg p-6 md:p-8 space-y-6 avoid-break">
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold" style={{ lineHeight: '1.3' }}>{cover.buildingName || dossier.name}</h2>
              <p className="text-muted-foreground">{cover.address}{cover.city ? `, ${cover.city}` : ''}</p>
              <Badge className="mt-2">{readiness.label} — {report.totalScore}%</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground block">סוג מבנה</span><span className="font-medium">{general.buildingType || '—'}</span></div>
              <div><span className="text-muted-foreground block">קומות</span><span className="font-medium">{general.floors || '—'}</span></div>
              <div><span className="text-muted-foreground block">שטח</span><span className="font-medium">{general.totalArea || '—'} מ"ר</span></div>
              <div><span className="text-muted-foreground block">תפוסה</span><span className="font-medium">{general.maxOccupancy || '—'}</span></div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">סיכום מוכנות לפי סעיפים</h3>
              <div className="space-y-1.5">
                {report.sections.map(s => (
                  <div key={s.sectionId} className="flex items-center gap-3">
                    <span className="text-sm w-40 truncate">{s.title}</span>
                    <Progress value={s.percent} className="h-2 flex-1" />
                    <span className="text-xs tabular-nums w-10 text-left">{s.percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            {risks.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">סיכונים עיקריים</h3>
                <div className="space-y-1">
                  {risks.slice(0, 5).map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className={`w-4 h-4 shrink-0 ${
                        r.riskScore === 'גבוה' || r.riskScore === 'קריטי' ? 'text-destructive' : 'text-warning'
                      }`} />
                      <span>{r.hazard}</span>
                      <span className="text-muted-foreground">({r.location})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gap report */}
        {activeReport === 'gap' && (
          <div className="bg-card border rounded-lg p-6 md:p-8 space-y-4 avoid-break">
            <h2 className="text-xl font-bold pb-2 border-b">דוח פערים — {dossier.name}</h2>
            <div className="flex gap-4 text-sm mb-4">
              <span className="text-destructive font-medium">{report.criticalCount} קריטי</span>
              <span className="text-warning font-medium">{report.warningCount} אזהרות</span>
            </div>
            {report.sections.filter(s => s.issues.length > 0).map(section => (
              <div key={section.sectionId} className="border-b pb-3 last:border-b-0">
                <h3 className="font-semibold text-sm mb-1">{section.title} ({section.percent}%)</h3>
                <ul className="space-y-1">
                  {section.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {issue.severity === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      )}
                      <span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {report.criticalCount === 0 && report.warningCount === 0 && (
              <p className="text-success text-center py-8 font-medium">✓ אין פערים — התיק מלא</p>
            )}
          </div>
        )}

        {/* Contacts report */}
        {activeReport === 'contacts' && (
          <div className="bg-card border rounded-lg p-6 md:p-8 avoid-break">
            <h2 className="text-xl font-bold pb-2 border-b mb-4">דוח אנשי קשר — {dossier.name}</h2>
            {contacts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">לא הוזנו אנשי קשר</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2 px-2 font-medium">שם</th>
                    <th className="text-right py-2 px-2 font-medium">תפקיד</th>
                    <th className="text-right py-2 px-2 font-medium">קטגוריה</th>
                    <th className="text-right py-2 px-2 font-medium">טלפון</th>
                    <th className="text-right py-2 px-2 font-medium">זמינות</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c: any, i: number) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="py-2 px-2 font-medium">{c.name || '—'}</td>
                      <td className="py-2 px-2">{c.role || '—'}</td>
                      <td className="py-2 px-2">{c.category || '—'}</td>
                      <td className="py-2 px-2 tabular-nums">{c.phone || '—'}</td>
                      <td className="py-2 px-2">{c.available || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Systems report */}
        {activeReport === 'systems' && (
          <div className="bg-card border rounded-lg p-6 md:p-8 space-y-4 avoid-break">
            <h2 className="text-xl font-bold pb-2 border-b">דוח מערכות כיבוי — {dossier.name}</h2>
            {['waterSystems', 'detection', 'electrical'].map(sectionId => {
              const section = sectionConfigs.find(s => s.id === sectionId);
              const data = dossier.data[sectionId];
              if (!section?.fields || !data) return null;
              return (
                <div key={sectionId} className="border-b pb-3 last:border-b-0">
                  <h3 className="font-semibold text-sm mb-2">{section.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {section.fields.map(field => {
                      const val = data[field.key];
                      if (!val) return null;
                      return (
                        <div key={field.key}>
                          <span className="text-xs text-muted-foreground">{field.label}</span>
                          <p className="text-sm whitespace-pre-wrap">{val}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Readiness report */}
        {activeReport === 'readiness' && (
          <div className="bg-card border rounded-lg p-6 md:p-8 space-y-6 avoid-break">
            <h2 className="text-xl font-bold pb-2 border-b">דוח מוכנות — {dossier.name}</h2>
            <div className="text-center py-4">
              <div className={`text-6xl font-bold tabular-nums ${readiness.color}`}>
                {report.totalScore}%
              </div>
              <p className="text-lg mt-2">רמת מוכנות: <span className={`font-bold ${readiness.color}`}>{readiness.label}</span></p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-destructive/10">
                <div className="text-2xl font-bold text-destructive tabular-nums">{report.criticalCount}</div>
                <p className="text-xs text-muted-foreground">ממצאים קריטיים</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10">
                <div className="text-2xl font-bold text-warning tabular-nums">{report.warningCount}</div>
                <p className="text-xs text-muted-foreground">אזהרות</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10">
                <div className="text-2xl font-bold text-success tabular-nums">
                  {report.sections.filter(s => s.percent === 100).length}
                </div>
                <p className="text-xs text-muted-foreground">סעיפים מושלמים</p>
              </div>
            </div>
            <div className="space-y-2">
              {report.sections.map(s => (
                <div key={s.sectionId} className="flex items-center gap-3">
                  <span className="text-sm w-40 truncate">{s.title}</span>
                  <Progress value={s.percent} className="h-2.5 flex-1" />
                  <span className={`text-xs tabular-nums w-10 text-left font-medium ${
                    s.percent === 100 ? 'text-success' : s.percent >= 50 ? '' : 'text-destructive'
                  }`}>{s.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DossierReports;
