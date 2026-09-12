import React, { useRef, useEffect, useCallback } from 'react';

interface PhotoCompositorProps {
  photoUrl: string;
  templateUrl: string;
  onCompositeReady: (compositeDataUrl: string) => void;
  width?: number;
  height?: number;
}

export const PhotoCompositor: React.FC<PhotoCompositorProps> = ({
  photoUrl,
  templateUrl,
  onCompositeReady,
  width = 1200,
  height = 1800,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderComposite = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const userImage = new Image();
    const templateImage = new Image();

    userImage.crossOrigin = 'anonymous';
    templateImage.crossOrigin = 'anonymous';

    userImage.src = photoUrl;
    userImage.onload = () => {
      templateImage.src = templateUrl;
      templateImage.onload = () => {
        ctx.clearRect(0, 0, width, height);

        // Layer 1: Foto User (Di Belakang)
        ctx.drawImage(userImage, 0, 0, width, height);

        // Layer 2: Template PNG Transparan (Di Depan)
        ctx.drawImage(templateImage, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        onCompositeReady(dataUrl);
      };
    };
  }, [photoUrl, templateUrl, width, height, onCompositeReady]);

  useEffect(() => {
    renderComposite();
  }, [renderComposite]);

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full max-w-xs h-auto rounded-lg shadow-inner object-contain"
      />
    </div>
  );
};
