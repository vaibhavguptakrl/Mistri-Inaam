import React, { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  runTransaction,
  addDoc
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import type { Plumber, PointRule, Category, Brand, GeneralSettings, FeatureControls } from '../types'
import { defaultGeneralSettings, defaultFeatureControls } from '../lib/seed'
import { evaluateBill, CalculationInputLine } from '../lib/pointCalculator'
import { queueNotification } from '../lib/notificationQueue'
import {
  PlusCircle,
  Trash2,
  Calculator,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
  Calendar,
  FileText
} from 'lucide-react'

export const AddPoints: React.FC = () => {
  const { currentUser, adminProfile } = useAuth()
  const [plumbers, setPlumbers] = useState<Plumber[]>([])
  const [rules, setRules] = useState<PointRule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [settings, setSettings] = useState<GeneralSettings>(defaultGeneralSettings)
  const [features, setFeatures] = useState<FeatureControls>(defaultFeatureControls)
  const [loading, setLoading] = useState(true)

  // Selected Plumber
  const [selectedPlumberId, setSelectedPlumberId] = useState('')
  const [plumberSearch, setPlumberSearch] = useState('')

  // Bill Details
  const [billNumber, setBillNumber] = useState('')
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])

  // Multi-line items
  const [billLines, setBillLines] = useState<CalculationInputLine[]>([
    {
      id: 'line-1',
      category: '',
      brand: '',
      quantityOrAmount: 1000
    }
  ])

  // Override modal
  const [overridingLineId, setOverridingLineId] = useState<string | null>(null)
  const [overrideRuleId, setOverrideRuleId] = useState<string>('')
  const [overrideReason, setOverrideReason] = useState<string>('')

  // Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true)
        // 1. Plumbers
        const pSnap = await getDocs(collection(db, 'plumbers'))
        const pList: Plumber[] = []
        pSnap.forEach(d => pList.push({ ...d.data(), id: d.id } as Plumber))
        setPlumbers(pList)

        // 2. Rules
        const rSnap = await getDocs(collection(db, 'pointRules'))
        const rList: PointRule[] = []
        rSnap.forEach(d => rList.push({ ...d.data(), id: d.id } as PointRule))
        rList.sort((a, b) => a.sortOrder - b.sortOrder)
        setRules(rList)

        // 3. Categories
        const cSnap = await getDocs(collection(db, 'categories'))
        const cList: Category[] = []
        cSnap.forEach(d => cList.push({ ...d.data(), id: d.id } as Category))
        setCategories(cList)

        // 4. Brands
        const bSnap = await getDocs(collection(db, 'brands'))
        const bList: Brand[] = []
        bSnap.forEach(d => bList.push({ ...d.data(), id: d.id } as Brand))
        setBrands(bList)

        // Set default category for first line
        if (cList.length > 0) {
          setBillLines([{ id: 'line-1', category: cList[0].name, brand: '', quantityOrAmount: 1000 }])
        }
      } catch (err) {
        console.error('Error loading data for Add Points:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAll()
  }, [])

  const selectedPlumber = plumbers.find(p => p.id === selectedPlumberId)

  // Live calculation
  const evaluation = evaluateBill(
    billLines,
    rules,
    settings,
    features.festivalDoublePoints
  )

  const addLine = () => {
    setBillLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        category: categories[0]?.name || '',
        brand: '',
        quantityOrAmount: 1000
      }
    ])
  }

  const removeLine = (id: string) => {
    if (billLines.length <= 1) return
    setBillLines(prev => prev.filter(l => l.id !== id))
  }

  const updateLine = (id: string, updates: Partial<CalculationInputLine>) => {
    setBillLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  const handleApplyOverride = (lineId: string) => {
    const selectedRule = rules.find(r => r.id === overrideRuleId) || null
    if (!overrideReason.trim()) {
      alert('Please enter a reason for manually overriding the rule.')
      return
    }
    updateLine(lineId, {
      overrideRule: selectedRule,
      overrideReason: overrideReason.trim()
    })
    setOverridingLineId(null)
    setOverrideReason('')
    setOverrideRuleId('')
  }

  const handleClearOverride = (lineId: string) => {
    updateLine(lineId, {
      overrideRule: null,
      overrideReason: undefined
    })
  }

  const handleConfirmAndSave = async () => {
    if (!selectedPlumber) {
      setErrorMessage('Please select a plumber first.')
      return
    }
    if (billLines.some(l => l.quantityOrAmount <= 0)) {
      setErrorMessage('Please enter positive amounts/quantities for all bill lines.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const plumberRef = doc(db, 'plumbers', selectedPlumber.id)
      const now = new Date().toISOString()
      const txId = `tx_${Date.now()}`

      await runTransaction(db, async (transaction) => {
        const plumberDoc = await transaction.get(plumberRef)
        if (!plumberDoc.exists()) {
          throw new Error('Plumber profile does not exist!')
        }

        const currentBalance = plumberDoc.data().pointsBalance || 0
        const currentLifetime = plumberDoc.data().lifetimeEarned || 0
        const newBalance = currentBalance + evaluation.finalPoints
        const newLifetime = currentLifetime + evaluation.finalPoints

        // 1. Write transaction ledger document with snapshot of each line
        const txRef = doc(db, 'transactions', txId)
        transaction.set(txRef, {
          id: txId,
          plumberId: selectedPlumber.id,
          plumberCode: selectedPlumber.plumberCode,
          plumberName: selectedPlumber.name,
          billNumber: billNumber.trim() || undefined,
          billAmount: evaluation.lines.reduce((s, l) => s + l.inputQuantity, 0),
          points: evaluation.finalPoints,
          rupeeValue: evaluation.finalRupees,
          type: 'purchase',
          lines: evaluation.lines.map(l => ({
            category: l.category,
            brand: l.brand,
            calculationType: l.calculationType,
            rate: l.rate,
            inputQuantity: l.inputQuantity,
            resultRupees: l.resultRupees,
            resultPoints: l.resultPoints,
            ruleName: l.ruleName,
            overridden: l.overridden,
            overrideReason: l.overrideReason
          })),
          calculationSummary: evaluation.calculationSummary,
          festivalMultiplierApplied: evaluation.festivalMultiplier > 1 ? evaluation.festivalMultiplier : null,
          previousBalance: currentBalance,
          newBalance: newBalance,
          adminId: currentUser?.uid || '',
          adminEmail: currentUser?.email || adminProfile?.email || 'admin',
          createdAt: now
        })

        // 2. Update Plumber Balance atomically
        transaction.update(plumberRef, {
          pointsBalance: newBalance,
          lifetimeEarned: newLifetime,
          updatedAt: now
        })
      })

      // 3. First purchase referral bonus check
      if (selectedPlumber.referredBy) {
        try {
          const featSnap = await getDoc(doc(db, 'appSettings', 'features'))
          const isReferralEnabled = featSnap.exists() ? featSnap.data().referral !== false : true

          if (isReferralEnabled) {
            // Check if plumber already had prior purchases
            const priorPurchasesQuery = query(
              collection(db, 'transactions'),
              where('plumberId', '==', selectedPlumber.id),
              where('type', '==', 'purchase')
            )
            const priorPurchasesSnap = await getDocs(priorPurchasesQuery)
            // If this was their very first purchase bill
            if (priorPurchasesSnap.size <= 1) {
              const referrerQuery = query(
                collection(db, 'plumbers'),
                where('plumberCode', '==', selectedPlumber.referredBy.trim())
              )
              const referrerSnap = await getDocs(referrerQuery)
              if (!referrerSnap.empty) {
                const referrerDoc = referrerSnap.docs[0]
                const referrerData = referrerDoc.data() as Plumber

                const genSnap = await getDoc(doc(db, 'appSettings', 'general'))
                const refBonusPts = genSnap.exists() ? (genSnap.data().referralBonus || 50) : 50

                const refTxId = `ref_${Date.now()}`
                await runTransaction(db, async (t) => {
                  const refPlumberRef = doc(db, 'plumbers', referrerDoc.id)
                  const freshRef = await t.get(refPlumberRef)
                  if (!freshRef.exists()) return

                  const curBal = freshRef.data().pointsBalance || 0
                  const curLife = freshRef.data().lifetimeEarned || 0

                  t.update(refPlumberRef, {
                    pointsBalance: curBal + refBonusPts,
                    lifetimeEarned: curLife + refBonusPts,
                    updatedAt: now
                  })

                  const refTxRef = doc(db, 'transactions', refTxId)
                  t.set(refTxRef, {
                    id: refTxId,
                    plumberId: referrerDoc.id,
                    plumberCode: referrerData.plumberCode,
                    plumberName: referrerData.name,
                    points: refBonusPts,
                    rupeeValue: refBonusPts,
                    type: 'referral',
                    calculationSummary: `Referral bonus: ${selectedPlumber.name} (${selectedPlumber.plumberCode}) completed their first purchase bill`,
                    previousBalance: curBal,
                    newBalance: curBal + refBonusPts,
                    adminId: currentUser?.uid || '',
                    adminEmail: currentUser?.email || 'admin',
                    createdAt: now
                  })
                })

                // Notify referrer
                await queueNotification({
                  plumberId: referrerDoc.id,
                  event: 'points_credited',
                  titleEn: 'Referral Bonus Received!',
                  titleHi: 'रेफरल बोनस प्राप्त हुआ!',
                  bodyEn: `You earned ${refBonusPts} points because ${selectedPlumber.name} made their first purchase!`,
                  bodyHi: `आपको ${refBonusPts} अंक मिले क्योंकि ${selectedPlumber.name} ने अपनी पहली खरीदारी की!`
                })
              }
            }
          }
        } catch (refErr) {
          console.error('Error awarding referral bonus:', refErr)
        }
      }

      // 4. Write Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        adminId: currentUser?.uid || '',
        adminEmail: currentUser?.email || adminProfile?.email || 'admin',
        action: 'ADD_PURCHASE_POINTS',
        entity: 'transaction',
        entityId: txId,
        oldValue: null,
        newValue: {
          plumberId: selectedPlumber.id,
          plumberCode: selectedPlumber.plumberCode,
          pointsAdded: evaluation.finalPoints,
          billNumber
        },
        timestamp: now
      })

      setIsConfirmModalOpen(false)
      setSuccessMessage(
        `Successfully added ${evaluation.finalPoints} reward points (₹${evaluation.finalRupees.toFixed(2)}) to ${selectedPlumber.name} (${selectedPlumber.plumberCode})!`
      )

      // Reset form
      setBillNumber('')
      if (categories.length > 0) {
        setBillLines([{ id: `line-${Date.now()}`, category: categories[0].name, brand: '', quantityOrAmount: 1000 }])
      }
    } catch (err: any) {
      console.error('Failed to credit points:', err)
      setErrorMessage(err.message || 'Transaction failed. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredPlumbers = plumbers.filter(p =>
    p.name.toLowerCase().includes(plumberSearch.toLowerCase()) ||
    p.phone.includes(plumberSearch) ||
    p.plumberCode.toLowerCase().includes(plumberSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add Points to Purchase Bill</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Credit reward points with multi-line category &amp; brand arithmetic calculation
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-sm text-emerald-800 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs text-emerald-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-sm text-rose-800 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Bill Input (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Select Plumber */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">1</span>
                <span>Select Contractor / Plumber</span>
              </h2>
              {selectedPlumber && (
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {selectedPlumber.plumberCode}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Search Plumber (Name / Phone / Code)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={plumberSearch}
                    onChange={(e) => setPlumberSearch(e.target.value)}
                    placeholder="Search e.g. Ramesh or 9876543210..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Choose from List ({filteredPlumbers.length} found)
                </label>
                <select
                  value={selectedPlumberId}
                  onChange={(e) => setSelectedPlumberId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">-- Choose Plumber --</option>
                  {filteredPlumbers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.plumberCode}) — {p.phone}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedPlumber && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Contractor: </span>
                  <span className="font-bold text-slate-800">{selectedPlumber.name}</span>
                  <span className="text-slate-400 ml-2 font-mono">({selectedPlumber.phone})</span>
                </div>
                <div>
                  <span className="text-slate-500">Current Balance: </span>
                  <span className="font-bold text-emerald-700">{selectedPlumber.pointsBalance} pts</span>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Bill Header (Number & Date) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">2</span>
              <span>Shop Bill Information</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Bill / Invoice Number (Optional)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="e.g. SA-2026-1082"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Bill Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Multi-Line Bill Items */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">3</span>
                <span>Bill Line Items ({billLines.length})</span>
              </h2>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Add Line</span>
              </button>
            </div>

            <div className="space-y-4">
              {billLines.map((line, index) => {
                const evalLine = evaluation.lines[index]
                return (
                  <div key={line.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-slate-700">Line #{index + 1}</span>
                      {billLines.length > 1 && (
                        <button
                          onClick={() => removeLine(line.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title="Remove Line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Category *
                        </label>
                        <select
                          value={line.category}
                          onChange={(e) => updateLine(line.id, { category: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Brand (Optional)
                        </label>
                        <select
                          value={line.brand}
                          onChange={(e) => updateLine(line.id, { brand: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                          <option value="">Any Brand</option>
                          {brands.map(b => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Amount (₹) or Litres / Qty *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantityOrAmount}
                          onChange={(e) => updateLine(line.id, { quantityOrAmount: Number(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Live Calculation preview for this line */}
                    {evalLine && (
                      <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">{evalLine.ruleName}</span>
                          <span className="text-slate-400 font-mono">({evalLine.calculationText})</span>
                          {evalLine.overridden && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">
                              Overridden
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <span className="font-bold text-emerald-700 text-sm">
                            +{evalLine.resultPoints} pts
                          </span>

                          {/* Override button */}
                          {evalLine.overridden ? (
                            <button
                              onClick={() => handleClearOverride(line.id)}
                              className="text-[11px] text-rose-600 hover:underline"
                            >
                              Reset
                            </button>
                          ) : (
                            <button
                              onClick={() => { setOverridingLineId(line.id); setOverrideRuleId(rules[0]?.id || '') }}
                              className="text-[11px] text-blue-600 hover:underline"
                            >
                              Override Rule
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inline Override Form */}
                    {overridingLineId === line.id && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-2 mt-2">
                        <div className="text-xs font-bold text-amber-900">Manual Rule Override</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={overrideRuleId}
                            onChange={(e) => setOverrideRuleId(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-amber-300 rounded bg-white"
                          >
                            {rules.map(r => (
                              <option key={r.id} value={r.id}>{r.name} ({r.rate} {r.calculationType})</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="Reason for override (required for audit)..."
                            className="w-full px-2 py-1 text-xs border border-amber-300 rounded bg-white"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setOverridingLineId(null)}
                            className="text-xs text-slate-500"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleApplyOverride(line.id)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold"
                          >
                            Apply Override
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Calculation Summary & Confirm Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl sticky top-6 space-y-6 border border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Bill Calculation Summary</span>
              <h3 className="text-xl font-black mt-1">Live Reward Summary</h3>
            </div>

            {/* Breakdown per line */}
            <div className="space-y-3 text-xs divide-y divide-slate-800">
              {evaluation.lines.map((l, idx) => (
                <div key={l.id} className="pt-2 flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-slate-200">
                      Line {idx + 1}: {l.category} {l.brand ? `(${l.brand})` : ''}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">{l.calculationText}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-400">+{l.resultPoints} pts</div>
                    <div className="text-[10px] text-slate-400">₹{l.resultRupees.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Festival Double Points indicator */}
            {evaluation.festivalMultiplier > 1 && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Festival Multiplier Applied:
                </span>
                <span className="font-black text-sm">×{evaluation.festivalMultiplier}</span>
              </div>
            )}

            {/* Total Points Big Display */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase text-slate-400 font-semibold">Total Points to Credit</span>
                <span className="text-3xl font-black text-emerald-400">
                  +{evaluation.finalPoints} <span className="text-xs font-normal text-slate-300">pts</span>
                </span>
              </div>
              <div className="flex justify-between items-baseline mt-1 text-xs text-slate-400">
                <span>Rupee reward value</span>
                <span className="font-bold text-slate-200">₹{evaluation.finalRupees.toFixed(2)}</span>
              </div>
            </div>

            {/* Credit Button */}
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={!selectedPlumber || evaluation.finalPoints <= 0}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Review &amp; Credit Points</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && selectedPlumber && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Points Credit</h3>
              <p className="text-xs text-slate-500">
                This transaction will be recorded in the ledger and update the contractor's live balance.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Contractor:</span>
                <span className="font-bold text-slate-800">{selectedPlumber.name} ({selectedPlumber.plumberCode})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bill Number:</span>
                <span className="font-mono text-slate-800">{billNumber || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lines Count:</span>
                <span className="font-bold text-slate-800">{billLines.length} line items</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-bold">Reward Points:</span>
                <span className="text-base font-black text-emerald-600">+{evaluation.finalPoints} pts (₹{evaluation.finalRupees.toFixed(2)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">New Balance:</span>
                <span className="font-bold text-slate-800">{selectedPlumber.pointsBalance + evaluation.finalPoints} pts</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmAndSave}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {isSaving ? 'Crediting Points...' : 'Yes, Credit Points Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
