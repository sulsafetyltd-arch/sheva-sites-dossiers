import { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  value?: string; // data URL of saved signature
  onChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
}

export default function SignaturePad({ value, onChange, width = 360, height = 150 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  // Restore saved signature
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const img = new window.Image();
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      setHasStrokes(true);
    };
    img.src = value;
  }, [value, width, height]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, [width, height]);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasStrokes(true);
  }, [isDrawing, getPos]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    setHasStrokes(false);
    onChange(null);
  }, [width, height, onChange]);

  const saveSignature = useCallback(() => {
    if (!canvasRef.current || !hasStrokes) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onChange(dataUrl);
  }, [hasStrokes, onChange]);

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed rounded-lg overflow-hidden bg-white" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full cursor-crosshair"
          style={{ maxWidth: width, height: 'auto', aspectRatio: `${width}/${height}` }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={clearCanvas} className="gap-1 text-xs">
          <Eraser className="w-3.5 h-3.5" />
          נקה
        </Button>
        <Button variant="outline" size="sm" onClick={saveSignature} disabled={!hasStrokes} className="gap-1 text-xs">
          <Check className="w-3.5 h-3.5" />
          אשר חתימה
        </Button>
      </div>
    </div>
  );
}
