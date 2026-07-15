import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Sparkles, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DefectPhoto } from '@/types/safety-report';
import { resizeImageToBlob, uploadImage, deleteStorageFile } from '@/lib/storage-utils';
import {
  cachePhotoDataUrl,
  deleteCachedPhoto,
  getCachedPhotoDataUrl,
  newId,
} from '@/lib/photo-cache';

interface Props {
  photos: DefectPhoto[];
  onChange: (photos: DefectPhoto[]) => void;
  reportId: string;
  onAnalyze?: () => void;
  analyzing?: boolean;
}

const MAX_SIZE = 960;

export function SafetyPhotoCapture({
  photos,
  onChange,
  reportId,
  onAnalyze,
  analyzing,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const photo of photos) {
        const cached = await getCachedPhotoDataUrl(photo.id);
        if (cached) next[photo.id] = cached;
        else if (photo.url.startsWith('http')) next[photo.id] = photo.url;
      }
      if (!cancelled) setThumbs(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [photos]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      const added: DefectPhoto[] = [];
      const thumbUpdates: Record<string, string> = {};

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const photoId = newId();
        try {
          const blob = await resizeImageToBlob(file, MAX_SIZE, 0.65);
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          await cachePhotoDataUrl(photoId, dataUrl);
          thumbUpdates[photoId] = dataUrl;

          let url = `local://${photoId}`;
          try {
            url = await Promise.race([
              uploadImage(blob, `safety/${reportId}`, `${photoId}.jpg`),
              new Promise<string>((_, reject) =>
                setTimeout(() => reject(new Error('upload timeout')), 8000),
              ),
            ]);
          } catch (err) {
            console.warn('Cloud upload skipped:', err);
          }

          added.push({
            id: photoId,
            url,
            caption: '',
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error(err);
          toast.error(`שגיאה בעיבוד ${file.name}`);
        }
      }

      setUploading(false);
      if (added.length) {
        setThumbs((prev) => ({ ...prev, ...thumbUpdates }));
        onChange([...photos, ...added]);
        toast.success(`${added.length} תמונות מוכנות לניתוח`);
      }
    },
    [onChange, photos, reportId],
  );

  const removePhoto = async (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (photo?.url.startsWith('http')) {
      try {
        await deleteStorageFile(photo.url);
      } catch {
        /* ignore */
      }
    }
    await deleteCachedPhoto(id);
    setThumbs((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    onChange(photos.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          size="lg"
          className="h-24 flex-col gap-2 text-base"
          onClick={() => cameraRef.current?.click()}
          disabled={uploading || analyzing}
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-7 w-7" />}
          צלם בשטח
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-24 flex-col gap-2 text-base"
          onClick={() => galleryRef.current?.click()}
          disabled={uploading || analyzing}
        >
          <ImagePlus className="h-7 w-7" />
          מהגלריה
        </Button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {thumbs[photo.id] ? (
                <img
                  src={thumbs[photo.id]}
                  alt=""
                  className="h-full w-full object-cover"
                  onClick={() => setPreviewSrc(thumbs[photo.id])}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  תמונה
                </div>
              )}
              <button
                type="button"
                className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white"
                onClick={() => void removePhoto(photo.id)}
                aria-label="מחק תמונה"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {thumbs[photo.id] && (
                <button
                  type="button"
                  className="absolute bottom-1 left-1 rounded-full bg-black/60 p-1 text-white"
                  onClick={() => setPreviewSrc(thumbs[photo.id])}
                  aria-label="הגדל"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && onAnalyze && (
        <Button
          type="button"
          className="w-full gap-2 text-base"
          size="lg"
          onClick={onAnalyze}
          disabled={analyzing || uploading}
        >
          {analyzing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          {analyzing ? 'מנתח ליקויים…' : 'זהה ליקויים באמצעות AI'}
        </Button>
      )}

      <Dialog open={!!previewSrc} onOpenChange={(o) => !o && setPreviewSrc(null)}>
        <DialogContent className="max-w-lg p-2">
          {previewSrc && (
            <img src={previewSrc} alt="" className="max-h-[80vh] w-full rounded object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
