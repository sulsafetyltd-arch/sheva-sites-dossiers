import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  FileOutput,
  Loader2,
  MapPin,
  Save,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SafetyPhotoCapture } from '@/components/safety/SafetyPhotoCapture';
import { DetectionList, ManualDefectForm } from '@/components/safety/DetectionList';
import { DefectCatalogPicker } from '@/components/safety/DefectCatalogPicker';
import { getDomain } from '@/data/safety-domains';
import { analyzeSafetyPhotos } from '@/lib/safety-ai';
import { getSafetyReport, saveSafetyReport } from '@/lib/safety-report-store';
import { AiDetection, SafetyReport } from '@/types/safety-report';

export default function SafetyInspectorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('capture');

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const data = await getSafetyReport(id);
      setReport(data ?? null);
      setLoading(false);
    })();
  }, [id]);

  const persist = useCallback(async (next: SafetyReport) => {
    setSaving(true);
    try {
      await saveSafetyReport(next);
      setReport(next);
    } finally {
      setSaving(false);
    }
  }, []);

  const patch = useCallback(
    (partial: Partial<SafetyReport>) => {
      if (!report) return;
      const next = { ...report, ...partial };
      setReport(next);
      void persist(next);
    },
    [persist, report],
  );

  const runAnalysis = async () => {
    if (!report) return;
    if (report.photos.length === 0) {
      toast.error('צלמו לפחות תמונה אחת לפני הזיהוי');
      return;
    }
    setAnalyzing(true);
    const snapshot = report;
    // Update UI immediately – never block analysis on storage
    setReport({ ...snapshot, status: 'analyzing' });

    try {
      const result = await analyzeSafetyPhotos({
        domain: snapshot.domain,
        photos: snapshot.photos,
        siteName: snapshot.siteName,
        notes: snapshot.notes,
      });

      if (!result.detections.length) {
        toast.error('לא זוהו ליקויים. בחרו מרשימה או הוסיפו הערה וחזרו על הניתוח.');
        setReport({ ...snapshot, status: 'draft' });
        return;
      }

      const keptManual = snapshot.detections.filter(
        (d) => d.source === 'manual' || d.source === 'catalog',
      );
      const aiTitles = new Set(result.detections.map((d) => d.title));
      const keptWithoutOverlap = keptManual.filter((d) => !aiTitles.has(d.title));
      const next: SafetyReport = {
        ...snapshot,
        detections: [...keptWithoutOverlap, ...result.detections],
        status: 'ready',
        analyzedAt: new Date().toISOString(),
        analysisMode: result.mode,
      };

      setReport(next);
      setTab('findings');

      try {
        await saveSafetyReport(next);
      } catch (saveErr) {
        console.warn('Save after analysis failed:', saveErr);
        toast.message('הממצאים מוצגים – השמירה לענן/מקומית נכשלה זמנית');
      }

      toast.success(`זוהו ${result.detections.length} ליקויים`);
      if (result.warning) toast.message(result.warning);
    } catch (err) {
      console.error(err);
      toast.error('ניתוח נכשל. נסו שוב או בחרו ליקויים מהרשימה.');
      setReport({ ...snapshot, status: 'draft' });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container space-y-4 py-16 text-center">
        <p>הדוח לא נמצא</p>
        <Button asChild>
          <Link to="/safety">חזרה לרשימה</Link>
        </Button>
      </div>
    );
  }

  const domain = getDomain(report.domain);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="container flex items-center justify-between gap-2 py-3">
          <Button variant="ghost" size="sm" asChild className="gap-1 px-2">
            <Link to="/safety">
              <ArrowRight className="h-4 w-4" />
              דוחות
            </Link>
          </Button>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-base font-bold">{report.siteName}</h1>
            <p className="text-xs text-muted-foreground">{domain.label}</p>
          </div>
          <div className="flex items-center gap-1">
            {saving ? (
              <Save className="h-4 w-4 animate-pulse text-muted-foreground" />
            ) : (
              <Badge variant="outline" className="text-[10px]">
                נשמר
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container space-y-4 py-4">
        <section className="grid gap-2 sm:grid-cols-2">
          <div className="relative">
            <MapPin className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder="כתובת / מיקום בשטח"
              value={report.address}
              onChange={(e) => patch({ address: e.target.value })}
            />
          </div>
          <div className="relative">
            <User className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder="שם המפקח"
              value={report.inspectorName}
              onChange={(e) => patch({ inspectorName: e.target.value })}
            />
          </div>
        </section>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="capture">צילום</TabsTrigger>
            <TabsTrigger value="findings">
              ממצאים
              {report.detections.length > 0 && (
                <span className="mr-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                  {report.detections.filter((d) => d.status !== 'rejected').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes">הערות</TabsTrigger>
          </TabsList>

          <TabsContent value="capture" className="mt-4 space-y-4">
            <SafetyPhotoCapture
              photos={report.photos}
              reportId={report.id}
              analyzing={analyzing}
              onChange={(photos) => patch({ photos })}
              onAnalyze={() => void runAnalysis()}
            />
            {report.analysisMode && (
              <p className="text-center text-xs text-muted-foreground">
                מצב ניתוח אחרון:{' '}
                {report.analysisMode === 'vision-api'
                  ? 'OpenAI Vision (ענן)'
                  : 'ניתוח תמונה במכשיר לפי תחום'}
              </p>
            )}
            <p className="text-center text-xs text-muted-foreground">
              טיפ: הוסיפו הערת שטח קצרה לפני הזיהוי לדיוק גבוה יותר. אם הניתוח נתקע — רעננו ונסו שוב.
            </p>
          </TabsContent>

          <TabsContent value="findings" className="mt-4 space-y-4">
            <DefectCatalogPicker
              domain={report.domain}
              existingCatalogIds={report.detections
                .map((d) => d.catalogId)
                .filter((id): id is string => Boolean(id))}
              onAdd={(picked) =>
                patch({
                  detections: [...report.detections, ...picked],
                  status: 'ready',
                })
              }
            />
            <DetectionList
              detections={report.detections}
              onChange={(detections) =>
                patch({
                  detections,
                  status: detections.length ? 'ready' : report.status,
                })
              }
            />
            <ManualDefectForm
              onAdd={(detection: AiDetection) =>
                patch({
                  detections: [...report.detections, detection],
                  status: 'ready',
                })
              }
            />
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-3">
            <Textarea
              placeholder="הערות שטח, הקשר, שיחה עם אחראי אתר…"
              className="min-h-[160px]"
              value={report.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              ההערות עוזרות לזיהוי AI לדייק את הליקויים הרלוונטיים.
            </p>
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 p-3 backdrop-blur safe-bottom">
        <div className="container flex gap-2">
          <Button
            className="flex-1 gap-2"
            size="lg"
            disabled={report.detections.filter((d) => d.status !== 'rejected').length === 0}
            onClick={() => navigate(`/safety/${report.id}/report`)}
          >
            <FileOutput className="h-5 w-5" />
            הפק דוח
          </Button>
        </div>
      </div>
    </div>
  );
}
