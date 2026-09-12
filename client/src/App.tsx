import React, { useState, useCallback, useRef } from 'react';
import type { PhotoboothStep, PhotoSlot } from './types/photobooth';
import { LiveView } from './components/LiveView';
import './index.css';

const API_BASE_URL = 'http://localhost:5000';
const MAX_PHOTOS = 3;
const TEMPLATE_URL = '/templates/frame.png';

export const App: React.FC = () => {
  const [step, setStep] = useState<PhotoboothStep>('IDLE');
  const [timerSetting, setTimerSetting] = useState<number>(5);
  const [countdown, setCountdown] = useState<number>(5);
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoSlot[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null,
  );

  const liveViewRef = useRef<HTMLDivElement>(null);

  // 1. Reset Total
  const handleReset = () => {
    setStep('IDLE');
    setCapturedPhotos([]);
    setSelectedPhotoIndex(null);
  };

  // Helper Frame Grab dari Video Feed
  const captureFrameFromVideo = (): string | null => {
    const videoEl = liveViewRef.current?.querySelector('video');
    if (!videoEl) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 1920;
    canvas.height = videoEl.videoHeight || 1080;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.95);
    }
    return null;
  };

  // Helper On-Demand Photo Compositor (Gabung Photo + Frame Template saat mau Print)
  // Helper Canvas untuk Resize Foto ke Ukuran Cetak 8.5 cm x 5.4 cm
  const generateCompositeImage = (photoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const photoImg = new Image();
      photoImg.crossOrigin = 'anonymous';

      photoImg.onload = () => {
        // Dimension 8.5 cm x 5.4 cm pada resolusi cetak 300 DPI
        // 8.5 cm = ~1004 px | 5.4 cm = ~638 px
        canvas.width = 1004;
        canvas.height = 638;

        if (ctx) {
          // Draw Foto Langsung Tanpa Frame
          ctx.drawImage(photoImg, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png', 1.0));
        } else {
          reject(new Error('Gagal mendapatkan Context 2D Canvas'));
        }
      };

      photoImg.onerror = () =>
        reject(new Error('Gagal memuat foto hasil jepretan.'));

      photoImg.src = photoUrl;
    });
  };

  // Simpan Base64 ke Backend
  const saveSnapshotToBackend = async (
    base64Image: string,
  ): Promise<string> => {
    const res = await fetch(`${API_BASE_URL}/api/camera/save-snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });

    const data: { success: boolean; imageUrl?: string; message?: string } =
      await res.json();
    if (!data.success || !data.imageUrl) {
      throw new Error(data.message || 'Gagal menyimpan snapshot gambar.');
    }
    return `${API_BASE_URL}${data.imageUrl}`;
  };

  // Direct Print Execution
  const handleManualPrint = async () => {
    if (selectedPhotoIndex === null || !capturedPhotos[selectedPhotoIndex]) {
      alert('Pilih foto terlebih dahulu sebelum mencetak!');
      return;
    }

    setStep('PRINTING');

    try {
      const selectedPhoto = capturedPhotos[selectedPhotoIndex];

      // 1. Resize/Crop Foto On-Demand ke Ukuran Cetak (Tanpa Frame)
      const finalCompositeBase64 = await generateCompositeImage(
        selectedPhoto.url,
      );

      // 2. Hit API backend print
      const res = await fetch(`${API_BASE_URL}/api/printer/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: finalCompositeBase64 }),
      });

      const data: { success: boolean; message: string } = await res.json();
      if (!data.success) throw new Error(data.message);

      alert('Berhasil mengirim perintah cetak ke printer!');
    } catch (error) {
      const err = error as Error;
      alert(`Gagal mencetak: ${err.message}`);
    } finally {
      setStep('SELECT');
    }
  };

  // Sesi Pemotretan
  const startSession = useCallback(async () => {
    setStep('COUNTDOWN');
    setCapturedPhotos([]);
    setSelectedPhotoIndex(null);

    for (let i = 1; i <= MAX_PHOTOS; i++) {
      for (let sec = timerSetting; sec > 0; sec--) {
        setCountdown(sec);
        await new Promise((r) => setTimeout(r, 1000));
      }

      setStep('CAPTURING');
      try {
        const frameDataUrl = captureFrameFromVideo();
        if (!frameDataUrl) {
          throw new Error('Video feed tidak terdeteksi!');
        }

        const photoUrl = await saveSnapshotToBackend(frameDataUrl);
        const now =
          new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';

        setCapturedPhotos((prev) => [
          ...prev,
          { id: i, url: photoUrl, timestamp: now },
        ]);
      } catch (error) {
        const err = error as Error;
        alert(`Error: ${err.message}`);
        setStep('IDLE');
        return;
      }

      if (i < MAX_PHOTOS) {
        setStep('COUNTDOWN');
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setStep('SELECT');
  }, [timerSetting]);

  const selectedPhoto =
    selectedPhotoIndex !== null ? capturedPhotos[selectedPhotoIndex] : null;

  return (
    <div className="min-h-screen bg-[#0d0e12] text-slate-200 font-sans flex flex-col justify-between p-4 select-none">
      {/* 1. TOP NAVBAR HEADER */}
      <header className="flex items-center justify-between bg-[#14161d] px-6 py-3 rounded-2xl border border-slate-800/80 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="font-black tracking-wider text-lg text-white">
              Nu-Studio
            </span>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-500/20">
            ● LIVE HDMI FEED
          </span>
        </div>

        <div className="flex items-center bg-[#0d0e12] p-1 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400">
          <button className="px-4 py-1.5 rounded-lg text-slate-400 hover:text-white">
            Session 04:22
          </button>
          <button className="px-4 py-1.5 rounded-lg bg-[#1f222c] text-white shadow">
            Capture Booth
          </button>
          <button className="px-4 py-1.5 rounded-lg text-slate-400 hover:text-white">
            Strip Editor
          </button>
          <button className="px-4 py-1.5 rounded-lg text-slate-400 hover:text-white">
            Print & Share
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>
            MODE MANUAL PRINT:{' '}
            <strong className="text-cyan-400">PILIH FOTO & KLIK CETAK</strong>
          </span>
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <div className="grid grid-cols-12 gap-4 flex-1">
        {/* LEFT PANEL: CAMERA VIEWPORT */}
        <div className="col-span-7 flex flex-col justify-between bg-[#14161d] p-4 rounded-2xl border border-slate-800/80">
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-mono">
                  HDMI CAPTURE
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded font-mono">
                  1080P 60FPS
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded font-mono">
                  SONY A9 LIVE
                </span>
              </div>
              <span className="text-cyan-400 font-semibold">DIRECT STREAM</span>
            </div>

            <div
              ref={liveViewRef}
              className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center"
            >
              {step === 'IDLE' ||
              step === 'COUNTDOWN' ||
              step === 'CAPTURING' ? (
                <LiveView />
              ) : selectedPhoto ? (
                <img
                  src={selectedPhoto.url}
                  alt="Selected Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-slate-600 text-sm">
                  Pilih foto dari panel kanan untuk melihat preview...
                </div>
              )}

              {step === 'COUNTDOWN' && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="text-8xl font-black text-rose-500 animate-ping">
                    {countdown}
                  </span>
                </div>
              )}

              {step === 'CAPTURING' && (
                <div className="absolute inset-0 bg-white animate-pulse flex items-center justify-center">
                  <span className="text-3xl font-black text-slate-900">
                    CHEESE! 📸
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs bg-[#0d0e12] p-2 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">TIMER:</span>
                {[3, 5, 10].map((sec) => (
                  <button
                    key={sec}
                    disabled={step === 'COUNTDOWN' || step === 'CAPTURING'}
                    onClick={() => setTimerSetting(sec)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      timerSetting === sec
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">FILTER:</span>
                <span className="text-slate-300 font-mono bg-slate-800 px-2.5 py-1 rounded-lg">
                  Classic Studio
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                disabled={
                  step === 'COUNTDOWN' ||
                  step === 'CAPTURING' ||
                  step === 'PRINTING'
                }
                onClick={startSession}
                className="flex-1 py-4 bg-rose-500 hover:bg-rose-400 active:scale-[0.99] disabled:bg-slate-800 text-white font-black text-lg rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📸</span>{' '}
                {step === 'COUNTDOWN'
                  ? 'MEMOTRET...'
                  : 'Mulai Foto (Capture Session)'}
              </button>

              <button
                disabled={step === 'COUNTDOWN' || step === 'CAPTURING'}
                onClick={handleReset}
                className="px-5 py-4 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-300 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Mulai Ulang
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: 3 HASIL FOTO BOOTH */}
        <div className="col-span-5 flex flex-col justify-between bg-[#14161d] p-4 rounded-2xl border border-slate-800/80">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <span>🖼️</span> 3 Hasil Foto Booth
              </h2>
              <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {capturedPhotos.length}/3 Selesai
              </span>
            </div>

            <div className="space-y-3">
              {[0, 1, 2].map((index) => {
                const photo = capturedPhotos[index];
                const isSelected = selectedPhotoIndex === index;

                return (
                  <div
                    key={index}
                    onClick={() => photo && setSelectedPhotoIndex(index)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500/50 ring-1 ring-rose-500/30'
                        : 'bg-[#0d0e12] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                        {photo ? (
                          <img
                            src={photo.url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-600">
                            Empty
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          Foto {index + 1} (#
                          {index + 1 < 10 ? `0${index + 1}` : index + 1})
                          {photo && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {photo.timestamp}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {photo
                            ? 'Klik untuk memilih foto ini'
                            : 'Belum diambil'}
                        </div>
                        {isSelected && (
                          <span className="inline-block mt-1 text-[9px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-md">
                            Terpilih
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500'
                          : 'border-slate-700'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button Section */}
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span>KEEPSAKE OUTPUT CONFIG</span>
              <span className="text-emerald-400 font-bold">
                Dye-Sublimation Ready
              </span>
            </div>

            {/* Tombol Cetak Langsung Aktif Begitu Foto Dipilih */}
            <button
              disabled={selectedPhotoIndex === null || step === 'PRINTING'}
              onClick={handleManualPrint}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>🖨️</span>
              {step === 'PRINTING'
                ? 'Mencetak Foto...'
                : 'Cetak Ulang Foto Terpilih'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. FOOTER */}
      <footer className="flex items-center justify-between text-[11px] text-slate-500 mt-4 px-2">
        <div>
          <strong>Nu-Studio</strong> — PURE PHYSICAL KEEPSAKE ENGINE
        </div>
        <div>PAPER TYPE: 2x6 CLASSIC GLOSSY</div>
      </footer>
    </div>
  );
};

export default App;
