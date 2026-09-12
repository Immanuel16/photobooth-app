import path from 'node:path';
import fs from 'node:fs';

export class CameraService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(import.meta.dirname, '../../uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Menyimpan string Base64 dari Canvas Capture menjadi file gambar JPG di server
   * @param base64Data Data Base64 (misal: "data:image/jpeg;base64,...")
   * @returns Relative URL file yang tersimpan (misal: "/uploads/capture_1700000000000.jpg")
   */
  public async saveSnapshot(base64Data: string): Promise<string> {
    if (!base64Data) {
      throw new Error('Data gambar base64 tidak boleh kosong.');
    }

    // Hilangkan prefix "data:image/jpeg;base64," atau format header Base64 lainnya
    const pureBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(pureBase64, 'base64');

    const filename = `capture_${Date.now()}.jpg`;
    const filePath = path.join(this.uploadsDir, filename);

    // Tulis buffer file secara asynchronous
    await fs.promises.writeFile(filePath, buffer);

    return `/uploads/${filename}`;
  }
}
