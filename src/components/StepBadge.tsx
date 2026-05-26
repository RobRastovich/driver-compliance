'use client'

type Status = 'pending' | 'active' | 'done' | 'failed'

interface Step {
  number: number
  label: string
  status: Status
}

export default function StepBadge({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => (
        <div key={step.number} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
              ${step.status === 'done' ? 'bg-green-500 text-white' : ''}
              ${step.status === 'active' ? 'bg-brand-600 text-white ring-2 ring-brand-300' : ''}
              ${step.status === 'pending' ? 'bg-gray-200 text-gray-500' : ''}
              ${step.status === 'failed' ? 'bg-red-500 text-white' : ''}
            `}
          >
            {step.status === 'done' ? '✓' : step.number}
          </div>
          <span className={`text-sm hidden sm:inline ${step.status === 'active' ? 'font-semibold text-brand-700' : 'text-gray-500'}`}>
            {step.label}
          </span>
          {i < steps.length - 1 && <div className="w-6 h-px bg-gray-300 mx-1" />}
        </div>
      ))}
    </div>
  )
}
