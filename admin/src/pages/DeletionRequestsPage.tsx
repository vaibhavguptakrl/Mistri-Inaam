import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { AlertTriangle, LoaderCircle, Trash2 } from 'lucide-react'
import app, { db } from '../lib/firebase'

type DeletionRequest = {
  uid: string
  name?: string
  phone?: string
  email?: string
  requestedAt?: string
  status: string
}

export function DeletionRequestsPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([])
  const [error, setError] = useState('')
  const [processingUid, setProcessingUid] = useState('')

  useEffect(() => onSnapshot(
    query(collection(db, 'accountDeletionRequests'), where('status', '==', 'pending')),
    (snapshot) => {
      setRequests(snapshot.docs.map((item) => ({ uid: item.id, ...item.data() } as DeletionRequest))
        .sort((a, b) => (a.requestedAt || '').localeCompare(b.requestedAt || '')))
      setError('')
    },
    (reason) => setError(reason.message || 'Could not load deletion requests.'),
  ), [])

  async function process(uid: string, name?: string) {
    const accepted = window.confirm(
      `Permanently delete ${name || 'this account'}? This removes the account and KYC files, and anonymizes completed reward and payout records. Pending payouts must be resolved first.`,
    )
    if (!accepted) return
    setProcessingUid(uid)
    setError('')
    try {
      const processRequest = httpsCallable<{ uid: string }, { status: string }>(getFunctions(app, 'asia-south1'), 'processAccountDeletion')
      await processRequest({ uid })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not process the deletion request.')
    } finally {
      setProcessingUid('')
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account deletion requests</h1>
        <p className="mt-1 text-sm text-slate-500">Review and process requests from verified members.</p>
      </div>
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Resolve any pending reward or payout first. Processing removes the member profile, Firebase Auth account and KYC files; completed ledger and payout entries are anonymized for records.</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {requests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No pending account deletion requests.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {requests.map((request) => (
              <div key={request.uid} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{request.name || 'Member account'}</p>
                  <p className="mt-1 text-sm text-slate-600">{request.phone || 'No phone on profile'}{request.email ? ` · ${request.email}` : ''}</p>
                  <p className="mt-1 text-xs text-slate-400">Requested {request.requestedAt || 'date unavailable'} · Account {request.uid}</p>
                </div>
                <button
                  onClick={() => void process(request.uid, request.name)}
                  disabled={processingUid === request.uid}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
                >
                  {processingUid === request.uid ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete account and eligible data
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
