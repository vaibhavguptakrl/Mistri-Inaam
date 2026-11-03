import React, { useEffect, useState } from 'react'
import { doc, getDoc, setDoc, addDoc, collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import type { FeatureControls } from '../types'
import { defaultFeatureControls } from '../lib/seed'
import {
  ToggleLeft,
  ToggleRight,
  Save,
  CheckCircle2,
  AlertCircle,
  Gift,
  Users,
  Award,
  Sparkles,
  QrCode,
  MessageSquare,
  Lock,
  Layers,
  Wrench,
  AlertTriangle
} from 'lucide-react'

export const FeatureControlsPage: React.FC = () => {
  const { isOwner, currentUser, adminProfile } = useAuth()
  const [features, setFeatures] = useState<FeatureControls>(defaultFeatureControls)
  const [initialFeatures, setInitialFeatures] = useState<FeatureControls>(defaultFeatureControls)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false)
  const [maintenanceNotice, setMaintenanceNotice] = useState('We are carrying out scheduled maintenance. Please check back soon.')
  const [maintenanceSaving, setMaintenanceSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        setLoading(true)
        const snap = await getDoc(doc(db, 'appSettings', 'features'))
        if (snap.exists()) {
          const data = { ...defaultFeatureControls, ...snap.data() } as FeatureControls
          setFeatures(data)
          setInitialFeatures(data)
        }
      } catch (err) {
        console.error('Failed to load feature controls:', err)
      } finally {
        setLoading(false)
      }
    }
    loadFeatures()
  }, [])

  useEffect(() => onSnapshot(doc(db, 'appSettings', 'maintenance'), (snap) => {
    if (!snap.exists()) return
    const data = snap.data()
    setMaintenanceEnabled(data.enabled === true)
    if (typeof data.message === 'string' && data.message.trim()) setMaintenanceNotice(data.message)
  }, (error) => {
    console.error('Failed to load maintenance mode:', error)
  }), [])

  const toggleMaintenanceMode = async () => {
    if (!isOwner || maintenanceSaving) return
    const nextEnabled = !maintenanceEnabled
    setMaintenanceEnabled(nextEnabled)
    setMaintenanceSaving(true)
    setMessage(null)
    const oldEnabled = !nextEnabled
    const value = {
      enabled: nextEnabled,
      message: maintenanceNotice.trim() || 'We are carrying out scheduled maintenance. Please check back soon.',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.uid || '',
    }
    try {
      await setDoc(doc(db, 'appSettings', 'maintenance'), value, { merge: true })
      await addDoc(collection(db, 'auditLogs'), {
        adminId: currentUser?.uid || '',
        adminEmail: currentUser?.email || adminProfile?.email || 'admin',
        action: nextEnabled ? 'ENABLE_MAINTENANCE_MODE' : 'DISABLE_MAINTENANCE_MODE',
        entity: 'appSettings/maintenance',
        entityId: 'maintenance',
        oldValue: { enabled: oldEnabled },
        newValue: value,
        timestamp: new Date().toISOString(),
      })
      setMessage({ type: 'success', text: nextEnabled ? 'Maintenance mode is now on in the mobile app.' : 'Maintenance mode is now off. The mobile app is available.' })
    } catch (err: any) {
      setMaintenanceEnabled(oldEnabled)
      console.error('Failed to update maintenance mode:', err)
      setMessage({ type: 'error', text: err?.message || 'Could not update maintenance mode.' })
    } finally {
      setMaintenanceSaving(false)
    }
  }

  const handleToggle = (key: keyof FeatureControls) => {
    if (!isOwner) return
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner) return

    setSaving(true)
    setMessage(null)

    try {
      await setDoc(doc(db, 'appSettings', 'features'), features, { merge: true })

      // Audit log
      await addDoc(collection(db, 'auditLogs'), {
        adminId: currentUser?.uid || '',
        adminEmail: currentUser?.email || adminProfile?.email || 'admin',
        action: 'UPDATE_FEATURE_CONTROLS',
        entity: 'appSettings/features',
        entityId: 'features',
        oldValue: initialFeatures,
        newValue: features,
        timestamp: new Date().toISOString()
      })

      setInitialFeatures(features)
      setMessage({ type: 'success', text: 'Feature controls saved successfully!' })
    } catch (err: any) {
      console.error('Failed to save features:', err)
      setMessage({ type: 'error', text: err?.message || 'Failed to save feature controls' })
    } finally {
      setSaving(false)
    }
  }

  const featureList: {
    key: keyof FeatureControls
    label: string
    description: string
    icon: any
    disabled?: boolean
    comingSoonBadge?: boolean
  }[] = [
    {
      key: 'welcomeBonus',
      label: 'Welcome Bonus at Registration',
      description: 'Automatically credits starter bonus points when a new contractor completes registration',
      icon: Gift
    },
    {
      key: 'referral',
      label: 'Refer & Earn System',
      description: 'Awards bonus points to referrer upon referred plumber\'s first purchase credit',
      icon: Users
    },
    {
      key: 'targetBonus',
      label: 'Weekly & Monthly Target Bonuses',
      description: 'Rewards bonus points when contractor crosses purchase milestones',
      icon: Award
    },
    {
      key: 'expiry',
      label: 'Points Expiry Policy',
      description: 'Applies time-based expiry to points ledger batches based on admin months setting',
      icon: Layers
    },
    {
      key: 'leaderboard',
      label: 'Monthly Plumber Leaderboard',
      description: 'Displays top performing contractors of the month on mobile app Home screen',
      icon: Award
    },
    {
      key: 'festivalDoublePoints',
      label: 'Festival Double Points Multiplier',
      description: 'Applies configured festival multiplier (e.g. ×2) on all bill line earnings',
      icon: Sparkles
    },
    {
      key: 'bannerSlider',
      label: 'Promotional Banner Slider',
      description: 'Enables auto-scrolling promotional schemes carousel on plumber mobile app Home',
      icon: Layers
    },
    {
      key: 'redemptionUpi',
      label: 'Redemption via Direct UPI Cash',
      description: 'Allows approved plumbers to request direct bank transfer to their UPI ID',
      icon: Gift
    },
    {
      key: 'redemptionVoucher',
      label: 'Redemption via Shopping Vouchers',
      description: 'Allows plumbers to redeem points for gift / partner store vouchers',
      icon: Gift
    },
    {
      key: 'redemptionTools',
      label: 'Redemption for Plumber Tools & Equipment',
      description: 'Allows plumbers to redeem points for physical mechanical toolkits from catalogue',
      icon: Gift
    },
    {
      key: 'qrScanning',
      label: 'QR Code Purchase Scanning (Future)',
      description: 'Allows scanning printed bill QR codes directly in plumber app (Stub / Planned)',
      icon: QrCode,
      disabled: true
    },
    {
      key: 'whatsappAuto',
      label: 'WhatsApp Automatic Messages',
      description: 'Automated WhatsApp alerts via Meta Cloud API on point credits & redemption updates',
      icon: MessageSquare,
      disabled: true,
      comingSoonBadge: true
    }
  ]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Feature Controls</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Turn specific promotions, redemption methods, and modules ON or OFF with zero code changes
          </p>
        </div>
      </div>

      {!isOwner && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Staff account mode: Viewing controls only. Store Owner privileges required to toggle features.</span>
        </div>
      )}

      <section className={`rounded-2xl border p-5 shadow-sm ${maintenanceEnabled ? 'border-rose-300 bg-rose-50' : 'border-amber-200 bg-amber-50/70'}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2.5 ${maintenanceEnabled ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
              {maintenanceEnabled ? <AlertTriangle className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-slate-900">Mobile app maintenance mode</h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${maintenanceEnabled ? 'bg-rose-200 text-rose-900' : 'bg-emerald-100 text-emerald-800'}`}>
                  {maintenanceEnabled ? 'On' : 'Off'}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
                Temporarily replace the member app with a maintenance notice. Changes take effect for connected apps immediately; this admin panel remains available.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={!isOwner || maintenanceSaving}
            onClick={() => void toggleMaintenanceMode()}
            className={`inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${maintenanceEnabled ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            {maintenanceSaving ? 'Updating…' : maintenanceEnabled ? 'Turn maintenance off' : 'Turn maintenance on'}
          </button>
        </div>
        <div className="mt-4 max-w-2xl">
          <label htmlFor="maintenanceNotice" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Notice shown in the app</label>
          <textarea
            id="maintenanceNotice"
            rows={2}
            disabled={!isOwner || maintenanceSaving}
            value={maintenanceNotice}
            onChange={(event) => setMaintenanceNotice(event.target.value)}
            onBlur={async () => {
              if (!isOwner || !maintenanceEnabled) return
              try {
                await setDoc(doc(db, 'appSettings', 'maintenance'), { message: maintenanceNotice.trim() }, { merge: true })
              } catch (error) {
                console.error('Could not save maintenance notice:', error)
                setMessage({ type: 'error', text: 'Could not save the maintenance notice.' })
              }
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
          />
          <p className="mt-1 text-[11px] text-slate-500">Turn maintenance on or off using the button above. Edit this notice before enabling it.</p>
        </div>
      </section>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm shadow-sm ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <span className="font-semibold">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs hover:underline">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-sm overflow-hidden">
          {featureList.map((item) => {
            const Icon = item.icon
            const isEnabled = features[item.key]
            const isLocked = item.disabled || !isOwner

            return (
              <div
                key={item.key}
                className={`p-4 flex items-center justify-between transition ${
                  isLocked ? 'bg-slate-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3.5 max-w-xl">
                  <div className={`p-2 rounded-lg mt-0.5 ${isEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{item.label}</span>
                      {item.comingSoonBadge && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-600">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleToggle(item.key)}
                    className={`p-1 transition ${
                      isLocked
                        ? 'opacity-40 cursor-not-allowed'
                        : isEnabled
                        ? 'text-emerald-600'
                        : 'text-slate-300 hover:text-slate-400'
                    }`}
                  >
                    {isEnabled ? (
                      <ToggleRight className="w-10 h-10" />
                    ) : (
                      <ToggleLeft className="w-10 h-10" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {isOwner && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Feature Controls'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
