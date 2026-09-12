import { exec } from 'node:child_process';

import util from 'node:util';

export const execPromise = util.promisify(exec);

export const getDefaultPrinterName = async (): Promise<string | null> => {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execPromise(
        `Powershell.exe -Command "Get-CimInstance -ClassName Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object -ExpandProperty Name"`,
      );
      return stdout.trim() || null;
    } else {
      const { stdout } = await execPromise('lpstat -d');
      const match = stdout.match(/system default destination:\s*(.+)/);
      return match ? match[1].trim() : null;
    }
  } catch (error) {
    console.error('Gagal mengambil data printer', error);
    return null;
  }
};
