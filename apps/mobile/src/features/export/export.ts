import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

/** Download a CSV/PDF export with the session cookie, then open the share sheet. */
export async function exportAndShare(
  format: 'csv' | 'pdf',
  from: string,
  to: string,
): Promise<void> {
  const cookie = await authClient.getCookie();
  const target = new File(Paths.cache, `paipai-${from}-to-${to}.${format}`);
  const file = await File.downloadFileAsync(api.exportUrl(format, from, to), target, {
    headers: cookie ? { Cookie: cookie } : {},
    idempotent: true,
  });
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(file.uri, {
    mimeType: format === 'pdf' ? 'application/pdf' : 'text/csv',
    dialogTitle: 'Export PaiPai transactions',
    UTI: format === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text',
  });
}
