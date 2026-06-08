import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Eraser, Undo2, Check } from 'lucide-react';
import { cn } from '../../lib/utils.js';

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
  title: string;
}

interface Point {
  x: number;
  y: number;
}

interface Path {
  points: Point[];
}

export default function SignatureModal({ open, onClose, onSave, title }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const lastPointRef = useRef<Point | null>(null);

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  }, []);

  const drawLine = useCallback((ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const path of paths) {
      for (let i = 1; i < path.points.length; i++) {
        drawLine(ctx, path.points[i - 1], path.points[i]);
      }
    }

    if (currentPath.length > 1) {
      for (let i = 1; i < currentPath.length; i++) {
        drawLine(ctx, currentPath[i - 1], currentPath[i]);
      }
    }
  }, [paths, currentPath, drawLine]);

  useEffect(() => {
    if (open) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      setPaths([]);
      setCurrentPath([]);
      lastPointRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      redrawCanvas();
    }
  }, [open, paths, currentPath, redrawCanvas]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;

    setIsDrawing(true);
    lastPointRef.current = point;
    setCurrentPath([point]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const point = getCanvasPoint(e);
    if (!point || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawLine(ctx, lastPointRef.current, point);
    lastPointRef.current = point;
    setCurrentPath(prev => [...prev, point]);
  };

  const handleEnd = () => {
    if (!isDrawing) return;

    if (currentPath.length > 1) {
      setPaths(prev => [...prev, { points: currentPath }]);
    }

    setIsDrawing(false);
    setCurrentPath([]);
    lastPointRef.current = null;
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
    lastPointRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (paths.length === 0) {
      return;
    }

    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 text-sm text-gray-500 text-center">
            请在下方区域手写签名，签名将作为合同的有效签署依据
          </div>

          <div className="border-2 border-gray-200 border-dashed rounded-xl overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={800}
              height={400}
              className="w-full cursor-crosshair touch-none"
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            />
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  paths.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
                disabled={paths.length === 0}
              >
                <Eraser size={16} />
                清除签名
              </button>
              <button
                onClick={handleUndo}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  paths.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
                disabled={paths.length === 0}
              >
                <Undo2 size={16} />
                撤销
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                  paths.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                )}
                disabled={paths.length === 0}
              >
                <Check size={16} />
                确认签名
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
