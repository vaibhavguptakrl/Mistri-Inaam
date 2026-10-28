import React from 'react'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface PlaceholderProps {
  title: string
  phase: string
  description: string
}

export const PlaceholderPage: React.FC<PlaceholderProps> = ({ title, phase, description }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl mx-auto my-8 text-center shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-7 h-7" />
      </div>
      <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
        {phase}
      </span>
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-slate-600 text-sm max-w-md mx-auto">
        {description}
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  )
}
