import { useState, useRef, useCallback, useEffect } from 'react';
import {
  DoorOpen, Droplets, FireExtinguisher, Users, Zap, Wind,
  Upload, Trash2, ZoomIn, ZoomOut, RotateCcw, MousePointer, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface PlanMarker {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  type: MarkerType;
  label: string;
}

export interface PlanData {
  id: string;
  imageDataUrl: string;
  name: string;
  category: string;
  markers: PlanMarker[];
}

type MarkerType = 'exit' | 'hydrant' | 'extinguisher' | 'assembly' | 'electrical' | 'pump';

interface Props {
  plans: PlanData[];
  onChange: (plans: PlanData[]) => void;
}

const MARKER_TYPES: { type: MarkerType; label: string; icon: typeof DoorOpen; color: string }[] = [
  { type: 'exit', label: 'יציאת חירום', icon: DoorOpen, color: 'text-green-600' },
  { type: 'hydrant', label: 'הידרנט', icon: Droplets, color: 'text-blue-600' },
  { type: 'extinguisher', label: 'מטפה', icon: FireExtinguisher, color: 'text-red-600' },
  { type: 'assembly', label: 'נקודת כינוס', icon: Users, color: 'text-amber-600' },
  { type: 'electrical', label: 'חדר חשמל', icon: Zap, color: 'text-yellow-600' },
  { type: 'pump', label: 'חדר משאבות', icon: Wind, color: 'text-cyan-700' },
];

const CATEGORIES = [
  { value: 'site', label: 'מפת אתר' },
  { value: 'access', label: 'דרכי גישה' },
  { value: 'floor', label: 'תרשים קומה' },
  { value: 'fire', label: 'מערכות כיבוי' },
  { value: 'evacuation', label: 'מפת פינוי' },
  { value: 'other', label: 'אחר' },
];

const MAX_IMG = 1600;

function resizeForPlan(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMG || height > MAX_IMG) {
          const ratio = Math.min(MAX_IMG / width, MAX_IMG / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PlanAnnotator({ plans, onChange }: Props) {
  const [activePlanId, setActivePlanId] = useState<string | null>(plans[0]?.id ?? null);
  const [activeMarkerType, setActiveMarkerType] = useState<MarkerType | null>(null);
  const [editingMarker, setEditingMarker] = useState<PlanMarker | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activePlan = plans.find(p => p.id === activePlanId) ?? null;

  useEffect(() => {
    if (!activePlanId && plans.length > 0) setActivePlanId(plans[0].id);
  }, [plans, activePlanId]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      const newPlans: PlanData[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await resizeForPlan(file);
        newPlans.push({
          id: crypto.randomUUID(),
          imageDataUrl: dataUrl,
          name: file.name.replace(/\.[^.]+$/, ''),
          category: 'other',
          markers: [],
        });
      }
      if (newPlans.length) {
        const updated = [...plans, ...newPlans];
        onChange(updated);
        setActivePlanId(newPlans[0].id);
        toast.success(`${newPlans.length} תוכניות הועלו`);
      }
    } catch {
      toast.error('שגיאה בהעלאת תוכנית');
    }
    e.target.value = '';
  }, [plans, onChange]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeMarkerType || !activePlan) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const markerDef = MARKER_TYPES.find(m => m.type === activeMarkerType)!;
    const marker: PlanMarker = {
      id: crypto.randomUUID(),
      x, y,
      type: activeMarkerType,
      label: markerDef.label,
    };
    const updated = plans.map(p =>
      p.id === activePlan.id ? { ...p, markers: [...p.markers, marker] } : p
    );
    onChange(updated);
    toast.success(`${markerDef.label} סומן`);
  }, [activeMarkerType, activePlan, plans, onChange]);

  const removeMarker = useCallback((markerId: string) => {
    if (!activePlan) return;
    const updated = plans.map(p =>
      p.id === activePlan.id
        ? { ...p, markers: p.markers.filter(m => m.id !== markerId) }
        : p
    );
    onChange(updated);
  }, [activePlan, plans, onChange]);

  const saveMarkerLabel = useCallback(() => {
    if (!editingMarker || !activePlan) return;
    const updated = plans.map(p =>
      p.id === activePlan.id
        ? { ...p, markers: p.markers.map(m => m.id === editingMarker.id ? { ...m, label: editLabel } : m) }
        : p
    );
    onChange(updated);
    setEditingMarker(null);
  }, [editingMarker, editLabel, activePlan, plans, onChange]);

  const removePlan = useCallback((planId: string) => {
    const updated = plans.filter(p => p.id !== planId);
    onChange(updated);
    if (activePlanId === planId) setActivePlanId(updated[0]?.id ?? null);
    toast.success('תוכנית נמחקה');
  }, [plans, onChange, activePlanId]);

  const updateCategory = useCallback((planId: string, category: string) => {
    onChange(plans.map(p => p.id === planId ? { ...p, category } : p));
  }, [plans, onChange]);

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-base">תרשימים וסימוני שטח</h3>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
          <Upload className="w-4 h-4" />
          העלה תוכנית
        </Button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </div>

      {/* Plan tabs */}
      {plans.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {plans.map(p => (
            <button
              key={p.id}
              onClick={() => { setActivePlanId(p.id); setZoom(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap border transition-colors ${
                activePlanId === p.id
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {p.name}
              <Badge variant="outline" className="text-[10px] px-1.5">
                {p.markers.length}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {activePlan && (
        <>
          {/* Category + controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-sm">קטגוריה:</Label>
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => updateCategory(activePlan.id, c.value)}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    activePlan.category === c.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="mr-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)}>
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePlan(activePlan.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Marker toolbar */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <Button
              variant={activeMarkerType === null ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setActiveMarkerType(null)}
            >
              <MousePointer className="w-3.5 h-3.5" />
              בחירה
            </Button>
            {MARKER_TYPES.map(m => {
              const Icon = m.icon;
              return (
                <Button
                  key={m.type}
                  variant={activeMarkerType === m.type ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`gap-1 text-xs ${activeMarkerType === m.type ? m.color : ''}`}
                  onClick={() => setActiveMarkerType(activeMarkerType === m.type ? null : m.type)}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {m.label}
                </Button>
              );
            })}
          </div>

          {/* Canvas */}
          <div
            ref={containerRef}
            className="relative border rounded-lg overflow-auto bg-muted/30"
            style={{ maxHeight: '500px' }}
          >
            <div
              className={`relative inline-block ${activeMarkerType ? 'cursor-crosshair' : 'cursor-default'}`}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top right' }}
              onClick={handleCanvasClick}
            >
              <img
                src={activePlan.imageDataUrl}
                alt={activePlan.name}
                className="max-w-full block"
                draggable={false}
              />
              {/* Markers */}
              {activePlan.markers.map(marker => {
                const def = MARKER_TYPES.find(m => m.type === marker.type)!;
                const Icon = def.icon;
                return (
                  <div
                    key={marker.id}
                    className="absolute group"
                    style={{
                      left: `${marker.x}%`,
                      top: `${marker.y}%`,
                      transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                    }}
                    onClick={e => { e.stopPropagation(); }}
                  >
                    <div className={`relative flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border-2 ${def.color} border-current`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md border">
                        {marker.label}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                      <button
                        className="bg-card border rounded p-0.5 shadow-sm hover:bg-muted"
                        onClick={() => { setEditingMarker(marker); setEditLabel(marker.label); }}
                        title="ערוך"
                      >
                        <Plus className="w-3 h-3 rotate-45" />
                      </button>
                      <button
                        className="bg-card border rounded p-0.5 shadow-sm hover:bg-destructive/10 text-destructive"
                        onClick={() => removeMarker(marker.id)}
                        title="מחק"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Markers summary */}
          {activePlan.markers.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MARKER_TYPES.map(mt => {
                const count = activePlan.markers.filter(m => m.type === mt.type).length;
                if (!count) return null;
                const Icon = mt.icon;
                return (
                  <div key={mt.type} className={`flex items-center gap-2 text-sm ${mt.color}`}>
                    <Icon className="w-4 h-4" />
                    <span>{mt.label}: {count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {plans.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">העלה תוכנית קומה, מפת אתר או תרשים כדי להתחיל בסימון</p>
        </div>
      )}

      {/* Edit marker label dialog */}
      <Dialog open={!!editingMarker} onOpenChange={o => !o && setEditingMarker(null)}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת כיתוב סימון</DialogTitle>
          </DialogHeader>
          <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveMarkerLabel()} />
          <DialogFooter>
            <Button onClick={saveMarkerLabel}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
