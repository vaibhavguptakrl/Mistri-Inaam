import React, { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { Check, Clock3, Eye, Mail, MapPin, Phone, Search, ShieldCheck, UserRound, X } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import type { Plumber } from '../types'

type View = 'pending' | 'all'

export const RegistrationsPage: React.FC = () => {
  const { currentUser, adminProfile, isOwner } = useAuth()
  const [users, setUsers] = useState<Plumber[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Plumber | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => onSnapshot(collection(db, 'plumbers'), (snapshot) => {
    const list = snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Plumber))
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    setUsers(list)
    setLoading(false)
    setError('')
  }, (cause) => {
    console.error('Could not load registrations:', cause)
    setError('Could not load registrations. Check your connection and admin access.')
    setLoading(false)
  }), [])

  const pending = useMemo(() => users.filter((user) =>
    user.registrationSource === 'mobile_signup' &&
    (user.registrationStatus === 'pending_review' || (!user.registrationStatus && user.kycStatus === 'pending'))
  ), [users])

  const visibleUsers = useMemo(() => {
    const source = view === 'pending' ? pending : users
    const term = search.trim().toLowerCase()
    if (!term) return source
    return source.filter((user) => [user.name, user.phone, user.email, user.plumberCode, user.address]
      .some((value) => value?.toLowerCase().includes(term)))
  }, [pending, search, users, view])

  const updateStatus = async (status: 'approved' | 'rejected') => {
    if (!selected || !isOwner || saving) return
    setSaving(true)
    try {
      const update = {
        kycStatus: status,
        registrationStatus: status,
        kycRemarks: null,
        updatedAt: new Date().toISOString(),
      }
      await updateDoc(doc(db, 'plumbers', selected.id), update)
      await addDoc(collection(db, 'auditLogs'), {
        adminId: currentUser?.uid || '',
        adminEmail: currentUser?.email || adminProfile?.email || 'admin',
        action: `REGISTRATION_${status.toUpperCase()}`,
        entity: 'plumber',
        entityId: selected.id,
        oldValue: { registrationStatus: selected.registrationStatus || 'pending_review', kycStatus: selected.kycStatus },
        newValue: { registrationStatus: status, kycStatus: status },
        timestamp: new Date().toISOString(),
      })
      setSelected({ ...selected, ...update, kycRemarks: undefined })
    } catch (cause) {
      console.error('Could not update registration:', cause)
      setError('Could not update this request. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (value?: string) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Member management</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Signup Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Review new applications and open any registered user’s full profile.</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
            <div className="text-[11px] font-semibold uppercase text-amber-700">Pending review</div>
            <div className="text-xl font-bold text-amber-950">{pending.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2">
            <div className="text-[11px] font-semibold uppercase text-slate-500">Registered users</div>
            <div className="text-xl font-bold text-slate-900">{users.length}</div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button onClick={() => setView('pending')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${view === 'pending' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Clock3 className="h-4 w-4" /> Pending requests <span className={`rounded-full px-2 py-0.5 text-xs ${view === 'pending' ? 'bg-white/15' : 'bg-amber-100 text-amber-800'}`}>{pending.length}</span>
          </button>
          <button onClick={() => setView('all')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${view === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            <UserRound className="h-4 w-4" /> All registered users <span className={`rounded-full px-2 py-0.5 text-xs ${view === 'all' ? 'bg-white/15' : 'bg-slate-100'}`}>{users.length}</span>
          </button>
        </div>
        <label className="relative block w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, email, code…" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </label>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Applicant</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Details</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">Loading users…</td></tr> : visibleUsers.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center"><div className="font-semibold text-slate-700">{view === 'pending' ? 'No pending signup requests' : 'No registered users found'}</div><p className="mt-1 text-xs text-slate-400">{search ? 'Try a different search.' : 'New mobile applications will appear here.'}</p></td></tr>
              ) : visibleUsers.map((user) => {
                const status: string = user.registrationStatus === 'pending_review' || (!user.registrationStatus && user.kycStatus === 'pending') ? 'Pending review' : user.registrationStatus || user.kycStatus || 'Registered'
                return <tr key={user.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4"><div className="font-semibold text-slate-900">{user.name || 'Name not provided'}</div><div className="mt-0.5 font-mono text-xs text-slate-500">{user.plumberCode || 'New applicant'}</div></td>
                  <td className="px-5 py-4"><div className="text-slate-700">{user.phone || '—'}</div><div className="text-xs text-slate-500">{user.email || '—'}</div></td>
                  <td className="px-5 py-4 text-xs text-slate-600">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${status === 'Pending review' ? 'bg-amber-100 text-amber-800' : status === 'approved' ? 'bg-emerald-100 text-emerald-800' : status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>{status.replace(/_/g, ' ')}</span></td>
                  <td className="px-5 py-4 text-right"><button onClick={() => setSelected(user)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"><Eye className="h-3.5 w-3.5" /> Full details</button></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="registration-detail-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5">
            <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Registration profile</p><h2 id="registration-detail-title" className="mt-1 text-xl font-bold text-slate-900">{selected.name}</h2><p className="mt-0.5 text-xs font-mono text-slate-500">{selected.plumberCode || selected.id}</p></div>
            <button onClick={() => setSelected(null)} aria-label="Close details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-[1fr_240px]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail icon={<Phone />} label="Mobile" value={selected.phone} />
                <Detail icon={<Mail />} label="Email" value={selected.email} />
                <Detail icon={<MapPin />} label="Address" value={selected.address} />
                <Detail icon={<Clock3 />} label="Applied" value={formatDate(selected.createdAt)} />
                <Detail icon={<ShieldCheck />} label="Membership status" value={(selected.registrationStatus || selected.kycStatus || 'registered').replace(/_/g, ' ')} />
                <Detail icon={<UserRound />} label="WhatsApp" value={selected.whatsappNumber || selected.phone} />
              </div>
              {selected.kycRemarks && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><strong>Review note:</strong> {selected.kycRemarks}</div>}
            </div>
            <div><div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Live selfie</div>{selected.selfieUrl ? <a href={selected.selfieUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-slate-200"><img src={selected.selfieUrl} alt={`${selected.name} registration selfie`} className="aspect-[4/5] w-full object-cover" /></a> : <div className="flex aspect-[4/5] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">No selfie uploaded</div>}</div>
          </div>
          {isOwner && selected.registrationSource === 'mobile_signup' && (selected.registrationStatus === 'pending_review' || (!selected.registrationStatus && selected.kycStatus === 'pending')) && <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:justify-end">
            <button disabled={saving} onClick={() => void updateStatus('rejected')} className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject application</button>
            <button disabled={saving} onClick={() => void updateStatus('approved')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Approve registration'}</button>
          </div>}
        </section>
      </div>}
    </div>
  )
}

const Detail: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{React.cloneElement(icon as React.ReactElement, { className: 'h-3.5 w-3.5' })}{label}</div><div className="mt-1 break-words text-sm font-medium text-slate-800">{value || '—'}</div></div>
