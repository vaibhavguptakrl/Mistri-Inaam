import React, { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  addDoc
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import type { Plumber, Transaction, KYCStatus } from '../types'
import {
  Users,
  Search,
  Phone,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Eye,
  CheckCircle,
  XCircle,
  ExternalLink,
  ReceiptText,
  HardHat,
  Filter
} from 'lucide-react'

export const Plumbers: React.FC = () => {
  const { isOwner, currentUser, adminProfile } = useAuth()
  const [plumbers, setPlumbers] = useState<Plumber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [isSiteWorkView, setIsSiteWorkView] = useState(false)

  // Selected Plumber for Profile / KYC Review
  const [selectedPlumber, setSelectedPlumber] = useState<Plumber | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)
  const [statement, setStatement] = useState<Transaction[]>([])
  const [loadingStatement, setLoadingStatement] = useState(false)

  const loadPlumbers = async () => {
    try {
      setLoading(true)
      const snap = await getDocs(collection(db, 'plumbers'))
      const list: Plumber[] = []
      snap.forEach(d => list.push({ ...d.data(), id: d.id } as Plumber))
      list.sort((a, b) => b.pointsBalance - a.pointsBalance)
      setPlumbers(list)
    } catch (err) {
      console.error('Error loading plumbers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlumbers()
  }, [])

  const loadStatement = async (plumberId: string) => {
    try {
      setLoadingStatement(true)
      const q = query(
        collection(db, 'transactions'),
        where('plumberId', '==', plumberId),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      const txs: Transaction[] = []
      snap.forEach(d => txs.push({ ...d.data(), id: d.id } as Transaction))
      setStatement(txs)
    } catch (err) {
      console.error('Error loading statement:', err)
      // Fallback if composite index is building: simple query
      const snap = await getDocs(query(collection(db, 'transactions'), where('plumberId', '==', plumberId)))
      const txs: Transaction[] = []
      snap.forEach(d => txs.push({ ...d.data(), id: d.id } as Transaction))
      setStatement(txs)
    } finally {
      setLoadingStatement(false)
    }
  }

  const openProfileModal = (plumber: Plumber) => {
    setSelectedPlumber(plumber)
    setIsRejecting(false)
    setRejectionReason('')
    loadStatement(plumber.id)
  }

  const handleUpdateKyc = async (status: KYCStatus) => {
    if (!selectedPlumber || !isOwner) return
    const plumberRef = doc(db, 'plumbers', selectedPlumber.id)
    const updateData: any = {
      kycStatus: status,
      updatedAt: new Date().toISOString()
    }
    if (status === 'rejected') {
      updateData.kycRemarks = rejectionReason.trim() || 'Documents unclear or incomplete'
    } else {
      updateData.kycRemarks = null
    }

    await updateDoc(plumberRef, updateData)

    // Audit log
    await addDoc(collection(db, 'auditLogs'), {
      adminId: currentUser?.uid || '',
      adminEmail: currentUser?.email || adminProfile?.email || 'admin',
      action: `KYC_${status.toUpperCase()}`,
      entity: 'plumber',
      entityId: selectedPlumber.id,
      oldValue: { kycStatus: selectedPlumber.kycStatus },
      newValue: { kycStatus: status, remarks: updateData.kycRemarks },
      timestamp: new Date().toISOString()
    })

    setSelectedPlumber(prev => prev ? { ...prev, ...updateData } : null)
    setPlumbers(prev => prev.map(p => p.id === selectedPlumber.id ? { ...p, ...updateData } : p))
    setIsRejecting(false)
  }

  const filteredPlumbers = plumbers.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm) ||
      p.plumberCode.toLowerCase().includes(searchTerm.toLowerCase())
    if (isSiteWorkView) {
      return matchesSearch && p.kycStatus === 'approved'
    }
    if (statusFilter === 'all') return matchesSearch
    return matchesSearch && p.kycStatus === statusFilter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Plumber &amp; Contractor Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage KYC approvals, points balances, call plumbers, and dispatch site jobs
          </p>
        </div>

        {/* Toggle Site Work View */}
        <button
          onClick={() => setIsSiteWorkView(!isSiteWorkView)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            isSiteWorkView
              ? 'bg-amber-500 text-white shadow'
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <HardHat className="w-4 h-4" />
          <span>{isSiteWorkView ? 'Exit Site Work Mode' : 'Site Work (Approved Call List)'}</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, or code (e.g. SA-4821)..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          />
        </div>

        {!isSiteWorkView && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SITE WORK MODE VIEW */}
      {isSiteWorkView ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-amber-900">
            <HardHat className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base">Site Work Job Dispatcher (Verified Plumbers)</h3>
          </div>
          <p className="text-xs text-amber-800 mb-6">
            Call approved plumbers directly to assign customer plumbing site work, installation jobs, or repair visits in Karauli.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlumbers.map(p => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-base">{p.name}</div>
                      <div className="text-xs font-mono text-emerald-600 font-semibold">{p.plumberCode}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      KYC Verified
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Points: <span className="font-bold text-slate-800">{p.pointsBalance} pts</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <a
                    href={`tel:${p.phone}`}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold text-center inline-flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Plumber</span>
                  </a>
                  <a
                    href={`https://wa.me/${p.whatsappNumber?.replace('+', '') || p.phone.replace('+', '')}?text=${encodeURIComponent('Namaste ' + p.name + ', Shiv Agency has a plumbing site work job in Karauli. Please call us.')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                    title="Chat on WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* STANDARD PLUMBERS TABLE */
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Plumber Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Points Balance</th>
                  <th className="px-4 py-3">KYC Status</th>
                  <th className="px-4 py-3">Quick Connect</th>
                  <th className="px-4 py-3 text-right">Profile &amp; KYC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPlumbers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No contractors found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredPlumbers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-xs text-emerald-700">
                        {p.plumberCode}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {p.name}
                        {p.panNumber && <div className="text-[11px] text-slate-400 font-mono font-normal">PAN: {p.panNumber}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                        {p.phone}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-black text-slate-900 text-sm">{p.pointsBalance.toLocaleString('en-IN')}</span>
                        <span className="text-xs text-slate-400 ml-1">pts</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            p.kycStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.kycStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.kycStatus === 'approved' && <ShieldCheck className="w-3.5 h-3.5" />}
                          {p.kycStatus === 'pending' && <ShieldAlert className="w-3.5 h-3.5" />}
                          {p.kycStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* One-tap Call */}
                          <a
                            href={`tel:${p.phone}`}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition"
                            title="Call Phone"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          {/* One-tap WhatsApp */}
                          <a
                            href={`https://wa.me/${p.whatsappNumber?.replace('+', '') || p.phone.replace('+', '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openProfileModal(p)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile &amp; KYC</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PLUMBER PROFILE & KYC REVIEW MODAL */}
      {selectedPlumber && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{selectedPlumber.name}</h2>
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-100 text-emerald-800">
                    {selectedPlumber.plumberCode}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Mobile: <span className="font-mono">{selectedPlumber.phone}</span> | WhatsApp: <span className="font-mono">{selectedPlumber.whatsappNumber}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedPlumber(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕ Close
              </button>
            </div>

            {/* KYC Status & Actions */}
            <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400">Current KYC Verification</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      selectedPlumber.kycStatus === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedPlumber.kycStatus === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedPlumber.kycStatus}
                  </span>
                  {selectedPlumber.kycRemarks && (
                    <span className="text-xs text-rose-600 font-medium">({selectedPlumber.kycRemarks})</span>
                  )}
                </div>
              </div>

              {isOwner && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateKyc('approved')}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve KYC</span>
                  </button>

                  <button
                    onClick={() => setIsRejecting(true)}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>

            {isRejecting && (
              <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-rose-900 uppercase">
                  Rejection Reason (Visible to Plumber)
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Aadhaar photo is blurry, please re-upload clear photo."
                  className="w-full px-3 py-2 border border-rose-300 rounded-lg text-sm bg-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsRejecting(false)}
                    className="px-3 py-1 text-xs text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateKyc('rejected')}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}

            {/* KYC Documents Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                KYC Verification Documents
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* PAN Card */}
                <div className="border border-slate-200 rounded-xl p-3 bg-white">
                  <div className="text-xs font-semibold text-slate-700 mb-1">PAN Card Photo</div>
                  <div className="text-[11px] font-mono text-slate-500 mb-2">{selectedPlumber.panNumber || 'No Number'}</div>
                  {selectedPlumber.panCardUrl ? (
                    <a href={selectedPlumber.panCardUrl} target="_blank" rel="noreferrer" className="block relative group">
                      <img
                        src={selectedPlumber.panCardUrl}
                        alt="PAN Card"
                        className="w-full h-32 object-cover rounded-lg border border-slate-200"
                      />
                      <span className="absolute inset-0 bg-black/40 text-white text-xs font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-lg">
                        View Full Image
                      </span>
                    </a>
                  ) : (
                    <div className="w-full h-32 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                      No Photo
                    </div>
                  )}
                </div>

                {/* Aadhaar Card */}
                <div className="border border-slate-200 rounded-xl p-3 bg-white">
                  <div className="text-xs font-semibold text-slate-700 mb-1">Aadhaar Card Photo</div>
                  <div className="text-[11px] font-mono text-slate-500 mb-2">Last 4: •••• {selectedPlumber.aadhaarLast4 || 'XXXX'}</div>
                  {selectedPlumber.aadhaarCardUrl ? (
                    <a href={selectedPlumber.aadhaarCardUrl} target="_blank" rel="noreferrer" className="block relative group">
                      <img
                        src={selectedPlumber.aadhaarCardUrl}
                        alt="Aadhaar Card"
                        className="w-full h-32 object-cover rounded-lg border border-slate-200"
                      />
                      <span className="absolute inset-0 bg-black/40 text-white text-xs font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-lg">
                        View Full Image
                      </span>
                    </a>
                  ) : (
                    <div className="w-full h-32 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                      No Photo
                    </div>
                  )}
                </div>

                {/* Live Selfie */}
                <div className="border border-slate-200 rounded-xl p-3 bg-white">
                  <div className="text-xs font-semibold text-slate-700 mb-1">Live Camera Selfie</div>
                  <div className="text-[11px] text-slate-500 mb-2">Identity Verification</div>
                  {selectedPlumber.selfieUrl ? (
                    <a href={selectedPlumber.selfieUrl} target="_blank" rel="noreferrer" className="block relative group">
                      <img
                        src={selectedPlumber.selfieUrl}
                        alt="Selfie"
                        className="w-full h-32 object-cover rounded-lg border border-slate-200"
                      />
                      <span className="absolute inset-0 bg-black/40 text-white text-xs font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-lg">
                        View Full Image
                      </span>
                    </a>
                  ) : (
                    <div className="w-full h-32 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                      No Photo
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Plumber Statement History */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <ReceiptText className="w-4 h-4 text-emerald-600" />
                <span>Points Transaction Statement ({statement.length})</span>
              </h3>

              {loadingStatement ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading ledger statement...</div>
              ) : statement.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 text-center text-xs text-slate-400">
                  No points transactions recorded for this contractor yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto text-xs">
                  {statement.map(tx => (
                    <div key={tx.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800 capitalize">
                          {tx.type.replace('_', ' ')}
                          {tx.billNumber && <span className="text-slate-400 ml-1.5 font-mono">Bill #{tx.billNumber}</span>}
                        </div>
                        <div className="text-[11px] text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600">+{tx.points} pts</div>
                        <div className="text-[11px] text-slate-500">₹{tx.rupeeValue} worth</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
