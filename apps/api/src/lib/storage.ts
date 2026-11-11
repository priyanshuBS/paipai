/**
 * File storage behind a small provider interface. Cloudflare R2 (S3
 * compatible) is the default implementation; when R2 isn't configured the
 * feature is disabled and clients hide receipt/avatar uploads.
 */
import { AwsClient } from 'aws4fetch';
import type { PresignUploadInput, PresignUploadResult } from '@paipai/shared/schemas';
import type { Env } from '../env';

export interface StorageProvider {
  /** Public base URL that stored files are served from. */
  publicBaseUrl: string;
  presignPut(key: string, contentType: string): Promise<PresignUploadResult>;
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

export function createStorage(env: Env): StorageProvider | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL)
    return null;

  const client = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
  const publicBaseUrl = R2_PUBLIC_URL.replace(/\/$/, '');

  return {
    publicBaseUrl,
    async presignPut(key, contentType) {
      const url = new URL(`${endpoint}/${key}`);
      url.searchParams.set('X-Amz-Expires', '600');
      const signed = await client.sign(
        new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }),
        {
          aws: { signQuery: true },
        },
      );
      return {
        uploadUrl: signed.url,
        publicUrl: `${publicBaseUrl}/${key}`,
        headers: { 'Content-Type': contentType },
      };
    },
  };
}

export function uploadKey(userId: string, input: PresignUploadInput): string {
  const safeUser = userId.replace(/[^A-Za-z0-9_-]/g, '');
  return `${input.kind}s/${safeUser}/${crypto.randomUUID()}.${EXT[input.contentType] ?? 'bin'}`;
}

/** A receipt/avatar URL is only accepted if it points at our own bucket, inside the user's folder. */
export function isOwnUpload(storage: StorageProvider | null, userId: string, url: string): boolean {
  if (!storage) return false;
  const safeUser = userId.replace(/[^A-Za-z0-9_-]/g, '');
  return (
    /^(receipts|avatars)\//.test(url.slice(storage.publicBaseUrl.length + 1)) &&
    url.startsWith(`${storage.publicBaseUrl}/`) &&
    url.includes(`/${safeUser}/`)
  );
}
