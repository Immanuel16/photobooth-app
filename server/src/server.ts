import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { CameraService } from './services/camera.service.js';
import { PrinterService } from './services/printer.service.js';
import fs from 'node:fs';

const app = express();
const PORT = 5000;

// Path Folder Tujuan
const TARGET_DIR = `C:\\Users\\Dennis\\Pictures\\PHOTOBOOTH CAPTURE`;
// C:\Users\202202740\Pictures\PHOTOBOOTH

const cameraService = new CameraService();
const printerService = new PrinterService();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(TARGET_DIR));

// Endpoint saat React menekan tombol Shutter / Countdown Selesai
app.post('/api/camera/save-snapshot', async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res
        .status(400)
        .json({ success: false, message: 'Data image wajib dikirim.' });
    }

    // Pastikan folder C:\Users\Dennis\Pictures\PHOTOBOOTH CAPTURE sudah dibuat
    if (!fs.existsSync(TARGET_DIR)) {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    // Cleaning string Base64
    const base64Data = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    // Penamaan file unik berdasarkan timestamp
    const fileName = `capture_${Date.now()}.jpg`;
    const fullPath = path.join(TARGET_DIR, fileName);

    // Simpan file ke direktori Pictures
    await fs.promises.writeFile(fullPath, Buffer.from(base64Data, 'base64'));

    console.log(`Foto berhasil disimpan di: ${fullPath}`);

    // Kembalikan URL statis agar frontend dapat menampilkan gambarnya
    return res.json({
      success: true,
      imageUrl: `/uploads/${fileName}`,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Gagal menyimpan snapshot:', err);
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
