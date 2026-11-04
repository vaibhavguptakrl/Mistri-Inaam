import React, { useEffect, useState } from 'react'
import { addDoc, collection, doc, getDoc, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { ArrowDown, ArrowUp, CheckCircle2, ImagePlus, LoaderCircle, Save, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { db, storage } from '../lib/firebase'

interface ShowcaseItem {
  id: string
  title: string
  imageUrl: string
  file?: File
  previewUrl?: string
}

export const LoginShowcasePage: React.FC = () => {
  const { isOwner, currentUser, adminProfile } = useAuth()
  const [enabled, setEnabled] = useState(true)
  const [items, setItems] = useState<ShowcaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'appSettings', 'loginShowcase')).then((snapshot) => {
      if (!snapshot.exists()) return
      const data = snapshot.data()
      setEnabled(data.enabled !== false)
      setItems(Array.isArray(data.items) ? data.items.map((item: any, index: number) => ({
        id: String(item.id || `item-${index}`), title: String(item.title || ''), imageUrl: String(item.imageUrl || '')
      })) : [])
    }).catch((error) => {
      console.error('Could not load login showcase:', error)
      setMessage('Could not load the login slider settings.')
    }).finally(() => setLoading(false))
  }, [])

  const updateItem = (id: string, patch: Partial<ShowcaseItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  const moveItem = (index: number, direction: -1 | 1) => setItems((current) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= current.length) return current
    const reordered = [...current]
    ;[reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]]
    return reordered
  })

  const save = async () => {
    if (!isOwner || saving) return
    setSaving(true)
    setMessage('')
    try {
      const savedItems = await Promise.all(items.map(async (item) => {
        let imageUrl = item.imageUrl.trim()
        if (item.file) {
          const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
          const uploaded = await uploadBytes(ref(storage, `banners/login_showcase_${item.id}_${Date.now()}_${safeName}`), item.file, { contentType: item.file.type })
          imageUrl = await getDownloadURL(uploaded.ref)
        }
        return { id: item.id, title: item.title.trim(), imageUrl }
      }))
      const value = { enabled, items: savedItems.filter((item) => item.imageUrl), updatedAt: new Date().toISOString(), updatedBy: currentUser?.uid || '' }
      await setDoc(doc(db, 'appSettings', 'loginShowcase'), value)
      await addDoc(collection(db, 'auditLogs'), {
        adminId: currentUser?.uid || '', adminEmail: currentUser?.email || adminProfile?.email || 'admin',
        action: 'UPDATE_LOGIN_SHOWCASE', entity: 'appSettings/loginShowcase', entityId: 'loginShowcase',
        newValue: value, timestamp: new Date().toISOString()
      })
      setItems(value.items)
      setMessage('Login slider saved successfully.')
    } catch (error) {
      console.error('Could not save login showcase:', error)
      setMessage('Could not save the login slider. Check image format and Firebase access.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading login slider…</div>

  return <div className="mx-auto max-w-4xl space-y-6">
    <header className="border-b border-slate-200 pb-4">
      <h1 className="text-2xl font-bold text-slate-900">Login product slider</h1>
      <p className="mt-1 text-sm text-slate-500">Choose the product images that automatically scroll on the member login screen.</p>
    </header>

    {!isOwner && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Staff can view these settings. Store Owner privileges are required to change them.</div>}

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-900">Show slider on login</h2>
          <p className="mt-1 text-xs text-slate-500">Turn the scrolling product row on or off.</p>
        </div>
        <button type="button" disabled={!isOwner} onClick={() => setEnabled((value) => !value)} className="text-emerald-600 disabled:opacity-40" aria-label={enabled ? 'Disable login slider' : 'Enable login slider'}>
          {enabled ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10 text-slate-400" />}
        </button>
      </div>
    </section>

    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="font-bold text-slate-900">Slider images</h2><p className="mt-1 text-xs text-slate-500">Add product photos and arrange them in the order they should scroll.</p></div>
        <button type="button" disabled={!isOwner} onClick={() => setItems((current) => [...current, { id: crypto.randomUUID(), title: '', imageUrl: '' }])} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><ImagePlus className="h-4 w-4" /> Add image</button>
      </div>

      {items.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No images added yet. Add product photos to show the scrolling row on login.</p>}
      <div className="space-y-3">
        {items.map((item, index) => <div key={item.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[112px_1fr_auto] sm:items-center">
          <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
            {(item.previewUrl || item.imageUrl) ? <img src={item.previewUrl || item.imageUrl} alt={item.title || `Product ${index + 1}`} className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-slate-400" />}
          </div>
          <div className="space-y-2">
            <input disabled={!isOwner} value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} placeholder="Product name (optional)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-emerald-700">
              <ImagePlus className="h-4 w-4" /> {item.file?.name || (item.imageUrl ? 'Change image' : 'Upload product image')}
              <input disabled={!isOwner} type="file" accept="image/*" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0]
                if (file && file.size > 10 * 1024 * 1024) {
                  setMessage('Choose an image under 10 MB.')
                  event.target.value = ''
                } else if (file) {
                  setMessage('')
                  updateItem(item.id, { file, previewUrl: URL.createObjectURL(file) })
                }
              }} />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">{index + 1}</span>
            <button disabled={!isOwner || index === 0} type="button" onClick={() => moveItem(index, -1)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30" aria-label="Move image up"><ArrowUp className="h-4 w-4" /></button>
            <button disabled={!isOwner || index === items.length - 1} type="button" onClick={() => moveItem(index, 1)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30" aria-label="Move image down"><ArrowDown className="h-4 w-4" /></button>
            <button disabled={!isOwner} type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40" aria-label="Remove image"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>)}
      </div>
    </section>

    <div className="flex flex-col items-end gap-3">
      {message && <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</p>}
      {isOwner && <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save login slider'}</button>}
    </div>
  </div>
}
