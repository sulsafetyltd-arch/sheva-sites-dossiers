import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText, Trash2, Copy, Eye, Edit, Flame, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getAllDossiers, createDossier, createDossierFromTemplate, deleteDossier, duplicateDossier } from '@/lib/dossier-store';
import { DossierMeta } from '@/types/dossier';
import { buildingTemplates, BuildingTemplate } from '@/data/building-templates';

const Index = () => {
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<DossierMeta[]>([]);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BuildingTemplate | null>(null);

  const loadDossiers = useCallback(async () => {
    const data = await getAllDossiers();
    setDossiers(data);
  }, []);

  useEffect(() => { loadDossiers(); }, [loadDossiers]);

  const filtered = useMemo(
    () => dossiers.filter(d => d.name.includes(search) || d.status.includes(search)),
    [dossiers, search]
  );

  const stats = useMemo(() => ({
    total: dossiers.length,
    drafts: dossiers.filter(d => d.status === 'draft').length,
    complete: dossiers.filter(d => d.status === 'complete').length,
  }), [dossiers]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const d = selectedTemplate
      ? await createDossierFromTemplate(newName.trim(), selectedTemplate)
      : await createDossier(newName.trim());
    setNewName('');
    setSelectedTemplate(null);
    setDialogOpen(false);
    navigate(`/editor/${d.id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteDossier(id);
    loadDossiers();
  };

  const handleDuplicate = async (id: string) => {
    await duplicateDossier(id);
    loadDossiers();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">תיק שטח כיבוי אש</h1>
              <p className="text-sm text-muted-foreground">ניהול תיקי שטח לבטיחות אש</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate('/real-estate')}>
              <Scale className="w-4 h-4" />
              סולו נדלן
            </Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setSelectedTemplate(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                תיק חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>יצירת תיק שטח חדש</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 pt-2">
                <Input
                  placeholder="שם המבנה / המתקן"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />

                {/* Template selection */}
                <div>
                  <p className="text-sm font-medium mb-2">בחר תבנית מבנה (אופציונלי)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {buildingTemplates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(selectedTemplate?.id === t.id ? null : t)}
                        className={`text-right p-3 rounded-lg border text-sm transition-colors ${
                          selectedTemplate?.id === t.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-lg">{t.icon}</span>
                          <span className="font-medium">{t.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleCreate} disabled={!newName.trim()}>
                  {selectedTemplate ? `צור תיק (${selectedTemplate.name})` : 'צור תיק ריק'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <button
          onClick={() => navigate('/real-estate')}
          className="w-full text-right bg-card rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold">סולו נדלן — ניהול עסקאות מקרקעין</h2>
              <p className="text-sm text-muted-foreground">
                לוח בקרה, תיקי עסקה, לקוחות, שכר טרחה והתראות למשרד עו״ד
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-primary shrink-0">כניסה למודול</span>
        </button>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 animate-reveal">
          {[
            { label: 'סה"כ תיקים', value: stats.total, color: 'bg-secondary text-secondary-foreground' },
            { label: 'טיוטות', value: stats.drafts, color: 'bg-warning/10 text-warning' },
            { label: 'הושלמו', value: stats.complete, color: 'bg-success/10 text-success' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-bold mt-1 tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative animate-reveal animate-reveal-delay-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש תיקים..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Dossier list */}
        <div className="space-y-3 animate-reveal animate-reveal-delay-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">לא נמצאו תיקים</p>
              <p className="text-sm mt-1">צור תיק שטח חדש כדי להתחיל</p>
            </div>
          ) : (
            filtered.map(d => (
              <div
                key={d.id}
                className="bg-card rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{d.name}</h3>
                    <Badge variant={d.status === 'complete' ? 'default' : 'secondary'} className="shrink-0">
                      {d.status === 'complete' ? 'הושלם' : 'טיוטה'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    עודכן: {d.updatedAt} · נוצר: {d.createdAt}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/editor/${d.id}`)} title="עריכה">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/preview/${d.id}`)} title="תצוגה מקדימה">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDuplicate(d.id)} title="שכפול">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="מחיקה">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>מחיקת תיק</AlertDialogTitle>
                        <AlertDialogDescription>
                          האם למחוק את "{d.name}"? פעולה זו אינה ניתנת לביטול.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(d.id)}>
                          מחק
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
