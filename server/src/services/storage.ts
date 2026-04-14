/**
 * S3-compatible storage service.
 * Works with AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO, etc.
 *
 * Required env vars (when S3_BUCKET is set):
 *   S3_BUCKET        — bucket name
 *   S3_REGION        — e.g. "us-east-1" or "auto" for R2
 *   S3_ACCESS_KEY    — access key ID
 *   S3_SECRET_KEY    — secret access key
 *   S3_ENDPOINT      — (optional) custom endpoint for R2/Spaces/MinIO
 *   S3_PUBLIC_URL    — (optional) public URL prefix, e.g. "https://pub-xxx.r2.dev"
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

let s3Client: S3Client | null = null;

const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION || 'us-east-1';
const endpoint = process.env.S3_ENDPOINT;
const publicUrl = process.env.S3_PUBLIC_URL; // e.g. https://pub-xxx.r2.dev

export function isS3Configured(): boolean {
  return !!(bucket && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
}

function getClient(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    });
  }
  return s3Client;
}

/**
 * Upload a file buffer to S3.
 * Returns the public URL of the uploaded file.
 */
export async function uploadToS3(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const uniqueId = crypto.randomBytes(12).toString('hex');
  const ext = path.extname(originalName).toLowerCase();
  const key = `uploads/${uniqueId}${ext}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    }),
  );

  // Return a public URL
  if (publicUrl) {
    return `${publicUrl}/${key}`;
  }
  // Default S3 URL
  if (endpoint) {
    return `${endpoint}/${bucket}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Delete a file from S3 by its full URL.
 */
export async function deleteFromS3(fileUrl: string): Promise<void> {
  // Extract the key from the URL
  let key: string;
  if (publicUrl && fileUrl.startsWith(publicUrl)) {
    key = fileUrl.slice(publicUrl.length + 1);
  } else {
    // Try to extract "uploads/..." from the URL
    const match = fileUrl.match(/uploads\/[a-f0-9]+\.\w+/);
    key = match ? match[0] : fileUrl;
  }

  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucket!,
      Key: key,
    }),
  );
}
