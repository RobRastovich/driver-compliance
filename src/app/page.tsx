import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex flex-col">
      <nav className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-brand-600 flex items-center justify-center text-white font-bold text-sm">DC</div>
          <span className="font-semibold text-gray-800">Driver Compliance</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">Driver Login</Link>
          <Link href="/company/login" className="text-gray-600 hover:text-gray-900 transition-colors">Company Login</Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-2xl">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6">DC</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Driver Compliance Portal</h1>
          <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
            The trusted platform for driver identity verification and compliance certification — built for the post-Montgomery logistics industry.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors text-base shadow-sm"
            >
              Register as a Driver
            </Link>
            <Link
              href="/company/register"
              className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl transition-colors text-base shadow-sm border border-gray-200"
            >
              Register a Company
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-2xl mb-2">🪪</div>
              <h3 className="font-semibold text-gray-900 mb-1">Identity Verified</h3>
              <p className="text-sm text-gray-500">Document upload with AI-powered face matching against government IDs.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-2xl mb-2">📖</div>
              <h3 className="font-semibold text-gray-900 mb-1">English Proficiency</h3>
              <p className="text-sm text-gray-500">Voice-based reading comprehension test with automated scoring.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-2xl mb-2">✅</div>
              <h3 className="font-semibold text-gray-900 mb-1">Compliance Certificate</h3>
              <p className="text-sm text-gray-500">Searchable certified roster for carriers and brokers to verify drivers.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
