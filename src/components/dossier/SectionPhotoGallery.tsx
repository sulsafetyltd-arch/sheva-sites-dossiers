import { useState, useRef, useCallback } from 'react';
import { Camera, ImagePlus, X, ZoomIn, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { uploadImage, resizeImageToBlob, deleteStorageFile } from '@/lib/storage-utils';

export interface SectionPhoto {
  id: string;
  dataUrl: string; // now holds a public URL from storage (or legacy base64)
  caption: string;
  timestamp: string;
}

interface Props {
  photos: SectionPhoto[];
  onChange: (photos: SectionPhoto[]) => void;
  sectionTitle: string;
  dossierId?: string;
}

const MAX_SIZE = 800;

const SectionPhotoGallery = ({ photos, onChange, sectionTitle, dossierId }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [previewPhoto, setPreviewPhoto] = useState<SectionPhoto | null>(null);
  const [editingCaption, setEditingCaption] = useState<{ id: string; value: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const folder = dossierId ? `photos/${dossierId}` : 'photos/unsorted';

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newPhotos: SectionPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      try {
        const blob = await resizeImageToBlob(file, MAX_SIZE, 0.6);
        const photoId = crypto.randomUUID();
        const publicUrl = await uploadImage(blob, folder, `${photoId}.jpg`);
        newPhotos.push({
          id: photoId,
          dataUrl: publicUrl,
          caption: '',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Upload error:', err);
        toast.error(`שגיאה בהעלאת ${file.name}`);
      }
    }
    setUploading(false);
    if (newPhotos.length > 0) {
      onChange([...photos, ...newPhotos]);
      toast.success(`${newPhotos.length} תמונות הועלו לענן`);
    }
  }, [photos, onChange, folder]);

  const removePhoto = useCallback(async (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (photo) {
      try {
        await deleteStorageFile(photo.dataUrl);
      } catch {
        // ignore delete errors for legacy base64
      }
    }
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
            disabled={uploading}
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
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {uploading ? 'מעלה...' : 'העלה'}
          </Button>
        </div>
      </div>

      {photos.length === 0 && !uploading ? (
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">לחץ להעלאת תמונות או גרור לכאן</p>
          <p className="text-xs text-muted-foreground mt-1">התמונות נשמרות בענן ללא מגבלת נפח</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="group relative rounded-lg overflow-hidden border bg-muted/30">
              <img
                src={photo.dataUrl}
                alt={photo.caption || 'תמונה'}
                className="w-full aspect-square object-cover cursor-pointer"
                loading="lazy"
                onClick={() => setPreviewPhoto(photo)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                <Button variant="secondary" size="icon" className="w-7 h-7" onClick={() => setPreviewPhoto(photo)}>
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button variant="secondary" size="icon" className="w-7 h-7" onClick={() => setEditingCaption({ id: photo.id, value: photo.caption })}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="destructive" size="icon" className="w-7 h-7" onClick={() => removePhoto(photo.id)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              {photo.caption && (
                <p className="text-xs p-1.5 truncate text-muted-foreground">{photo.caption}</p>
              )}
            </div>
          ))}
          {uploading && (
            <div className="flex items-center justify-center aspect-square rounded-lg border-2 border-dashed">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewPhoto?.caption || 'תמונה'}</DialogTitle>
          </DialogHeader>
          {previewPhoto && (
            <img src={previewPhoto.dataUrl} alt={previewPhoto.caption || 'תמונה'} className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

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
