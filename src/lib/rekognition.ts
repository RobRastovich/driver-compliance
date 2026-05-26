import {
  RekognitionClient,
  CompareFacesCommand,
  DetectFacesCommand,
} from '@aws-sdk/client-rekognition'

const rekognition = new RekognitionClient({
  region: process.env.APP_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.APP_AWS_S3_BUCKET!
const SIMILARITY_THRESHOLD = 90 // 90% similarity required

export interface FaceMatchResult {
  matched: boolean
  score: number
  error?: string
}

export async function compareFaces(
  idDocumentS3Key: string,
  livePhotoS3Key: string
): Promise<FaceMatchResult> {
  try {
    const command = new CompareFacesCommand({
      SourceImage: { S3Object: { Bucket: BUCKET, Name: idDocumentS3Key } },
      TargetImage: { S3Object: { Bucket: BUCKET, Name: livePhotoS3Key } },
      SimilarityThreshold: SIMILARITY_THRESHOLD,
    })

    const response = await rekognition.send(command)
    const matches = response.FaceMatches ?? []

    if (matches.length === 0) {
      return { matched: false, score: 0 }
    }

    const topMatch = matches[0]
    const score = topMatch.Similarity ?? 0
    return { matched: score >= SIMILARITY_THRESHOLD, score }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { matched: false, score: 0, error: message }
  }
}

export async function detectLiveFace(imageS3Key: string): Promise<boolean> {
  try {
    const command = new DetectFacesCommand({
      Image: { S3Object: { Bucket: BUCKET, Name: imageS3Key } },
      Attributes: ['DEFAULT'],
    })
    const response = await rekognition.send(command)
    return (response.FaceDetails?.length ?? 0) > 0
  } catch {
    return false
  }
}
