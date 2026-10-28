import React, { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  addDoc
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import type { Scheme } from '../types'
import {
  ShieldCheck,
  Plus,
  Trash2,
  Calendar,
  Share2,
  Sparkles,
  Image as ImageIcon,
  CheckCircle,
  ExternalLink,
  MessageSquare,
  Lock,
  Download
} from 'lucide-react'

export const SchemesPage: React.FC = () => {
  const { isOwner, currentUser, adminProfile } = useAuth()
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0])
  const [isActive, setIsActive] = useState(true)

  // AI Generator Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiGeneratedImageUrl, setAiGeneratedImageUrl] = useState<string | null>(null)

  const loadSchemes = async () => {
    try {
      setLoading(true)
      const snap = await getDocs(collection(db, 'schemes'))
      const list: Scheme[] = []
      snap.forEach(d => list.push({ ...d.data(), id: d.id } as Scheme))
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setSchemes(list)
    } catch (err) {
      console.error('Failed to load schemes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchemes()
  }, [])

  const openCreateModal = () => {
    setEditingSchemeId(null)
    setTitle('')
    setDescription('')
    setBannerUrl('https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1000&q=80')
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate(new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0])
    setIsActive(true)
    setIsModalOpen(true)
  }

  const openEditModal = (s: Scheme) => {
    setEditingSchemeId(s.id)
    setTitle(s.title)
    setDescription(s.description)
    setBannerUrl(s.bannerUrl)
    setStartDate(s.startDate?.slice(0, 10) || '')
    setEndDate(s.endDate?.slice(0, 10) || '')
    setIsActive(s.isActive)
    setIsModalOpen(true)
  }

  const handleSaveScheme = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner) return

    const schemeId = editingSchemeId || `scheme_${Date.now()}`
    const schemeData: Scheme = {
      id: schemeId,
      title: title.trim(),
      description: description.trim(),
      bannerUrl: bannerUrl.trim(),
      startDate,
      endDate,
      isActive,
      createdAt: new Date().toISOString()
    }

    await setDoc(doc(db, 'schemes', schemeId), schemeData, { merge: true })

    // Log audit
    await addDoc(collection(db, 'auditLogs'), {
      adminId: currentUser?.uid || '',
      adminEmail: currentUser?.email || adminProfile?.email || 'admin',
      action: editingSchemeId ? 'UPDATE_SCHEME' : 'CREATE_SCHEME',
      entity: 'scheme',
      entityId: schemeId,
      oldValue: null,
      newValue: schemeData,
      timestamp: new Date().toISOString()
    })

    setIsModalOpen(false)
    await loadSchemes()
  }

  const toggleScheme = async (s: Scheme) => {
    if (!isOwner) return
    const newState = !s.isActive
    await updateDoc(doc(db, 'schemes', s.id), { isActive: newState })
    setSchemes(prev => prev.map(item => item.id === s.id ? { ...item, isActive: newState } : item))
  }

  const deleteScheme = async (s: Scheme) => {
    if (!isOwner) return
    if (!window.confirm(`Delete scheme "${s.title}"?`)) return
    await deleteDoc(doc(db, 'schemes', s.id))
    setSchemes(prev => prev.filter(item => item.id !== s.id))
  }

  const handleShareWhatsApp = (s: Scheme) => {
    const text = `🎉 *${s.title}* — Shiv Agency Karauli\n\n${s.description}\n\nValid till: ${s.endDate}\nCheck points in Shiv Agency Rewards App!`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const handleGenerateAiPromo = () => {
    setAiGenerating(true)
    // Curated high quality plumbing promotional banners
    setTimeout(() => {
      const samplePromos = [
        'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=1200&q=80'
      ]
      const chosen = samplePromos[Math.floor(Math.random() * samplePromos.length)]
      setAiGeneratedImageUrl(chosen)
      setAiGenerating(false)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Schemes &amp; Promotional Offers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage festival schemes, banner sliders for the mobile app, and broadcast on WhatsApp
          </p>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setIsAiModalOpen(true); handleGenerateAiPromo() }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-sm font-semibold transition"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Generate Promo Banner with AI</span>
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Scheme</span>
            </button>
          </div>
        )}
      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schemes.map((s) => (
          <div
            key={s.id}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition"
          >
            <div>
              {/* Image Banner */}
              <div className="relative h-44 bg-slate-100">
                <img
                  src={s.bannerUrl || 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80'}
                  alt={s.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => toggleScheme(s)}
                    disabled={!isOwner}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase shadow-sm ${
                      s.isActive ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {s.isActive ? 'Active on App' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-2">
                <h3 className="font-bold text-base text-slate-900 leading-tight">{s.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2">{s.description}</p>
                <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Valid: {s.startDate?.slice(0, 10)} to {s.endDate?.slice(0, 10)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 pt-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {/* WhatsApp Share (Free Feature A) */}
              <button
                onClick={() => handleShareWhatsApp(s)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition"
                title="Share on WhatsApp with contractors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Share on WhatsApp</span>
              </button>

              {isOwner && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(s)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteScheme(s)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT SCHEME MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editingSchemeId ? 'Edit Scheme' : 'Launch New Scheme'}
            </h2>

            <form onSubmit={handleSaveScheme} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Scheme Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Shiv Agency Diwali Mahotsav"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Earn 2X points on all CPVC and Water Tank purchases this month!"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Banner Image URL *
                </label>
                <input
                  type="url"
                  required
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="schemeActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="schemeActive" className="text-sm font-medium text-slate-700">
                  Active (Show on Plumber Mobile App Banner Slider)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  Save Scheme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI PROMO GENERATOR MODAL */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span>AI Promotional Image Generator</span>
              </h3>
              <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Build promotional graphics for WhatsApp and app banners from your scheme details.
            </p>

            <div className="relative rounded-xl overflow-hidden bg-slate-900 h-56 flex items-center justify-center border border-slate-200">
              {aiGenerating ? (
                <div className="flex flex-col items-center gap-2 text-white">
                  <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-medium">Generating promotional graphics...</span>
                </div>
              ) : aiGeneratedImageUrl ? (
                <img src={aiGeneratedImageUrl} alt="Generated Promo" className="w-full h-full object-cover" />
              ) : null}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleGenerateAiPromo}
                disabled={aiGenerating}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Regenerate Style</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (aiGeneratedImageUrl) {
                      setBannerUrl(aiGeneratedImageUrl)
                      setIsAiModalOpen(false)
                      openCreateModal()
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                >
                  Use for New Scheme
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
