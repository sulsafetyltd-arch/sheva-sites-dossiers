import { useState, useRef, useCallback } from 'react';
import { Camera, ImagePlus, X, ZoomIn, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface SectionPhoto {
  id: string;
  dataUrl: string;
  caption: string;
  timestamp: string;
}

interface Props {
  photos: SectionPhoto[];
  onChange: (photos: SectionPhoto[]) => void;
  sectionTitle: string;
}

const MAX_SIZE = 800;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > MAX_SIZE || h > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const SectionPhotoGallery = ({ photos, onChange, sectionTitle }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [previewPhoto, setPreviewPhoto] = useState<SectionPhoto | null>(null);
  const [editingCaption, setEditingCaption] = useState<{ id: string; value: string } | null>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newPhotos: SectionPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      try {
        const dataUrl = await resizeImage(file);
        newPhotos.push({
          id: crypto.randomUUID(),
          dataUrl,
          caption: '',
          timestamp: new Date().toISOString(),
        });
      } catch {
        toast.error(`שגיאה בטעינת ${file.name}`);
      }
    }
    if (newPhotos.length > 0) {
      onChange([...photos, ...newPhotos]);
      toast.success(`${newPhotos.length} תמונות נוספו`);
    }
  }, [photos, onChange]);

  const removePhoto = useCallback((id: string) => {
    onChange(photos.filter(p => p.id !== id));
  }, [photos, onChange]);

  const saveCaption = useCallback(() => {
    if (!editingCaption) return;
    onChange(photos.map(p => p.id === editingCaption.id ? { ...p, caption: editingCaption.value } : p));
    setEditingCaption(null);
    toast.success('כיתוב עודכן');
  }, [editingCaption, photos, onChange]);

  return (
    <div className="mt-6 border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Camera className="w-4 h-4" />
          תמונות — {sectionTitle}
        </h4>
        <div className="flex gap-1.5">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-3.5 h-3.5" />
            צלם
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="w-3.5 h-3.5" />
            העלה
          </Button>
        </div>
      </div>

      {photos.length === 0 ? (
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">לחץ להעלאת תמונות או גרור לכאן</p>
          <p className="text-xs text-muted-foreground mt-1">ניתן לצלם ישירות מהמכשיר</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="group relative rounded-lg overflow-hidden border bg-muted/30">
              <img
                src={photo.dataUrl}
                alt={photo.caption || 'תמונה'}
                className="w-full aspect-square object-cover cursor-pointer"
                onClick={() => setPreviewPhoto(photo)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="icon"
                  className="w-7 h-7"
                  onClick={() => setPreviewPhoto(photo)}
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="w-7 h-7"
                  onClick={() => setEditingCaption({ id: photo.id, value: photo.caption })}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="w-7 h-7"
                  onClick={() => removePhoto(photo.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              {photo.caption && (
                <p className="text-xs p-1.5 truncate text-muted-foreground">{photo.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewPhoto?.caption || 'תמונה'}</DialogTitle>
          </DialogHeader>
          {previewPhoto && (
            <img
              src={previewPhoto.dataUrl}
              alt={previewPhoto.caption || 'תמונה'}
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Caption edit dialog */}
      <Dialog open={!!editingCaption} onOpenChange={() => setEditingCaption(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>עריכת כיתוב</DialogTitle>
          </DialogHeader>
          <Input
            value={editingCaption?.value ?? ''}
            onChange={e => setEditingCaption(prev => prev ? { ...prev, value: e.target.value } : null)}
            placeholder="הזן כיתוב לתמונה..."
            onKeyDown={e => e.key === 'Enter' && saveCaption()}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setEditingCaption(null)}>ביטול</Button>
            <Button size="sm" onClick={saveCaption}>שמור</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SectionPhotoGallery;
