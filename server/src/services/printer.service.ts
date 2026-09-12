import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import { getDefaultPrinterName } from '../utils/index.js';

export class PrinterService {
  public async printImage(dataUrl: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      let imgPath = '';
      let pdfPath = '';

      try {
        // 1. Validasi & decode Base64 (PNG, JPG, JPEG)
        const base64Data = dataUrl.replace(
          /^data:image\/(png|jpeg|jpg);base64,/,
          '',
        );
        const tempDir = path.join(import.meta.dirname, '../../temp');

        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const timestamp = Date.now();
        imgPath = path.join(tempDir, `print_${timestamp}.png`);
        pdfPath = path.join(tempDir, `print_${timestamp}.pdf`);

        fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));

        // 2. Buat PDF dengan ukuran 8.5 cm x 5.4 cm (241 pt x 153 pt)
        const pdfWidth = 241;
        const pdfHeight = 153;

        const doc = new PDFDocument({ size: [pdfWidth, pdfHeight], margin: 0 });
        const stream = fs.createWriteStream(pdfPath);

        doc.pipe(stream);
        doc.image(imgPath, 0, 0, { width: pdfWidth, height: pdfHeight });
        doc.end();

        stream.on('finish', async () => {
          try {
            // 3. Auto-detect printer terhubung
            const defaultPrinter = await getDefaultPrinterName();

            let command = '';
            if (process.platform === 'win32') {
              command = `Powershell.exe -Command "Start-Process –FilePath '${pdfPath}' –Verb Print"`;
            } else {
              // macOS / Linux: Jika printer ditemukan gunakan flag -d, jika tidak langsung lp (CUPS default)
              command = defaultPrinter
                ? `lp -d "${defaultPrinter}" '${pdfPath}'`
                : `lp '${pdfPath}'`;
            }

            // 4. Eksekusi perintah Silent Print
            exec(command, (error) => {
              // Hapus file sampah setelah perintah dikirim ke printer spooler
              this.cleanupFiles(imgPath, pdfPath);

              if (error) {
                console.error('Print command error:', error);
                return reject(error);
              }
              resolve(true);
            });
          } catch (err) {
            this.cleanupFiles(imgPath, pdfPath);
            reject(err);
          }
        });

        stream.on('error', (err) => {
          this.cleanupFiles(imgPath, pdfPath);
          reject(err);
        });
      } catch (error) {
        this.cleanupFiles(imgPath, pdfPath);
        reject(error);
      }
    });
  }

  private cleanupFiles(...filePaths: string[]) {
    filePaths.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err)
            console.error(`Gagal menghapus temp file (${filePath})`, err);
        });
      }
    });
  }
}
