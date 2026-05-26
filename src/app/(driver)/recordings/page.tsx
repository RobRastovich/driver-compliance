'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface Recording {
  id: string
  sentenceIdx: number
  sentenceText: string
  mimeType: string
  durationSecs: number | null
  createdAt: string
}

function formatDuration(secs: number | null) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function groupByDate(recordings: Recording[]) {
  const groups: Record<string, Recording[]> = {}
  for (const r of recordings) {
    const key = new Date(r.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  }
  return groups
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/recordings')
      if (res.ok) setRecordings(await res.json())
      else setError('Failed to load recordings.')
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handlePlay(id: string) {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (playing === id) { setPlaying(null); return }

    setPlaying(id)
    try {
      const res = await fetch(`/api/recordings/${id}/play`)
      if (!res.ok) { setError('Could not load audio.'); setPlaying(null); return }
      const { url, mimeType } = await res.json()
      const audio = new Audio(url)
      audio.onended = () => setPlaying(null)
      audio.onerror = () => { setError('Playback failed.'); setPlaying(null) }
      audioRef.current = audio
      await audio.play()
    } catch {
      setError('Playback error.')
      setPlaying(null)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/recordings/${id}`, { method: 'DELETE' })
      if (!res.ok) { setError('Delete failed.'); return }
      if (playing === id) { audioRef.current?.pause(); audioRef.current = null; setPlaying(null) }
      setRecordings((prev) => prev.filter((r) => r.id !== id))
    } catch {
      setError('Network error.')
    } finally {
      setDeleting(null)
    }
  }

  const groups = groupByDate(recordings)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reading Recordings</h1>
          <p className="text-sm text-gray-500 mt-1">Audio recordings from your English reading tests.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">Dashboard</Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">{error}</div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-400 text-sm">Loading recordings...</div>
      )}

      {!loading && recordings.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-2xl mb-3">🎙️</p>
          <p className="font-medium text-gray-700">No recordings yet</p>
          <p className="text-sm text-gray-400 mt-1">Recordings are saved automatically when you complete a reading test.</p>
          <Link href="/reading-test" className="inline-block mt-5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg px-5 py-2 text-sm transition-colors">
            Take Reading Test
          </Link>
        </div>
      )}

      {!loading && recordings.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{date}</p>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {items.map((rec) => {
                  const isPlaying = playing === rec.id
                  return (
                    <div key={rec.id} className="flex items-center gap-4 px-5 py-4">
                      {/* Play / pause button */}
                      <button
                        onClick={() => handlePlay(rec.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                          ${isPlaying
                            ? 'bg-brand-600 text-white'
                            : 'bg-gray-100 hover:bg-brand-100 text-gray-600 hover:text-brand-700'}`}
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                            Sentence {rec.sentenceIdx + 1}
                          </span>
                          {rec.durationSecs && (
                            <span className="text-xs text-gray-400">{formatDuration(rec.durationSecs)}</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(rec.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 truncate">{rec.sentenceText}</p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(rec.id)}
                        disabled={deleting === rec.id}
                        className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {deleting === rec.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
