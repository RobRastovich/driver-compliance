'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
]

interface DriverProfile {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  address: string
  city: string
  state: string
  zip: string
  cdlNumber: string | null
  cdlIssuingState: string | null
}

type PhotoMode = 'idle' | 'streaming' | 'captured' | 'saving'

interface EditForm {
  firstName: string
  lastName: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  cdlNumber: string
  cdlIssuingState: string
}

export default function ProfileCard({ driver: initialDriver }: { driver: DriverProfile }) {
  const [driver, setDriver] = useState(initialDriver)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null)
  const [mode, setMode] = useState<PhotoMode>('idle')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<EditForm>({
    firstName: initialDriver.firstName,
    lastName: initialDriver.lastName,
    phone: initialDriver.phone,
    address: initialDriver.address,
    city: initialDriver.city,
    state: initialDriver.state,
    zip: initialDriver.zip,
    cdlNumber: initialDriver.cdlNumber ?? '',
    cdlIssuingState: initialDriver.cdlIssuingState ?? '',
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    fetch('/api/drivers/profile-photo')
      .then((r) => r.json())
      .then((d) => { if (d.url) setPhotoUrl(d.url) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (mode === 'streaming' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [mode])

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }
  }, [])

  const startCamera = useCallback(async () => {
    setError('')
    setSuccess('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      })
      streamRef.current = stream
      setMode('streaming')
    } catch {
      setError('Camera access denied.')
    }
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    setCapturedDataUrl(canvas.toDataURL('image/jpeg', 0.92))
    stopStream()
    setMode('captured')
  }, [stopStream])

  const retake = useCallback(() => {
    setCapturedDataUrl(null)
    setMode('idle')
  }, [])

  const savePhoto = useCallback(async () => {
    if (!capturedDataUrl) return
    setMode('saving')
    setError('')
    try {
      const res = await fetch(capturedDataUrl)
      const blob = await res.blob()
      const form = new FormData()
      form.append('image', new File([blob], 'profile.jpg', { type: 'image/jpeg' }))
      const r = await fetch('/api/drivers/profile-photo', { method: 'POST', body: form })
      if (!r.ok) { setError('Failed to save photo.'); setMode('captured'); return }
      setPhotoUrl(capturedDataUrl)
      setCapturedDataUrl(null)
      setSuccess('Profile photo saved.')
      setMode('idle')
    } catch {
      setError('Network error saving photo.')
      setMode('captured')
    }
  }, [capturedDataUrl])

  const startEdit = useCallback(() => {
    setForm({
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      address: driver.address,
      city: driver.city,
      state: driver.state,
      zip: driver.zip,
      cdlNumber: driver.cdlNumber ?? '',
      cdlIssuingState: driver.cdlIssuingState ?? '',
    })
    setError('')
    setSuccess('')
    setEditing(true)
  }, [driver])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setError('')
  }, [])

  const saveProfile = useCallback(async () => {
    setSaving(true)
    setError('')
    try {
      const r = await fetch('/api/drivers/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? 'Failed to save profile.'); setSaving(false); return }
      setDriver((prev) => ({ ...prev, ...data }))
      setSuccess('Profile updated.')
      setEditing(false)
    } catch {
      setError('Network error saving profile.')
    } finally {
      setSaving(false)
    }
  }, [form])

  const field = (key: keyof EditForm, label: string, type = 'text') => (
    <div>
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="mt-0.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
    </div>
  )

  const dob = new Date(driver.dateOfBirth).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Driver Profile</h2>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Photo column */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200 relative">
            {mode === 'streaming' && (
              <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay playsInline muted />
            )}
            {mode === 'captured' && capturedDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capturedDataUrl} alt="Preview" className="w-full h-full object-cover scale-x-[-1]" />
            )}
            {(mode === 'idle' || mode === 'saving') && photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            )}
            {(mode === 'idle' || mode === 'saving') && !photoUrl && (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">👤</div>
            )}
            {mode === 'streaming' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-20 h-24 border-2 border-white/60 rounded-full opacity-70" />
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {mode === 'idle' && (
            <button onClick={startCamera} className="text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors">
              {photoUrl ? 'Retake Photo' : 'Take Photo'}
            </button>
          )}
          {mode === 'streaming' && (
            <button onClick={capture} className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors">
              Capture
            </button>
          )}
          {mode === 'captured' && (
            <div className="flex gap-2">
              <button onClick={retake} className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">Retake</button>
              <button onClick={savePhoto} className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors">Save</button>
            </div>
          )}
          {mode === 'saving' && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
        </div>

        {/* Info / edit column */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {field('firstName', 'First Name')}
                {field('lastName', 'Last Name')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {field('phone', 'Phone', 'tel')}
              </div>
              {field('address', 'Address')}
              <div className="grid grid-cols-3 gap-3">
                {field('city', 'City')}
                {field('state', 'State')}
                {field('zip', 'ZIP')}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">CDL Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {field('cdlNumber', 'CDL Number')}
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Issuing State</label>
                    <select
                      value={form.cdlIssuingState}
                      onChange={(e) => setForm((f) => ({ ...f, cdlIssuingState: e.target.value }))}
                      className="mt-0.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                    >
                      <option value="">— Select state —</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-lg font-bold text-gray-900">{driver.firstName} {driver.lastName}</p>
                <p className="text-sm text-gray-500">{driver.email}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Phone</span>
                  <p className="text-gray-700">{driver.phone}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Date of Birth</span>
                  <p className="text-gray-700">{dob}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Address</span>
                  <p className="text-gray-700">{driver.address}</p>
                  <p className="text-gray-700">{driver.city}, {driver.state} {driver.zip}</p>
                </div>
                {(driver.cdlNumber || driver.cdlIssuingState) && (
                  <>
                    <div>
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">CDL Number</span>
                      <p className="text-gray-700">{driver.cdlNumber ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">CDL Issuing State</span>
                      <p className="text-gray-700">{driver.cdlIssuingState ?? '—'}</p>
                    </div>
                  </>
                )}
              </div>

              {success && <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">{success}</p>}
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
