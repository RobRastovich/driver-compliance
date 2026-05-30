'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface Sentence {
  id: string
  text: string
}

type TestStatus = 'loading' | 'ready' | 'recording' | 'reviewing' | 'scored' | 'submitting' | 'passed' | 'failed'
type FaceStatus = 'idle' | 'checking' | 'passed' | 'failed' | 'no-face' | 'no-photo' | 'skipped'

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}
interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

// Mirrors the server-side scorer in src/lib/reading.ts
const NUMBER_WORDS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11',
  twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16',
  seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20', thirty: '30',
  forty: '40', fifty: '50', sixty: '60', seventy: '70', eighty: '80', ninety: '90',
  hundred: '100', thousand: '1000',
}

function normalizeWords(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).map((w) => NUMBER_WORDS[w] ?? w)
}

function scoreSentence(expected: string, transcribed: string): number {
  const expectedWords = normalizeWords(expected)
  const transcribedWords = normalizeWords(transcribed)
  let matches = 0
  const copy = [...transcribedWords]
  for (const word of expectedWords) {
    const idx = copy.indexOf(word)
    if (idx !== -1) { matches++; copy.splice(idx, 1) }
  }
  return expectedWords.length > 0 ? matches / expectedWords.length : 0
}

const PASSING_SCORE = 0.70

