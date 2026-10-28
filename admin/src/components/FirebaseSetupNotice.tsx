import React, { useState } from 'react'
import { isFirebaseConfigured } from '../lib/firebase'
import { seedInitialFirestoreData } from '../lib/seed'
import { AlertCircle, CheckCircle, Database, Sparkles, ExternalLink } from 'lucide-react'

export const FirebaseSetupNotice: React.FC = () => {
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSeed = async () => {
    setSeeding(true)
    setSeedResult(null)
    const res = await seedInitialFirestoreData()
    setSeedResult(res)
    setSeeding(false)
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8 text-amber-900 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-amber-800">Firebase Configuration Needed</h3>
            <p className="mt-1 text-sm text-amber-700">
              Welcome to the Shiv Agency Loyalty Rewards Admin Web App! To connect this panel to your Firebase backend:
            </p>
            <ol className="mt-3 list-decimal list-inside space-y-1.5 text-sm text-amber-900 font-medium">
              <li>Open <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5 text-blue-700 font-semibold">Firebase Console <ExternalLink className="w-3.5 h-3.5" /></a> and select/create your project.</li>
              <li>Go to <strong>Project Settings</strong> (gear icon at top-left) &gt; <strong>General</strong> &gt; <strong>Your apps</strong> &gt; Add a <strong>Web app</strong>.</li>
              <li>Copy your config keys and paste them into the file <code className="bg-amber-100 px-2 py-0.5 rounded font-mono text-xs">admin/.env</code> (created from <code className="bg-amber-100 px-2 py-0.5 rounded font-mono text-xs">admin/.env.example</code>).</li>
              <li>Save the file and refresh this page.</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8 text-emerald-900 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-emerald-900">Firebase Connected Successfully</h4>
            <p className="text-sm text-emerald-700">Your Admin panel is hooked up to Cloud Firestore and Firebase Storage.</p>
          </div>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow transition disabled:opacity-50"
        >
          <Database className="w-4 h-4" />
          {seeding ? 'Seeding Firestore...' : 'Seed Initial Settings & Rules'}
        </button>
      </div>
      {seedResult && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${seedResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {seedResult.message}
        </div>
      )}
    </div>
  )
}
