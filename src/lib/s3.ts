import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET!

export async function uploadDocument(
  driverId: string,
  fileBuffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<string> {
  const ext = originalName.split('.').pop() ?? 'bin'
  const key = `drivers/${driverId}/documents/${uuidv4()}.${ext}`

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
      Metadata: { driverId, originalName },
    })
  )
  return key
}

export async function uploadFaceCapture(
  driverId: string,
  imageBuffer: Buffer
): Promise<string> {
  const key = `drivers/${driverId}/face/${uuidv4()}.jpg`
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
      ServerSideEncryption: 'AES256',
    })
  )
  return key
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 300): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  )
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export async function uploadProfilePhoto(
  driverId: string,
  imageBuffer: Buffer
): Promise<string> {
  const key = `drivers/${driverId}/profile/photo.jpg`
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
      ServerSideEncryption: 'AES256',
    })
  )
  return key
}

export async function uploadRecording(
  driverId: string,
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
  const key = `drivers/${driverId}/recordings/${uuidv4()}.${ext}`
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: audioBuffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    })
  )
  return key
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