export default function ReadingTestPage() {
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [transcriptions, setTranscriptions] = useState<string[]>([])
  const [sentenceScores, setSentenceScores] = useState<number[]>([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [currentScore, setCurrentScore] = useState<number | null>(null)
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('idle')
  const [status, setStatus] = useState<TestStatus>('loading')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ passed: boolean; score: number } | null>(null)
  const [speechSupported, setSpeechSupported] = useState(true)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const recordingActiveRef = useRef(false)
  const accumulatedRef = useRef('')

  // Audio capture refs
  const micStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioBlobsRef = useRef<(Blob | null)[]>([])
  const recordingStartRef = useRef<number>(0)

  // Webcam refs for identity verification
  const webcamVideoRef = useRef<HTMLVideoElement>(null)
  const webcamCanvasRef = useRef<HTMLCanvasElement>(null)
  const webcamStreamRef = useRef<MediaStream | null>(null)

  // Release all streams when leaving the page
  useEffect(() => {
    return () => {
      micStreamRef.current?.getTracks().forEach((t) => t.stop())
      webcamStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Wire up webcam video element once the DOM node mounts during recording
  useEffect(() => {
    if (status === 'recording' && webcamVideoRef.current && webcamStreamRef.current) {
      webcamVideoRef.current.srcObject = webcamStreamRef.current
      webcamVideoRef.current.play().catch(() => {})
    }
  }, [status])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      setError('Your browser does not support speech recognition. Please use Chrome or Edge.')
      setStatus('ready')
    }
  }, [])

  useEffect(() => {
    async function loadSentences() {
      try {
        const res = await fetch('/api/verify/reading/sentences')
        if (!res.ok) {
          const d = await res.json()
          setError(d.error ?? 'Failed to load test')
          setStatus('ready')
          return
        }
        const data: Sentence[] = await res.json()
        setSentences(data)
        setTranscriptions(new Array(data.length).fill(''))
        setSentenceScores(new Array(data.length).fill(-1))
        audioBlobsRef.current = new Array(data.length).fill(null)
        setStatus('ready')
      } catch {
        setError('Network error loading test sentences.')
        setStatus('ready')
      }
    }
    loadSentences()
  }, [])

  const startSession = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognition || !recordingActiveRef.current) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) {
          accumulatedRef.current += r[0].transcript + ' '
        } else {
          interim += r[0].transcript
        }
      }
      setCurrentTranscript(accumulatedRef.current)
      setInterimTranscript(interim)
    }

    recognition.onerror = (e: Event) => {
      const err = (e as Event & { error?: string }).error
      if (err === 'no-speech' && recordingActiveRef.current) { startSession(); return }
      setError('Microphone error. Please check your microphone and try again.')
      setStatus('ready')
    }

    recognition.onend = () => {
      setInterimTranscript('')
      if (recordingActiveRef.current) startSession()
    }

    recognition.start()
    recognitionRef.current = recognition
  }, [])

  const verifyFaceCapture = useCallback(async (canvas: HTMLCanvasElement) => {
    return new Promise<void>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { setFaceStatus('skipped'); resolve(); return }
        const form = new FormData()
        form.append('image', new File([blob], 'face-capture.jpg', { type: 'image/jpeg' }))
        try {
          const res = await fetch('/api/verify/face/reading', { method: 'POST', body: form })
          const data = await res.json()
          if (!res.ok) {
            setFaceStatus(data.reason === 'no-profile-photo' ? 'no-photo' : 'skipped')
          } else if (data.noFace) {
            setFaceStatus('no-face')
          } else {
            setFaceStatus(data.passed ? 'passed' : 'failed')
          }
        } catch {
          setFaceStatus('skipped')
        }
        resolve()
      }, 'image/jpeg', 0.88)
    })
  }, [])

  const startRecording = useCallback(async () => {
    accumulatedRef.current = ''
    recordingActiveRef.current = true
    setCurrentTranscript('')
    setInterimTranscript('')
    setCurrentScore(null)
    setFaceStatus('idle')

    // Acquire mic stream once; reuse across sentences
    if (!micStreamRef.current) {
      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        setError('Microphone access denied. Please allow microphone access and try again.')
        recordingActiveRef.current = false
        return
      }
    }

    // Start webcam for identity capture (independent of mic stream)
    if (!webcamStreamRef.current) {
      try {
        webcamStreamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        })
      } catch {
        // Webcam unavailable — proceed without face verification
        webcamStreamRef.current = null
      }
    }

    // Start MediaRecorder for this sentence
    audioChunksRef.current = []
    const recorder = new MediaRecorder(micStreamRef.current)
    recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
    recorder.start()
    mediaRecorderRef.current = recorder
    recordingStartRef.current = Date.now()

    setStatus('recording')
    startSession()
  }, [startSession])

  const scoreAndReview = useCallback((sentenceIdx: number, transcript: string) => {
    const score = scoreSentence(sentences[sentenceIdx]?.text ?? '', transcript)
    setCurrentScore(score)
    setStatus('scored')
  }, [sentences])

  const handleStopRecording = useCallback(() => {
    recordingActiveRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    const transcript = accumulatedRef.current.trim()
    setCurrentTranscript(transcript)
    scoreAndReview(currentIdx, transcript)

    // Capture audio blob for this sentence
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      const durationSecs = (Date.now() - recordingStartRef.current) / 1000
      const idx = currentIdx
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        audioBlobsRef.current[idx] = Object.assign(blob, { durationSecs })
      }
      recorder.stop()
    }
    mediaRecorderRef.current = null

    // Capture webcam frame and run face verification in background
    const video = webcamVideoRef.current
    const canvas = webcamCanvasRef.current
    if (video && canvas && webcamStreamRef.current) {
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      canvas.getContext('2d')?.drawImage(video, 0, 0)
      webcamStreamRef.current.getTracks().forEach((t) => t.stop())
      webcamStreamRef.current = null
      setFaceStatus('checking')
      verifyFaceCapture(canvas)
    } else {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop())
        webcamStreamRef.current = null
      }
      setFaceStatus('skipped')
    }
  }, [currentIdx, scoreAndReview, verifyFaceCapture])

  const confirmSentence = useCallback(() => {
    const transcript = currentTranscript.trim()
    const score = scoreSentence(sentences[currentIdx]?.text ?? '', transcript)

    const updatedTranscriptions = [...transcriptions]
    updatedTranscriptions[currentIdx] = transcript
    setTranscriptions(updatedTranscriptions)

    const updatedScores = [...sentenceScores]
    updatedScores[currentIdx] = score
    setSentenceScores(updatedScores)

    setCurrentTranscript('')
    setCurrentScore(null)
    setFaceStatus('idle')
    accumulatedRef.current = ''

    if (currentIdx < sentences.length - 1) {
      setCurrentIdx((i) => i + 1)
      setStatus('ready')
    } else {
      setStatus('submitting')
      submitTest(updatedTranscriptions)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTranscript, currentIdx, sentences, transcriptions, sentenceScores])

  async function uploadRecordings() {
    const blobs = audioBlobsRef.current
    await Promise.all(
      blobs.map(async (blob, i) => {
        if (!blob) return
        const form = new FormData()
        const ext = blob.type.includes('ogg') ? 'ogg' : 'webm'
        form.append('audio', new File([blob], `sentence-${i + 1}.${ext}`, { type: blob.type }))
        form.append('sentenceIdx', String(i))
        form.append('sentenceText', sentences[i]?.text ?? '')
        const duration = (blob as Blob & { durationSecs?: number }).durationSecs
        if (duration) form.append('durationSecs', String(duration))
        await fetch('/api/recordings', { method: 'POST', body: form })
      })
    )
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    micStreamRef.current = null
  }

  async function submitTest(finalTranscriptions: string[]) {
    setError('')
    try {
      const res = await fetch('/api/verify/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentenceIds: sentences.map((s) => s.id),
          transcriptions: finalTranscriptions,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Submission failed')
        setStatus('failed')
        return
      }
      uploadRecordings().catch(console.error)
      setResult({ passed: data.passed, score: data.score })
      setStatus(data.passed ? 'passed' : 'failed')
    } catch {
      setError('Network error. Please try again.')
      setStatus('failed')
    }
  }

  const current = sentences[currentIdx]
  const completedCount = sentenceScores.filter((s) => s >= 0).length
  const runningAvg = completedCount > 0
    ? sentenceScores.filter((s) => s >= 0).reduce((a, b) => a + b, 0) / completedCount
    : null
  const progress = sentences.length > 0
    ? ((currentIdx + (status === 'passed' || status === 'failed' ? 1 : 0)) / sentences.length) * 100
    : 0

  const faceBadge = () => {
    if (faceStatus === 'idle') return null
    const configs: Record<FaceStatus, { label: string; cls: string } | null> = {
      idle: null,
      checking: { label: '🔄 Verifying identity…', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
      passed: { label: '✓ Identity verified', cls: 'bg-green-50 text-green-700 border-green-200' },
      failed: { label: '✗ Identity mismatch', cls: 'bg-red-50 text-red-700 border-red-200' },
      'no-face': { label: '⚠ No face detected — ensure camera is visible', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      'no-photo': { label: '⚠ Add a profile photo to enable identity verification', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      skipped: { label: 'Identity check unavailable', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
    }
    const cfg = configs[faceStatus]
    if (!cfg) return null
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${cfg.cls}`}>
        {cfg.label}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">English Reading Test</h1>
          <p className="text-sm text-gray-500 mt-1">Read each sentence aloud clearly into your microphone.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">Dashboard</Link>
      </div>

      {sentences.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Sentence {Math.min(currentIdx + 1, sentences.length)} of {sentences.length}</span>
            <div className="flex items-center gap-3">
              {runningAvg !== null && (
                <span className={`font-semibold ${runningAvg >= PASSING_SCORE ? 'text-green-600' : 'text-red-500'}`}>
                  Running avg: {Math.round(runningAvg * 100)}%
                </span>
              )}
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-brand-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {status === 'loading' && (
          <div className="text-center py-12 text-gray-400">Loading test...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">{error}</div>
        )}

        {(status === 'ready' || status === 'recording' || status === 'reviewing' || status === 'scored') && current && (
          <>
            {/* Sentence to read */}
            <div className={`border-2 rounded-xl p-6 mb-5 text-center transition-colors
              ${status === 'scored' && currentScore !== null
                ? currentScore >= PASSING_SCORE ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                : 'bg-gray-50 border-gray-200'}`}
            >
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Read this aloud:</p>
              <p className="text-lg font-medium text-gray-900 leading-relaxed">{current.text}</p>
            </div>

            {/* Transcription display */}
            {(status === 'recording' || status === 'reviewing' || status === 'scored') && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 min-h-[70px]">
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Your transcription:</p>
                <p className="text-sm text-gray-800">
                  {currentTranscript}
                  {interimTranscript && <span className="text-gray-400 italic">{interimTranscript}</span>}
                  {!currentTranscript && !interimTranscript && status === 'recording' && (
                    <span className="text-gray-400 italic">Listening...</span>
                  )}
                </p>
              </div>
            )}

            {/* Immediate score + face verification result */}
            {status === 'scored' && currentScore !== null && (
              <div className="mb-5 space-y-2">
                <div className={`rounded-xl px-5 py-4 flex items-center gap-4
                  ${currentScore >= PASSING_SCORE ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0
                    ${currentScore >= PASSING_SCORE ? 'bg-green-500 text-white' : 'bg-red-400 text-white'}`}
                  >
                    {Math.round(currentScore * 100)}
                  </div>
                  <div>
                    <p className={`font-semibold ${currentScore >= PASSING_SCORE ? 'text-green-800' : 'text-red-700'}`}>
                      {currentScore >= PASSING_SCORE ? 'Good job!' : 'Low score — consider re-recording'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {Math.round(currentScore * 100)}% match · {currentIdx < sentences.length - 1 ? 'Continue to next sentence or re-record.' : 'Submit when ready.'}
                    </p>
                  </div>
                </div>
                {faceBadge()}
              </div>
            )}

            {/* Recording area with webcam preview */}
            {status === 'recording' && (
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm text-red-600 font-medium">Recording — speak clearly</span>
                </div>
                {/* Webcam preview */}
                <div className="relative w-24 h-18 rounded-lg overflow-hidden bg-gray-900 border border-gray-300 flex-shrink-0">
                  <video
                    ref={webcamVideoRef}
                    className="w-24 h-18 object-cover scale-x-[-1]"
                    autoPlay
                    playsInline
                    muted
                  />
                  <div className="absolute bottom-1 left-1 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {status === 'ready' && (
              <div className="text-sm text-gray-500 mb-5 space-y-1">
                <p>Click <strong>Start Recording</strong>, read the sentence aloud, then click <strong>Stop</strong>.</p>
                <p className="text-xs text-gray-400">Your camera will be used for identity verification while you read.</p>
              </div>
            )}

            {/* Hidden canvas for webcam capture */}
            <canvas ref={webcamCanvasRef} className="hidden" />

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {status === 'ready' && speechSupported && (
                <button onClick={startRecording} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors">
                  Start Recording
                </button>
              )}
              {status === 'recording' && (
                <button onClick={handleStopRecording} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors">
                  Stop Recording
                </button>
              )}
              {(status === 'reviewing' || status === 'scored') && (
                <>
                  <button
                    onClick={() => { setCurrentTranscript(''); setCurrentScore(null); setFaceStatus('idle'); accumulatedRef.current = ''; setStatus('ready') }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg py-2.5 text-sm transition-colors"
                  >
                    Re-record
                  </button>
                  <button
                    onClick={confirmSentence}
                    disabled={!currentTranscript.trim() || faceStatus === 'checking'}
                    className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
                  >
                    {faceStatus === 'checking' ? 'Verifying…' : currentIdx < sentences.length - 1 ? 'Next Sentence' : 'Submit Test'}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {status === 'submitting' && (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Saving results...</p>
          </div>
        )}

        {status === 'passed' && result && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">✓</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Reading Test Passed!</h2>
            <p className="text-gray-600 mb-1">Overall score: <strong>{Math.round(result.score * 100)}%</strong></p>
            <p className="text-sm text-gray-500 mb-8">Your English reading comprehension has been verified.</p>
            <Link href="/dashboard" className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors">
              View Verification Dashboard
            </Link>
          </div>
        )}

        {status === 'failed' && result && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 border-2 border-red-300 rounded-full flex items-center justify-center text-red-500 text-3xl mx-auto mb-4">✗</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Reading Test Not Passed</h2>
            <p className="text-gray-600 mb-1">Overall score: <strong>{Math.round(result.score * 100)}%</strong> (70% required)</p>
            <p className="text-sm text-gray-500 mb-8">Please speak clearly and read each sentence completely.</p>
            <button
              onClick={() => {
                setCurrentIdx(0)
                setTranscriptions(new Array(sentences.length).fill(''))
                setSentenceScores(new Array(sentences.length).fill(-1))
                setCurrentScore(null)
                setFaceStatus('idle')
                setResult(null)
                setStatus('ready')
              }}
              className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors"
            >
              Retry Test
            </button>
          </div>
        )}
      </div>

      {/* Completed sentences with per-sentence scores */}
      {currentIdx > 0 && status !== 'passed' && status !== 'failed' && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">Completed sentences:</p>
          <div className="space-y-2">
            {sentences.slice(0, currentIdx).map((s, i) => {
              const score = sentenceScores[i]
              const passed = score >= PASSING_SCORE
              return (
                <div key={s.id} className={`rounded-lg p-3 border flex items-start gap-3
                  ${passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5
                    ${passed ? 'bg-green-500 text-white' : 'bg-red-400 text-white'}`}
                  >
                    {score >= 0 ? `${Math.round(score * 100)}` : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Sentence {i + 1}</p>
                    <p className="text-sm text-gray-700 italic truncate">&ldquo;{transcriptions[i] || '(no transcription)'}&rdquo;</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
