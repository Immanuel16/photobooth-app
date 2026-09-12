import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { CameraService } from './services/camera.service.js';
import { PrinterService } from './services/printer.service.js';

const app = express();
const PORT = 5000;

const cameraService = new CameraService();
const printerService = new PrinterService();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(
  '/uploads',
  express.static(path.join(import.meta.dirname, '../uploads')),
);

// Endpoint saat React menekan tombol Shutter / Countdown Selesai
app.post('/api/camera/save-snapshot', async (req: Request, res: Response) => {
  try {
    const { image } = req.body;

    // Simpan snapshot via CameraService
    const imageUrl = await cameraService.saveSnapshot(image);

    return res.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal menyimpan snapshot gambar.',
    });
  }
});

// Endpoint Silent Print
app.post('/api/printer/print', async (req: Request, res: Response) => {
  try {
    const { imageDataUrl } = req.body;
    if (!imageDataUrl) {
      return res
        .status(400)
        .json({ success: false, message: 'imageDataUrl wajib diisi.' });
    }

    await printerService.printImage(imageDataUrl);
    res.json({ success: true, message: 'Berhasil dikirim ke printer.' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(
    `⚡ Express Server Photobooth (Sony A9) aktif di http://localhost:${PORT}`,
  );
});
