import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SignaturePadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (dataUrl: string, signerName: string) => void;
  title?: string;
  description?: string;
  /** Hide the signer-name field (e.g. when capturing the attorney's own signature). */
  hideName?: boolean;
}

export function SignaturePad({ open, onOpenChange, onSave, title, description, hideName }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [signerName, setSignerName] = useState('');

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a2a6c';
    setHasInk(false);
    setSignerName('');
  }, [open]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title ?? 'החתמה על המסך'}</DialogTitle>
          <DialogDescription>
            {description ?? 'הלקוח חותם באצבע (בנייד/טאבלט) או בעכבר — החתימה תשולב בתחתית המסמך הנוכחי'}
          </DialogDescription>
        </DialogHeader>
        {!hideName && (
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="שם החותם (יופיע מתחת לחתימה)"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />
        )}
        <canvas
          ref={canvasRef}
          width={560}
          height={220}
          className="w-full rounded-lg border-2 border-dashed bg-white touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={clear}>ניקוי</Button>
          <Button
            disabled={!hasInk}
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              onSave(canvas.toDataURL('image/png'), signerName.trim());
              onOpenChange(false);
            }}
          >
            {hideName ? 'שמירת החתימה' : 'שילוב החתימה במסמך'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
