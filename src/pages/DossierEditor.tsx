import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Save, Eye, CheckCircle, FileText, Building2, Phone, History,
  Map, Route, Users, Droplets, Bell, Layers, Zap, DoorOpen, AlertTriangle,
  ClipboardList, Flame, Image, FileBarChart, ListTodo, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getDossier, saveDossier } from '@/lib/dossier-store';
import { sectionConfigs } from '@/data/section-config';
import { Dossier, SectionConfig, FieldConfig } from '@/types/dossier';
import { validateDossier, readinessLabels } from '@/lib/validation-engine';
import RepeatableTable from '@/components/dossier/RepeatableTable';
import ScenarioLibrary from '@/components/dossier/ScenarioLibrary';
import RiskMatrix from '@/components/dossier/RiskMatrix';
import ContentLibraryDialog from '@/components/dossier/ContentLibraryDialog';
import ValidationPanel from '@/components/dossier/ValidationPanel';
import TaskManager from '@/components/dossier/TaskManager';
import SectionPhotoGallery from '@/components/dossier/SectionPhotoGallery';
import PlanAnnotator from '@/components/dossier/PlanAnnotator';
import VoiceNoteButton from '@/components/dossier/VoiceNoteButton';
import SignatureBlock from '@/components/dossier/SignatureBlock';
import OfflineSyncIndicator from '@/components/dossier/OfflineSyncIndicator';
import { useOnlineStatus } from '@/hooks/use-online-status';

const iconMap: Record<string, any> = {
  FileText, Building2, Phone, History, Map, Route, Users, Droplets,
  Bell, Layers, Zap, DoorOpen, AlertTriangle, ClipboardList, Flame, Image,
};

type SidePanel = 'none' | 'validation' | 'tasks';

const DossierEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [activeSection, setActiveSection] = useState(sectionConfigs[0].id);
  const [hasChanges, setHasChanges] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isOnline, markPendingSync } = useOnlineStatus();

  useEffect(() => {
    if (id) {
      getDossier(id).then(d => {
        if (d) setDossier(d);
        else navigate('/');
      });
    }
  }, [id, navigate]);

  // Autosave after 3 seconds of inactivity
  useEffect(() => {
    if (!dossier || !hasChanges) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      try {
        await saveDossier(dossier);
        if (!isOnline) markPendingSync(dossier.id);
        setHasChanges(false);
        toast.success(isOnline ? 'נשמר אוטומטית' : 'נשמר מקומית — יסונכרן בחזרה לרשת', { duration: 2000 });
      } catch (e: any) {
        toast.error('שגיאה בשמירה');
      }
    }, 3000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [dossier, hasChanges]);

  const validationReport = useMemo(() => dossier ? validateDossier(dossier) : null, [dossier]);

  const updateSectionData = useCallback((sectionId: string, key: string, value: any) => {
    setDossier(prev => {
      if (!prev) return prev;
      const sectionData = prev.data[sectionId] ?? {};
      return {
        ...prev,
        data: { ...prev.data, [sectionId]: { ...sectionData, [key]: value } },
      };
    });
    setHasChanges(true);
  }, []);

  const updateRepeatableData = useCallback((sectionId: string, rows: any[]) => {
    setDossier(prev => {
      if (!prev) return prev;
      return { ...prev, data: { ...prev.data, [sectionId]: rows } };
    });
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!dossier) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    try {
      await saveDossier(dossier);
      setHasChanges(false);
      toast.success('התיק נשמר בהצלחה');
    } catch {
      toast.error('שגיאה בשמירה');
    }
  }, [dossier]);

  const handleMarkComplete = useCallback(async () => {
    if (!dossier) return;
    const updated = { ...dossier, status: dossier.status === 'complete' ? 'draft' as const : 'complete' as const };
    setDossier(updated);
    await saveDossier(updated);
    setHasChanges(false);
    toast.success(updated.status === 'complete' ? 'התיק סומן כהושלם' : 'התיק הוחזר לטיוטה');
  }, [dossier]);

  const handleContentInsert = useCallback((fieldKey: string, content: string) => {
    updateSectionData(activeSection, fieldKey, content);
    toast.success('תוכן הוכנס בהצלחה');
  }, [activeSection, updateSectionData]);

  if (!dossier || !validationReport) return null;

  const currentSection = sectionConfigs.find(s => s.id === activeSection)!;
  const readiness = readinessLabels[validationReport.readinessLevel];

  // Section completion calculation
  const getSectionProgress = (section: SectionConfig): number => {
    const data = dossier.data[section.id];
    if (!data) return 0;
    if (section.repeatable) {
      return Array.isArray(data) && data.length > 0 ? 100 : 0;
    }
    if (section.fields) {
      const filled = section.fields.filter(f => {
        const val = data[f.key];
        return val !== undefined && val !== '';
      }).length;
      return Math.round((filled / section.fields.length) * 100);
    }
    return 0;
  };

  const renderField = (section: SectionConfig, field: FieldConfig) => {
    const value = dossier.data[section.id]?.[field.key] ?? '';

    if (field.type === 'select' && field.options) {
      return (
        <div key={field.key} className={field.fullWidth ? 'col-span-full' : ''}>
          <Label className="text-sm font-medium mb-1.5 block">
            {field.label}
            {field.required && <span className="text-destructive mr-1">*</span>}
          </Label>
          <Select value={value} onValueChange={v => updateSectionData(section.id, field.key, v)}>
            <SelectTrigger>
              <SelectValue placeholder="בחר..." />
            </SelectTrigger>
            <SelectContent>
              {field.options.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.key} className={field.fullWidth ? 'col-span-full' : ''}>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive mr-1">*</span>}
            </Label>
            <VoiceNoteButton
              currentValue={value}
              onTranscript={text => updateSectionData(section.id, field.key, text)}
            />
          </div>
          <Textarea
            value={value}
            onChange={e => updateSectionData(section.id, field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
        </div>
      );
    }

    return (
      <div key={field.key} className={field.fullWidth ? 'col-span-full' : ''}>
        <Label className="text-sm font-medium mb-1.5 block">
          {field.label}
          {field.required && <span className="text-destructive mr-1">*</span>}
        </Label>
        <Input
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          value={value}
          onChange={e => updateSectionData(section.id, field.key, e.target.value)}
          placeholder={field.placeholder}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b bg-card sticky top-0 z-20 no-print">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg leading-tight">{dossier.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={dossier.status === 'complete' ? 'default' : 'secondary'} className="text-xs">
                  {dossier.status === 'complete' ? 'הושלם' : 'טיוטה'}
                </Badge>
                <span className={`text-xs font-medium ${readiness.color}`}>
                  {validationReport.totalScore}% מוכנות
                </span>
                {hasChanges && (
                  <span className="text-xs text-warning">שומר...</span>
                )}
                <OfflineSyncIndicator />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant={sidePanel === 'validation' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setSidePanel(sidePanel === 'validation' ? 'none' : 'validation')}
              title="בדיקת מוכנות"
              className="relative"
            >
              <Shield className="w-4 h-4" />
              {validationReport.criticalCount > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                  {validationReport.criticalCount}
                </span>
              )}
            </Button>
            <Button
              variant={sidePanel === 'tasks' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setSidePanel(sidePanel === 'tasks' ? 'none' : 'tasks')}
              title="משימות"
            >
              <ListTodo className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/reports/${dossier.id}`)} title="דוחות">
              <FileBarChart className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleMarkComplete} className="hidden sm:flex gap-1.5">
              <CheckCircle className="w-4 h-4" />
              {dossier.status === 'complete' ? 'החזר לטיוטה' : 'סמן כהושלם'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/preview/${dossier.id}`)} className="gap-1.5">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">תצוגה מקדימה</span>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges} className="gap-1.5">
              <Save className="w-4 h-4" />
              שמור
            </Button>
          </div>
        </div>
        <Progress value={validationReport.totalScore} className="h-1 rounded-none" />
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar - section nav */}
        <nav className="border-b md:border-b-0 md:border-l md:w-56 shrink-0 bg-card no-print">
          <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible py-2 md:py-4 px-2 gap-1">
            {sectionConfigs.map(section => {
              const Icon = iconMap[section.icon] || FileText;
              const isActive = activeSection === section.id;
              const progress = getSectionProgress(section);
              const sectionIssues = validationReport.sections.find(s => s.sectionId === section.id)?.issues || [];
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-right">{section.title}</span>
                  <div className="flex items-center gap-1">
                    {sectionIssues.some(i => i.severity === 'critical') && (
                      <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                    )}
                    {progress > 0 && (
                      <span className={`text-xs tabular-nums ${progress === 100 ? 'text-success' : 'text-muted-foreground'}`}>
                        {progress}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8 max-w-4xl">
          <div className="animate-reveal">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <h2 className="text-xl font-bold">{currentSection.title}</h2>
              <div className="flex items-center gap-2">
                <ContentLibraryDialog
                  sectionId={currentSection.id}
                  onInsert={handleContentInsert}
                />
                {currentSection.id === 'scenarios' && (
                  <ScenarioLibrary
                    existingScenarios={dossier.data.scenarios ?? []}
                    onAdd={rows => updateRepeatableData('scenarios', rows)}
                  />
                )}
              </div>
            </div>
            {currentSection.description && (
              <p className="text-sm text-muted-foreground mb-6">{currentSection.description}</p>
            )}

            {currentSection.fields && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSection.fields.map(field => renderField(currentSection, field))}
              </div>
            )}

            {currentSection.repeatable && (
              <RepeatableTable
                columns={currentSection.repeatable.columns}
                rows={Array.isArray(dossier.data[currentSection.id]) ? dossier.data[currentSection.id] : []}
                onChange={rows => updateRepeatableData(currentSection.id, rows)}
              />
            )}

            {currentSection.id === 'risks' && (
              <RiskMatrix risks={dossier.data.risks ?? []} />
            )}

            {currentSection.id === 'drawings' && (
              <PlanAnnotator
                plans={dossier.data.drawings_plans ?? []}
                dossierId={dossier.id}
                onChange={plans => {
                  setDossier(prev => {
                    if (!prev) return prev;
                    return { ...prev, data: { ...prev.data, drawings_plans: plans } };
                  });
                  setHasChanges(true);
                }}
              />
            )}

            {currentSection.id === 'cover' && (
              <SignatureBlock
                signatures={dossier.data.signatures ?? {}}
                onChange={sigs => {
                  setDossier(prev => {
                    if (!prev) return prev;
                    return { ...prev, data: { ...prev.data, signatures: sigs } };
                  });
                  setHasChanges(true);
                }}
              />
            )}

            <SectionPhotoGallery
              sectionTitle={currentSection.title}
              dossierId={dossier.id}
              photos={dossier.data[`${currentSection.id}_photos`] ?? []}
              onChange={photos => {
                setDossier(prev => {
                  if (!prev) return prev;
                  return { ...prev, data: { ...prev.data, [`${currentSection.id}_photos`]: photos } };
                });
                setHasChanges(true);
              }}
            />
          </div>
        </main>

        {/* Side panel */}
        {sidePanel !== 'none' && (
          <aside className="border-t md:border-t-0 md:border-r md:w-80 shrink-0 bg-card p-4 overflow-y-auto no-print">
            {sidePanel === 'validation' && (
              <ValidationPanel
                report={validationReport}
                onNavigateToSection={sectionId => {
                  setActiveSection(sectionId);
                  setSidePanel('none');
                }}
              />
            )}
            {sidePanel === 'tasks' && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ListTodo className="w-4 h-4" />
                  משימות
                </h3>
                <TaskManager dossierId={dossier.id} />
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default DossierEditor;
