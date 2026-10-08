import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const limit = 2 * 1024 * 1024

let client: S3Client | null = null

function storage() {
  const env = serverEnv()
  if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey || !env.r2Bucket || !env.r2PublicUrl) {
    throw createError({ statusCode: 503, statusMessage: 'Image storage is not configured.' })
  }
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2AccessKeyId,
        secretAccessKey: env.r2SecretAccessKey
      }
    })
  }
  return { client, env }
}

export function imageType(bytes: Uint8Array) {
  if (bytes.length > limit) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
  const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  if (riff && webp) return 'image/webp'
  return null
}

export async function storeImage(folder: 'products' | 'categories' | 'users', ownerId: string, bytes: Uint8Array, type: string) {
  const { client: s3, env } = storage()
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'
  const key = `${folder}/${ownerId}/${crypto.randomUUID()}.${ext}`
  try {
    await s3.send(new PutObjectCommand({
      Bucket: env.r2Bucket,
      Key: key,
      Body: bytes,
      ContentType: type
    }))
  } catch (error) {
    logEvent('error', 'Could not store product image', {
      name: error instanceof Error ? error.name : 'UnknownError'
    })
    throw createError({ statusCode: 502, statusMessage: 'Could not store the image.' })
  }
  return { key, url: `${env.r2PublicUrl.replace(/\/$/, '')}/${key}` }
}

export async function removeStoredObject(key: string) {
  const { client: s3, env } = storage()
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: env.r2Bucket, Key: key }))
  } catch (error) {
    logEvent('error', 'Could not remove product image', {
      name: error instanceof Error ? error.name : 'UnknownError'
    })
  }
}
