import React, { useEffect, useState } from 'react'
import { FirebaseSetupNotice } from '../components/FirebaseSetupNotice'
import {
  Users,
  Award,
  ShieldAlert,
  Gift,
  ArrowUpRight,
  CheckCircle2,
  Trophy,
  Zap,
  Clock,
  Sparkles,
  RefreshCw,
  Phone,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  runTransaction,
  addDoc
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Plumber, GeneralSettings, FeatureControls } from '../types'
import { queueNotification } from '../lib/notificationQueue'

interface LeaderboardEntry {
  plumberId: string
  plumberCode: string
  plumberName: string
  plumberPhone: string
  pointsThisMonth: number
  totalBalance: number
}

export const Dashboard: React.FC = () => {
  const { currentUser, isOwner } = useAuth()
  const [stats, setStats] = useState({
    totalPlumbers: 0,
    pendingKyc: 0,
    totalPointsIssued: 0,
    pendingRedemptions: 0
  })
  const [loading, setLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null)
  const [featureControls, setFeatureControls] = useState<FeatureControls | null>(null)

  // Trigger modal state
  const [runningAction, setRunningAction] = useState<'target' | 'expiry' | null>(null)
  const [actionResult, setActionResult] = useState<{ title: string; message: string; details?: string[] } | null>(null)

  const loadAll = async () => {
    if (!isFirebaseConfigured) return
    try {
      setLoading(true)

      // 1. Settings
      const genSnap = await getDoc(doc(db, 'appSettings', 'general'))
      if (genSnap.exists()) setGeneralSettings(genSnap.data() as GeneralSettings)

      const featSnap = await getDoc(doc(db, 'appSettings', 'features'))
      if (featSnap.exists()) setFeatureControls(featSnap.data() as FeatureControls)

      // 2. Count plumbers and pending KYC
      const plumbersSnap = await getDocs(collection(db, 'plumbers'))
      const totalPlumbers = plumbersSnap.size
      let pendingKyc = 0
      const plumbersMap = new Map<string, Plumber>()

      plumbersSnap.forEach(d => {
        const p = { ...d.data(), id: d.id } as Plumber
        plumbersMap.set(d.id, p)
        if (p.kycStatus === 'pending') pendingKyc++
      })

      // 3. Count pending redemptions
      const redemptionsQuery = query(collection(db, 'redemptionRequests'), where('status', '==', 'pending'))
      const redemptionsSnap = await getDocs(redemptionsQuery)
      const pendingRedemptions = redemptionsSnap.size

      // 4. Calculate total points and current month leaderboard
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const txSnap = await getDocs(collection(db, 'transactions'))
      let totalPoints = 0
      const monthlyPointsMap = new Map<string, number>()

      txSnap.forEach(d => {
        const tx = d.data()
        if (tx.points && tx.points > 0) {
          totalPoints += tx.points
          if (tx.createdAt >= startOfMonth) {
            const current = monthlyPointsMap.get(tx.plumberId) || 0
            monthlyPointsMap.set(tx.plumberId, current + tx.points)
          }
        }
      })

      // Build leaderboard list
      const lbList: LeaderboardEntry[] = []
      plumbersMap.forEach((plumber, id) => {
        const monthlyPts = monthlyPointsMap.get(id) || 0
        lbList.push({
          plumberId: id,
          plumberCode: plumber.plumberCode,
          plumberName: plumber.name,
          plumberPhone: plumber.phone,
          pointsThisMonth: monthlyPts,
          totalBalance: plumber.pointsBalance || 0
        })
      })

      // Sort by points earned this month descending
      lbList.sort((a, b) => b.pointsThisMonth - a.pointsThisMonth)
      setLeaderboard(lbList.slice(0, 5))

      setStats({
        totalPlumbers,
        pendingKyc,
        totalPointsIssued: totalPoints,
        pendingRedemptions
      })
    } catch (err) {
      console.error('Error loading dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Admin Trigger 1: Run Monthly Target Bonus Check
  const handleRunTargetBonus = async () => {
    if (!confirm('Run Monthly Target Bonus Check now for all active plumbers?')) return
    setRunningAction('target')
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const bonusPts = generalSettings?.monthlyTargetPoints || 250
      const threshold = generalSettings?.monthlyTargetThreshold || 20000

      // Get all purchase transactions this month
      const txSnap = await getDocs(collection(db, 'transactions'))
      const monthlySpendMap = new Map<string, number>()
      const alreadyAwardedSet = new Set<string>()

      txSnap.forEach(d => {
        const tx = d.data()
        if (tx.createdAt >= startOfMonth) {
          if (tx.type === 'target_bonus') {
            alreadyAwardedSet.add(tx.plumberId)
          } else if (tx.type === 'purchase') {
            const amount = tx.billAmount || tx.rupeeValue || 0
            const current = monthlySpendMap.get(tx.plumberId) || 0
            monthlySpendMap.set(tx.plumberId, current + amount)
          }
        }
      })

      const plumbersSnap = await getDocs(collection(db, 'plumbers'))
      const rewardedList: string[] = []

      for (const pDoc of plumbersSnap.docs) {
        const p = pDoc.data() as Plumber
        const spend = monthlySpendMap.get(pDoc.id) || 0

        // Check if plumber reached threshold and not already awarded
        if (spend >= threshold && !alreadyAwardedSet.has(pDoc.id)) {
          const nowIso = new Date().toISOString()
          const txId = `tb_${Date.now()}_${pDoc.id.slice(0, 5)}`

          await runTransaction(db, async (t) => {
            const pRef = doc(db, 'plumbers', pDoc.id)
            const freshP = await t.get(pRef)
            if (!freshP.exists()) return

            const curBal = freshP.data().pointsBalance || 0
            const curLife = freshP.data().lifetimeEarned || 0

            // Update balance
            t.update(pRef, {
              pointsBalance: curBal + bonusPts,
              lifetimeEarned: curLife + bonusPts,
              updatedAt: nowIso
            })

            // Record transaction
            const txRef = doc(db, 'transactions', txId)
            t.set(txRef, {
              id: txId,
              plumberId: pDoc.id,
              plumberCode: p.plumberCode,
              plumberName: p.name,
              points: bonusPts,
              rupeeValue: bonusPts * (generalSettings?.rupeeValuePerPoint || 1),
              type: 'target_bonus',
              calculationSummary: `Monthly Target Bonus: Reached ₹${spend.toLocaleString()} purchases (Target: ₹${threshold.toLocaleString()})`,
              previousBalance: curBal,
              newBalance: curBal + bonusPts,
              adminId: currentUser?.uid || '',
              adminEmail: currentUser?.email || 'admin',
              createdAt: nowIso
            })
          })

          // Notify plumber
          await queueNotification({
            plumberId: pDoc.id,
            event: 'monthly_bonus',
            titleEn: 'Monthly Target Bonus Earned!',
            titleHi: 'मासिक लक्ष्य बोनस प्राप्त हुआ!',
            bodyEn: `Congratulations! You met your monthly purchase goal and received ${bonusPts} bonus points!`,
            bodyHi: `बधाई हो! आपने इस माह का खरीदारी लक्ष्य पूरा किया और ${bonusPts} बोनस अंक प्राप्त किए!`
          })

          rewardedList.push(`${p.name} (${p.plumberCode}) - ₹${spend.toLocaleString()} spent → +${bonusPts} pts`)
        }
      }

      setActionResult({
        title: 'Monthly Target Bonus Check Complete',
        message: rewardedList.length > 0
          ? `Successfully awarded ${bonusPts} bonus points to ${rewardedList.length} plumber(s)!`
          : `Checked all plumbers. No new plumbers met the ₹${threshold.toLocaleString()} monthly target threshold today.`,
        details: rewardedList
      })
      await loadAll()
    } catch (err: any) {
      alert('Error running target bonus: ' + err.message)
    } finally {
      setRunningAction(null)
    }
  }

  // Admin Trigger 2: Run Points Expiry Check
  const handleRunExpiryCheck = async () => {
    if (!confirm('Run Points Expiry Check now based on shop settings?')) return
    setRunningAction('expiry')
    try {
      const expiryMonths = generalSettings?.pointsExpiryMonths || 6
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - expiryMonths)
      const cutoffIso = cutoffDate.toISOString()

      // Find plumbers with no recent purchases
      const txSnap = await getDocs(collection(db, 'transactions'))
      const lastTxMap = new Map<string, string>()

      txSnap.forEach(d => {
        const tx = d.data()
        const prev = lastTxMap.get(tx.plumberId)
        if (!prev || tx.createdAt > prev) {
          lastTxMap.set(tx.plumberId, tx.createdAt)
        }
      })

      const plumbersSnap = await getDocs(collection(db, 'plumbers'))
      const expiredList: string[] = []

      for (const pDoc of plumbersSnap.docs) {
        const p = pDoc.data() as Plumber
        const lastActivity = lastTxMap.get(pDoc.id) || p.createdAt

        if (lastActivity < cutoffIso && (p.pointsBalance || 0) > 0) {
          const pointsToExpire = p.pointsBalance || 0
          const nowIso = new Date().toISOString()
          const txId = `exp_${Date.now()}_${pDoc.id.slice(0, 5)}`

          await runTransaction(db, async (t) => {
            const pRef = doc(db, 'plumbers', pDoc.id)
            t.update(pRef, {
              pointsBalance: 0,
              updatedAt: nowIso
            })

            const txRef = doc(db, 'transactions', txId)
            t.set(txRef, {
              id: txId,
              plumberId: pDoc.id,
              plumberCode: p.plumberCode,
              plumberName: p.name,
              points: -pointsToExpire,
              rupeeValue: 0,
              type: 'expiry',
              calculationSummary: `Points expired after ${expiryMonths} months of inactivity (Cutoff: ${cutoffIso.slice(0, 10)})`,
              previousBalance: pointsToExpire,
              newBalance: 0,
              adminId: currentUser?.uid || '',
              adminEmail: currentUser?.email || 'admin',
              createdAt: nowIso
            })
          })

          expiredList.push(`${p.name} (${p.plumberCode}) - Expired ${pointsToExpire} inactive pts`)
        }
      }

      setActionResult({
        title: 'Points Expiry Check Complete',
        message: expiredList.length > 0
          ? `Expired points for ${expiredList.length} inactive contractor account(s).`
          : `All plumber points are active! No accounts exceeded the ${expiryMonths}-month inactivity window.`,
        details: expiredList
      })
      await loadAll()
    } catch (err: any) {
      alert('Error running points expiry: ' + err.message)
    } finally {
      setRunningAction(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shop Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Shiv Agency Loyalty Rewards — Karauli, Rajasthan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            title="Refresh Dashboard"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link
            to="/add-points"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <span>+ Add Points to Bill</span>
          </Link>
        </div>
      </div>

      {/* Firebase Setup Notice */}
      <FirebaseSetupNotice />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Plumbers */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Plumbers</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">
            {stats.totalPlumbers}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Registered contractors</span>
            <Link to="/plumbers" className="text-blue-600 hover:underline inline-flex items-center">
              View all <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* Pending KYC */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending KYC</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-600">
            {stats.pendingKyc}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Awaiting document review</span>
            <Link to="/plumbers" className="text-amber-700 font-medium hover:underline inline-flex items-center">
              Review KYC <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* Total Points Issued */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Points Issued</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-600">
            {stats.totalPointsIssued.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Across all purchase bills & bonuses
          </div>
        </div>

        {/* Pending Redemptions */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Requests</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-purple-600">
            {stats.pendingRedemptions}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>UPI, Vouchers & Tools</span>
            <Link to="/redemptions" className="text-purple-700 font-medium hover:underline inline-flex items-center">
              Queue <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ADMIN AUTOMATION TRIGGERS CARD */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500 text-slate-900 text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                Free Spark Plan Friendly
              </span>
              <span className="text-xs text-slate-300">100% Serverless & Manual Triggers</span>
            </div>
            <h2 className="text-lg font-bold mt-2 flex items-center gap-2">
              <Zap className="text-amber-400" size={20} />
              Periodic Reward & Maintenance Automation
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Cloud Functions require the paid Blaze plan. These one-click triggers perform monthly target bonuses and points expiry safely directly from your admin panel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunTargetBonus}
              disabled={runningAction !== null}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <Sparkles size={16} />
              {runningAction === 'target' ? 'Checking targets...' : 'Run Monthly Target Bonus'}
            </button>

            <button
              onClick={handleRunExpiryCheck}
              disabled={runningAction !== null}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
            >
              <Clock size={16} />
              {runningAction === 'expiry' ? 'Checking expiry...' : 'Run Points Expiry Check'}
            </button>
          </div>
        </div>
      </div>

      {/* MONTHLY LEADERBOARD & SHOP PROMOTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Trophy size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Monthly Contractor Champions</h3>
                <p className="text-xs text-slate-500">
                  Top performers this month ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})
                </p>
              </div>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
              Live Standings
            </span>
          </div>

          {/* Leaderboard Reward Announcement Banner */}
          {generalSettings?.leaderboardRewardText && (
            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-lg flex items-center gap-2 text-xs text-amber-900">
              <Sparkles size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>Shop Owner Reward:</strong> {generalSettings.leaderboardRewardText}
              </span>
            </div>
          )}

          {/* Plumber Ranking List */}
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No points awarded yet this month. Add purchase points to see rankings here!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {leaderboard.map((item, index) => {
                const rank = index + 1
                return (
                  <div key={item.plumberId} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Rank Medal */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                          rank === 1
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : rank === 2
                            ? 'bg-slate-300 text-slate-900'
                            : rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {rank === 1 ? '1' : rank === 2 ? '2' : rank === 3 ? '3' : rank}
                      </div>

                      <div>
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          {item.plumberName}
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            {item.plumberCode}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <Phone size={10} />
                          <span>{item.plumberPhone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-emerald-600 text-sm">
                        +{item.pointsThisMonth.toLocaleString()} pts
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Total: {item.totalBalance.toLocaleString()} pts
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Phase Checklist & Shop Quick Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Project Progress & Phases
          </h3>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <span className="font-semibold text-emerald-900">Phase 1: Scaffolding & Setup</span>
              <span className="text-emerald-700 font-bold">✓ Ready</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <span className="font-semibold text-emerald-900">Phase 2: Auth, KYC & PIN</span>
              <span className="text-emerald-700 font-bold">✓ Ready</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <span className="font-semibold text-emerald-900">Phase 3: Multi-Line Rules & Bills</span>
              <span className="text-emerald-700 font-bold">✓ Ready</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <span className="font-semibold text-emerald-900">Phase 4: Settings & Promos</span>
              <span className="text-emerald-700 font-bold">✓ Ready</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <span className="font-semibold text-emerald-900">Phase 5: Redemption & Catalogue</span>
              <span className="text-emerald-700 font-bold">✓ Ready</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <span className="font-semibold text-emerald-900">Phase 6: Welcome, Referral & Targets</span>
              <span className="text-emerald-700 font-bold">✓ Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION RESULT MODAL */}
      {actionResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" />
                {actionResult.title}
              </h3>
              <button
                onClick={() => setActionResult(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-600">{actionResult.message}</p>

            {actionResult.details && actionResult.details.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1 max-h-48 overflow-y-auto">
                <p className="font-bold text-slate-700 mb-1">Details:</p>
                {actionResult.details.map((d, i) => (
                  <p key={i} className="text-slate-600 font-mono">• {d}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActionResult(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
