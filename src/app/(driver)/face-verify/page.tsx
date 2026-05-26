'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const DOC_TYPE_LABELS: Record<string, string> = {
  DRIVERS_LICENSE: "Driver's License",
  PASSPORT: 'Passport',
  GREEN_CARD: 'Green Card / EAD',
  BIRTH_CERTIFICATE: 'Birth Certificate',
  OTHER: 'Other Government ID',
}

type Status = 'idle' | 'streaming' | 'captured' | 'submitting' | 'passed' | 'failed' | 'error'

export default function FaceVerifyPage() {
  const searchParams = useSearchParams()
  const documentId = searchParams.get('documentId')
  const documentType = searchParams.get('documentType') ?? ''

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null)
  const [score, setScore] = useState<number | null>(null)

  // Wire up the stream after the video element mounts (status change triggers re-render first)
  useEffect(() => {
    if (status === 'streaming' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [status])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      })
      streamRef.current = stream
      setStatus('streaming')
      setMessage('')
    } catch {
      setMessage('Camera access denied. Please allow camera access in your browser settings.')
      setStatus('error')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedDataUrl(dataUrl)
    stopCamera()
    setStatus('captured')
  }, [stopCamera])

  const retake = useCallback(() => {
    setCapturedDataUrl(null)
    setStatus('idle')
    setMessage('')
    setScore(null)
  }, [])

  const submitVerification = useCallback(async () => {
    if (!capturedDataUrl || !documentId) return
    setStatus('submitting')
    setMessage('Comparing face to your ID document...')

    try {
      const res = await fetch(capturedDataUrl)
      const blob = await res.blob()
      const form = new FormData()
      form.append('image', new File([blob], 'face.jpg', { type: 'image/jpeg' }))
      form.append('documentId', documentId)

      const response = await fetch('/api/verify/face', { method: 'POST', body: form })
      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error ?? 'Verification failed')
        setStatus('error')
        return
      }

      setScore(data.score)
      if (data.passed) {
        setStatus('passed')
        setMessage(`Face verified! Similarity score: ${Math.round(data.score)}%`)
      } else {
        setStatus('failed')
        setMessage(`Face did not match. Score: ${Math.round(data.score)}%. Please ensure your full face is visible and matches your ID photo.`)
      }
    } catch {
      setMessage('Network error. Please try again.')
      setStatus('error')
    }
  }, [capturedDataUrl])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Face Verification</h1>
          <p className="text-sm text-gray-500 mt-1">We&apos;ll compare your live photo to your uploaded ID document.</p>
        </div>
        <Link href="/documents" className="text-sm text-brand-600 hover:underline">Back to Documents</Link>
      </div>

      {!documentId ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-5 text-sm">
          No document selected. Please go to{' '}
          <Link href="/documents" className="font-medium underline">Documents</Link>{' '}
          and click <strong>Verify Face</strong> next to the document you want to verify.
        </div>
      ) : (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-5 py-3 mb-6 flex items-center gap-3">
          <span className="text-brand-600 text-lg">🪪</span>
          <p className="text-sm text-brand-800">
            Verifying against: <strong>{DOC_TYPE_LABELS[documentType] ?? documentType}</strong>
          </p>
        </div>
      )}

      {documentId && <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Camera / captured image */}
        <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative mb-5 max-w-lg mx-auto">
          {status === 'streaming' && (
            <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay playsInline muted />
          )}
          {capturedDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedDataUrl} alt="Captured face" className="w-full h-full object-cover scale-x-[-1]" />
          )}
          {status === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4">
              <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center mb-3 text-3xl">👤</div>
              <p className="text-sm text-white/80">Camera preview will appear here</p>
            </div>
          )}
          {/* Face guide overlay */}
          {status === 'streaming' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-56 border-2 border-white/60 rounded-full opacity-60" />
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Instructions */}
        {(status === 'idle' || status === 'streaming') && (
          <ul className="text-sm text-gray-600 space-y-1 mb-5 list-disc list-inside">
            <li>Ensure your face is well-lit and clearly visible</li>
            <li>Remove glasses, hats, or anything covering your face</li>
            <li>Position your face within the oval guide</li>
          </ul>
        )}

        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm mb-5 ${
            status === 'passed' ? 'bg-green-50 border border-green-200 text-green-700' :
            status === 'failed' || status === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
            'bg-blue-50 border border-blue-200 text-blue-700'
          }`}>
            {message}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {status === 'idle' && (
            <button onClick={startCamera} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors">
              Start Camera
            </button>
          )}
          {status === 'streaming' && (
            <button onClick={capturePhoto} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors">
              Take Photo
            </button>
          )}
          {status === 'captured' && (
            <>
              <button onClick={retake} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg py-2.5 text-sm transition-colors">
                Retake
              </button>
              <button onClick={submitVerification} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors">
                Submit for Verification
              </button>
            </>
          )}
          {status === 'submitting' && (
            <button disabled className="flex-1 bg-brand-600 opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm cursor-not-allowed">
              Verifying...
            </button>
          )}
          {status === 'passed' && (
            <Link href="/documents" className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors">
              Back to Documents
            </Link>
          )}
          {(status === 'failed' || status === 'error') && (
            <button onClick={retake} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors">
              Try Again
            </button>
          )}
        </div>
      </div>}
    </div>
  )
}
