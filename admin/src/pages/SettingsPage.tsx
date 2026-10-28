import React, { useEffect, useState } from 'react'
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import type { GeneralSettings } from '../types'
import { defaultGeneralSettings } from '../lib/seed'
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Percent,
  Coins,
  Gift,
  Calendar,
  Sparkles,
  Eye,
  Lock,
  RotateCcw
} from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const { isOwner, currentUser, adminProfile } = useAuth()
  const [settings, setSettings] = useState<GeneralSettings>(defaultGeneralSettings)
  const [initialSettings, setInitialSettings] = useState<GeneralSettings>(defaultGeneralSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        const snap = await getDoc(doc(db, 'appSettings', 'general'))
        if (snap.exists()) {
          const data = { ...defaultGeneralSettings, ...snap.data() } as GeneralSettings
          setSettings(data)
          setInitialSettings(data)
        }
      } catch (err) {
        console.error('Failed to load general settings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner) return

    setSaving(true)
    setMessage(null)

    try {
      await setDoc(doc(db, 'appSettings', 'general'), settings, { merge: true })

      // Audit log
      await addDoc(collection(db, 'auditLogs'), {
        adminId: currentUser?.uid || '',
        adminEmail: currentUser?.email || adminProfile?.email || 'admin',
        action: 'UPDATE_SETTINGS',
        entity: 'appSettings/general',
        entityId: 'general',
        oldValue: initialSettings,
        newValue: settings,
        timestamp: new Date().toISOString()
      })

      setInitialSettings(settings)
      setMessage({ type: 'success', text: 'Business settings updated and active immediately across all apps!' })
    } catch (err: any) {
      console.error('Failed to save settings:', err)
      setMessage({ type: 'error', text: err?.message || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const update = <K extends keyof GeneralSettings>(key: K, val: GeneralSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure earn percentages, minimum redemption, bonuses, and visibility options
          </p>
        </div>
      </div>

      {!isOwner && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Staff account mode: Viewing settings only. Only the Store Owner can modify these values.</span>
        </div>
      )}

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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Points & Earning Fallbacks */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Percent className="w-4 h-4 text-emerald-600" />
            <span>Points &amp; Earning Rules</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Default Earn % (Fallback) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                disabled={!isOwner}
                value={settings.defaultEarnPercent}
                onChange={(e) => update('defaultEarnPercent', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-400">Used when no specific brand rule matches</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Rupee Value per Point *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                disabled={!isOwner}
                value={settings.rupeeValuePerPoint}
                onChange={(e) => update('rupeeValuePerPoint', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-400">Default: ₹1.00 = 1 point</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Rounding Mode *
              </label>
              <select
                disabled={!isOwner}
                value={settings.roundingMode}
                onChange={(e) => update('roundingMode', e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
              >
                <option value="floor">Round Down (Floor, e.g. 9.8 ➔ 9)</option>
                <option value="round">Nearest (Round, e.g. 9.8 ➔ 10)</option>
                <option value="ceil">Round Up (Ceil, e.g. 9.1 ➔ 10)</option>
              </select>
              <span className="text-[11px] text-slate-400">How fraction points are rounded</span>
            </div>
          </div>
        </div>

        {/* Section 2: Redemption & Bonuses */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Coins className="w-4 h-4 text-emerald-600" />
            <span>Redemption &amp; Contractor Bonuses</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Min Points to Redeem *
              </label>
              <input
                type="number"
                min="1"
                required
                disabled={!isOwner}
                value={settings.minRedeemPoints}
                onChange={(e) => update('minRedeemPoints', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 font-bold text-emerald-700"
              />
              <span className="text-[11px] text-slate-400">App progress bar updates live</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Welcome Bonus (Pts) *
              </label>
              <input
                type="number"
                min="0"
                required
                disabled={!isOwner}
                value={settings.welcomeBonus}
                onChange={(e) => update('welcomeBonus', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-400">Credited at registration (default 500)</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Referral Bonus (Pts) *
              </label>
              <input
                type="number"
                min="0"
                required
                disabled={!isOwner}
                value={settings.referralBonus}
                onChange={(e) => update('referralBonus', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-400">Credited on 1st purchase (default 50)</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Points Expiry (Months) *
              </label>
              <input
                type="number"
                min="1"
                required
                disabled={!isOwner}
                value={settings.pointsExpiryMonths}
                onChange={(e) => update('pointsExpiryMonths', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-400">Lifespan of earned points (default 6)</span>
            </div>
          </div>
        </div>

        {/* Section 3: Target Bonuses & Festivals */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Target Bonus Thresholds &amp; Festival Multipliers</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Weekly Target Bonus</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block">Purchase Min (₹)</label>
                  <input
                    type="number"
                    disabled={!isOwner}
                    value={settings.weeklyTargetThreshold}
                    onChange={(e) => update('weeklyTargetThreshold', Number(e.target.value))}
                    className="w-full px-2 py-1 text-xs border rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block">Bonus Points</label>
                  <input
                    type="number"
                    disabled={!isOwner}
                    value={settings.weeklyTargetPoints}
                    onChange={(e) => update('weeklyTargetPoints', Number(e.target.value))}
                    className="w-full px-2 py-1 text-xs border rounded bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Monthly Target Bonus</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block">Purchase Min (₹)</label>
                  <input
                    type="number"
                    disabled={!isOwner}
                    value={settings.monthlyTargetThreshold}
                    onChange={(e) => update('monthlyTargetThreshold', Number(e.target.value))}
                    className="w-full px-2 py-1 text-xs border rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block">Bonus Points</label>
                  <input
                    type="number"
                    disabled={!isOwner}
                    value={settings.monthlyTargetPoints}
                    onChange={(e) => update('monthlyTargetPoints', Number(e.target.value))}
                    className="w-full px-2 py-1 text-xs border rounded bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-3">
            <span className="text-xs font-bold text-amber-900 uppercase">Festival Double Points Multiplier</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-600 block">Multiplier (e.g. 2.0 = Double)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  disabled={!isOwner}
                  value={settings.festivalMultiplier}
                  onChange={(e) => update('festivalMultiplier', Number(e.target.value))}
                  className="w-full px-2 py-1 text-xs border rounded bg-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">Start Date</label>
                <input
                  type="date"
                  disabled={!isOwner}
                  value={settings.festivalStartDate || ''}
                  onChange={(e) => update('festivalStartDate', e.target.value)}
                  className="w-full px-2 py-1 text-xs border rounded bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">End Date</label>
                <input
                  type="date"
                  disabled={!isOwner}
                  value={settings.festivalEndDate || ''}
                  onChange={(e) => update('festivalEndDate', e.target.value)}
                  className="w-full px-2 py-1 text-xs border rounded bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Plumber App Display Visibility Toggles */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Eye className="w-4 h-4 text-emerald-600" />
            <span>Plumber Mobile App Visibility Controls</span>
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <div className="font-semibold text-sm text-slate-800">Show Earning Rates to Plumbers</div>
                <div className="text-xs text-slate-500">Unlocks "How you earn" screen listing active category rates in plumber app</div>
              </div>
              <input
                type="checkbox"
                disabled={!isOwner}
                checked={settings.showEarningRatesToPlumbers}
                onChange={(e) => update('showEarningRatesToPlumbers', e.target.checked)}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <div className="font-semibold text-sm text-slate-800">Show Calculation Details to Plumbers</div>
                <div className="text-xs text-slate-500">Allows plumbers to tap statement entries to see detailed arithmetic breakdown</div>
              </div>
              <input
                type="checkbox"
                disabled={!isOwner}
                checked={settings.showCalculationDetailsToPlumbers}
                onChange={(e) => update('showCalculationDetailsToPlumbers', e.target.checked)}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Leaderboard Reward Banner Text
              </label>
              <input
                type="text"
                disabled={!isOwner}
                value={settings.leaderboardRewardText}
                onChange={(e) => update('leaderboardRewardText', e.target.value)}
                placeholder="e.g. Top 3 plumbers win special toolkit hampers & bonus points every month!"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        {isOwner && (
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Settings...' : 'Save Settings'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
