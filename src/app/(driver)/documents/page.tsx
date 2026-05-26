'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const DOCUMENT_TYPES = [
  { value: 'DRIVERS_LICENSE', label: "Driver's License", required: true },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'GREEN_CARD', label: 'Green Card / EAD' },
  { value: 'BIRTH_CERTIFICATE', label: 'Birth Certificate' },
  { value: 'OTHER', label: 'Other Government ID' },
]

interface Document {
  id: string
  type: string
  fileName: string
  mimeType: string
  uploadedAt: string
  faceVerification: {
    passed: boolean
    score: number
    verifiedAt: string
  } | null
}

interface PreviewState {
  url: string
  mimeType: string
  fileName: string
}

function typeLabel(type: string) {
  return DOCUMENT_TYPES.find((t) => t.value === type)?.label ?? type
}

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('DRIVERS_LICENSE')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents')
      if (res.ok) {
        setDocuments(await res.json())
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Failed to load documents (${res.status})`)
      }
    } catch {
      setError('Network error loading documents.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  async function handleUpload() {
    if (!file) return
    setError('')
    setSuccess('')
    setUploading(true)

    const form = new FormData()
    form.append('file', file)
    form.append('type', selectedType)

    try {
      const res = await fetch('/api/documents', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Upload failed'); return }
      setSuccess(`${typeLabel(selectedType)} uploaded successfully.`)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      await loadDocuments()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handlePreview(id: string) {
    setPreviewing(id)
    try {
      const res = await fetch(`/api/documents/${id}/preview`)
      if (!res.ok) { setError('Could not load preview.'); return }
      const data = await res.json()
      setPreview(data)
    } catch {
      setError('Network error loading preview.')
    } finally {
      setPreviewing(null)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    setError('')
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Delete failed')
        return
      }
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      setSuccess('Document deleted.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">
            A <strong>driver&apos;s license</strong> is required for face verification.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">Dashboard</Link>
      </div>

      {/* Existing documents */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Uploaded Documents</h2>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No documents uploaded yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {documents.map((doc) => {
              const fv = doc.faceVerification
              return (
                <li key={doc.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 text-lg">
                    {doc.mimeType === 'application/pdf' ? '📄' : '🖼️'}
                  </div>

                  <button
                    onClick={() => handlePreview(doc.id)}
                    disabled={previewing === doc.id}
                    className="flex-1 min-w-0 text-left hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors disabled:opacity-50"
                  >
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600">
                      {typeLabel(doc.type)}
                      {previewing === doc.id && <span className="ml-2 text-xs text-gray-400">Loading...</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{doc.fileName} · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                    {/* Face verification badge */}
                    {fv ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium mt-1 px-2 py-0.5 rounded-full
                        ${fv.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {fv.passed ? '✓ Face verified' : '✗ Face mismatch'} · {Math.round(fv.score)}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs mt-1 text-gray-400">Face not verified</span>
                    )}
                  </button>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/face-verify?documentId=${doc.id}&documentType=${doc.type}`)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
                    >
                      {fv ? 'Re-verify' : 'Verify Face'}
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleting === doc.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      {deleting === doc.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Upload form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-800">Upload New Document</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Document Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}{t.required ? ' (Required)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">File</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          />
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, or PDF · Max 10 MB</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{success}</div>}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>


      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800 truncate">{preview.fileName}</p>
              <button
                onClick={() => setPreview(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2 min-h-0">
              {preview.mimeType === 'application/pdf' ? (
                <iframe
                  src={preview.url}
                  className="w-full h-full min-h-[60vh] rounded-lg"
                  title={preview.fileName}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.fileName}
                  className="max-w-full max-h-[70vh] mx-auto rounded-lg object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
