import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET ?? "nova-gym-private";
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "http://127.0.0.1:9000",
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minio",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "change-before-enabling-storage",
  },
});

let bucketReady: Promise<void> | undefined;
export function ensurePrivateBucket() {
  bucketReady ??= (async () => {
    try { await client.send(new HeadBucketCommand({ Bucket: bucket })); }
    catch { await client.send(new CreateBucketCommand({ Bucket: bucket })); }
  })();
  return bucketReady;
}

export async function putPrivateObject(key: string, body: Buffer, contentType: string) {
  await ensurePrivateBucket();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function getPrivateObject(key: string) {
  await ensurePrivateBucket();
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error("Empty storage object");
  return { body: await result.Body.transformToByteArray(), contentType: result.ContentType ?? "application/octet-stream" };
}

export async function checkPrivateStorage() {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
}
