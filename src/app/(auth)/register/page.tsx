'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    phone: '', dateOfBirth: '', address: '', city: '', state: '', zip: '',
  })

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          phone: form.phone,
          dateOfBirth: form.dateOfBirth,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Registration failed')
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">DC</div>
          <h1 className="text-2xl font-bold text-gray-900">Create Driver Account</h1>
          <p className="text-gray-500 mt-1">Start your compliance verification process</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First Name</label>
                <input type="text" required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} className={inputClass} placeholder="John" />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input type="text" required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} className={inputClass} placeholder="Smith" />
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input type="date" required value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input type="tel" required value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} placeholder="(555) 555-5555" />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Address</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Street Address</label>
                <input type="text" required value={form.address} onChange={(e) => update('address', e.target.value)} className={inputClass} placeholder="123 Main St" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelClass}>City</label>
                  <input type="text" required value={form.city} onChange={(e) => update('city', e.target.value)} className={inputClass} placeholder="Nashville" />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <select required value={form.state} onChange={(e) => update('state', e.target.value)} className={inputClass}>
                    <option value="">Select</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>ZIP Code</label>
                  <input type="text" required value={form.zip} onChange={(e) => update('zip', e.target.value)} className={inputClass} placeholder="37201" maxLength={10} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Account Credentials</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Email Address</label>
                <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass} placeholder="john@example.com" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Password</label>
                  <input type="password" required value={form.password} onChange={(e) => update('password', e.target.value)} className={inputClass} placeholder="8+ characters" />
                </div>
                <div>
                  <label className={labelClass}>Confirm Password</label>
                  <input type="password" required value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} className={inputClass} placeholder="Repeat password" />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg py-3 text-sm transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
