import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { CameraService } from './services/camera.service.js';
import { PrinterService } from './services/printer.service.js';
import fs from 'node:fs';

const app = express();
const PORT = 5000;

// Path Folder Tujuan
const SAVE_DIR = `C:\\Users\\Dennis\\Pictures\\PHOTOBOOTH CAPTURE`;

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
    const { imageDataUrl } = req.body;
    if (!imageDataUrl) {
      return res
        .status(400)
        .json({ success: false, message: 'imageDataUrl wajib diisi.' });
    }

    // Pastikan folder tujuan ada
    if (!fs.existsSync(SAVE_DIR)) {
      fs.mkdirSync(SAVE_DIR, { recursive: true });
    }

    // Convert Base64 ke Buffer
    const base64Data = imageDataUrl.replace(
      /^data:image\/(png|jpeg|jpg);base64,/,
      '',
    );
    const fileName = `capture_${Date.now()}.png`;
    const filePath = path.join(SAVE_DIR, fileName);

    // Simpan file ke disk
    await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'));

    console.log(`Foto berhasil disimpan di: ${filePath}`);
    return res.json({
      success: true,
      message: 'Foto berhasil disimpan!',
      filePath,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Gagal menyimpan foto:', err);
    return res.status(500).json({ success: false, message: err.message });
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
