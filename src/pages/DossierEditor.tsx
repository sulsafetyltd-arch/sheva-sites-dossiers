import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Save, Eye, CheckCircle, FileText, Building2, Phone, History,
  Map, Route, Users, Droplets, Bell, Layers, Zap, DoorOpen, AlertTriangle,
  ClipboardList, Flame, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getDossier, saveDossier } from '@/lib/dossier-store';
import { sectionConfigs } from '@/data/section-config';
import { Dossier, SectionConfig, FieldConfig } from '@/types/dossier';
import RepeatableTable from '@/components/dossier/RepeatableTable';

const iconMap: Record<string, any> = {
  FileText, Building2, Phone, History, Map, Route, Users, Droplets,
  Bell, Layers, Zap, DoorOpen, AlertTriangle, ClipboardList, Flame, Image,
};

const DossierEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [activeSection, setActiveSection] = useState(sectionConfigs[0].id);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (id) {
      const d = getDossier(id);
      if (d) setDossier(d);
      else navigate('/');
    }
  }, [id, navigate]);

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

  const handleSave = useCallback(() => {
    if (!dossier) return;
    saveDossier(dossier);
    setHasChanges(false);
    toast.success('התיק נשמר בהצלחה');
  }, [dossier]);

  const handleMarkComplete = useCallback(() => {
    if (!dossier) return;
    const updated = { ...dossier, status: dossier.status === 'complete' ? 'draft' as const : 'complete' as const };
    setDossier(updated);
    saveDossier(updated);
    setHasChanges(false);
    toast.success(updated.status === 'complete' ? 'התיק סומן כהושלם' : 'התיק הוחזר לטיוטה');
  }, [dossier]);

  if (!dossier) return null;

  const currentSection = sectionConfigs.find(s => s.id === activeSection)!;

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
          <Label className="text-sm font-medium mb-1.5 block">
            {field.label}
            {field.required && <span className="text-destructive mr-1">*</span>}
          </Label>
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
                {hasChanges && (
                  <span className="text-xs text-warning">שינויים שלא נשמרו</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar - section nav */}
        <nav className="border-b md:border-b-0 md:border-l md:w-60 shrink-0 bg-card no-print">
          <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible py-2 md:py-4 px-2 gap-1">
            {sectionConfigs.map(section => {
              const Icon = iconMap[section.icon] || FileText;
              const isActive = activeSection === section.id;
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
                  <span>{section.title}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8 max-w-4xl">
          <div className="animate-reveal">
            <h2 className="text-xl font-bold mb-1">{currentSection.title}</h2>
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
                rows={dossier.data[currentSection.id] ?? []}
                onChange={rows => updateRepeatableData(currentSection.id, rows)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DossierEditor;
