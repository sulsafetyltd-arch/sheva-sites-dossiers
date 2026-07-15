import { useRef, useState, useCallback } from 'react';
import { Camera, ImagePlus, Loader2, Sparkles, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DefectPhoto } from '@/types/safety-report';
import { resizeImageToBlob, uploadImage, deleteStorageFile } from '@/lib/storage-utils';

interface Props {
  photos: DefectPhoto[];
  onChange: (photos: DefectPhoto[]) => void;
  reportId: string;
  onAnalyze?: () => void;
  analyzing?: boolean;
}

const MAX_SIZE = 1280;

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
  const [preview, setPreview] = useState<DefectPhoto | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      const next: DefectPhoto[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const photoId = crypto.randomUUID();
        try {
          const blob = await resizeImageToBlob(file, MAX_SIZE, 0.75);
          const previewUrl = URL.createObjectURL(blob);
          let url = previewUrl;
          try {
            url = await uploadImage(blob, `safety/${reportId}`, `${photoId}.jpg`);
          } catch (err) {
            console.warn('Cloud upload failed, keeping local preview:', err);
            toast.message('התמונה נשמרה מקומית (העלאה לענן נכשלה)');
            // convert blob to data URL for persistence
            url = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
          next.push({
            id: photoId,
            url,
            previewUrl,
            caption: '',
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error(err);
          toast.error(`שגיאה בעיבוד ${file.name}`);
        }
      }

      setUploading(false);
      if (next.length) {
        onChange([...photos, ...next]);
        toast.success(`${next.length} תמונות נוספו`);
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
          disabled={uploading}
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
          disabled={uploading}
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
            <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <img
                src={photo.previewUrl || photo.url}
                alt=""
                className="h-full w-full object-cover"
                onClick={() => setPreview(photo)}
              />
              <button
                type="button"
                className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white"
                onClick={() => void removePhoto(photo.id)}
                aria-label="מחק תמונה"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="absolute bottom-1 left-1 rounded-full bg-black/60 p-1 text-white"
                onClick={() => setPreview(photo)}
                aria-label="הגדל"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && onAnalyze && (
        <Button
          type="button"
          className="w-full gap-2"
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

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg p-2">
          {preview && (
            <img
              src={preview.previewUrl || preview.url}
              alt=""
              className="max-h-[80vh] w-full rounded object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
