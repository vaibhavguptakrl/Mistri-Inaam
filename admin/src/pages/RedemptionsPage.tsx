import React, { useState, useEffect } from 'react'
import {
  collection,
  query,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  orderBy
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import {
  RedemptionRequest,
  CatalogueItem,
  Plumber
} from '../types'
import { queueNotification } from '../lib/notificationQueue'
import {
  Gift,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Phone,
  MessageSquare,
  Wrench,
  Tag,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Truck
} from 'lucide-react'

const DEFAULT_SAMPLE_CATALOGUE: Omit<CatalogueItem, 'id' | 'createdAt'>[] = [
  {
    name: 'Heavy Duty Pipe Wrench 14"',
    description: 'Forged steel plumbing wrench with high-torque teeth, suitable for CPVC, GI and borewell pipes.',
    pointsCost: 1800,
    rupeeValue: 1800,
    category: 'tool',
    imageUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80',
    inStock: true
  },
  {
    name: 'Automatic CPVC / PVC Pipe Cutter',
    description: 'Heavy duty ratchet pipe cutter up to 42mm with Japanese SK5 high-carbon steel blade.',
    pointsCost: 2200,
    rupeeValue: 2200,
    category: 'tool',
    imageUrl: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80',
    inStock: true
  },
  {
    name: 'Electric PPR / CPVC Welding Machine (800W)',
    description: 'Complete heating machine kit with 20mm, 25mm, 32mm dies and metal storage carry case.',
    pointsCost: 3500,
    rupeeValue: 3500,
    category: 'tool',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
    inStock: true
  },
  {
    name: 'Tap & Die Threading Tool Kit (1/2" to 1")',
    description: 'Portable ratchet die head for manual GI threading on site with hardened alloy dies.',
    pointsCost: 2800,
    rupeeValue: 2800,
    category: 'tool',
    imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
    inStock: true
  },
  {
    name: 'Amazon Shopping Voucher - ₹500',
    description: 'Digital gift card usable on Amazon India for all products, tools, and mobile recharges.',
    pointsCost: 500,
    rupeeValue: 500,
    category: 'voucher',
    imageUrl: 'https://images.unsplash.com/photo-1526178613552-2b45c6c302f0?auto=format&fit=crop&w=600&q=80',
    inStock: true
  },
  {
    name: 'Flipkart Shopping Voucher - ₹1,000',
    description: 'E-gift card usable on Flipkart India with instant PIN code delivery.',
    pointsCost: 1000,
    rupeeValue: 1000,
    category: 'voucher',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80',
    inStock: true
  }
]

export const RedemptionsPage: React.FC = () => {
  const { currentUser, isOwner } = useAuth()
  const [activeTab, setActiveTab] = useState<'requests' | 'catalogue'>('requests')

  // Requests state
  const [requests, setRequests] = useState<RedemptionRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'paid' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Processing Modals
  const [selectedRequest, setSelectedRequest] = useState<RedemptionRequest | null>(null)
  const [processAction, setProcessAction] = useState<'pay_upi' | 'issue_voucher' | 'dispatch_tool' | 'reject' | null>(null)
  const [upiReference, setUpiReference] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [dispatchNote, setDispatchNote] = useState('Handed over at Shiv Agency Counter')
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Catalogue state
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([])
  const [loadingCatalogue, setLoadingCatalogue] = useState(true)
  const [catalogueSearch, setCatalogueSearch] = useState('')
  const [catalogueCategoryFilter, setCatalogueCategoryFilter] = useState<'all' | 'tool' | 'voucher'>('all')

  // Catalogue Add/Edit Modal
  const [showCatalogueModal, setShowCatalogueModal] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogueItem | null>(null)
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [catCategory, setCatCategory] = useState<'tool' | 'voucher'>('tool')
  const [catPoints, setCatPoints] = useState<number>(1000)
  const [catRupees, setCatRupees] = useState<number>(1000)
  const [catImageUrl, setCatImageUrl] = useState('')
  const [catInStock, setCatInStock] = useState(true)
  const [savingCatalogue, setSavingCatalogue] = useState(false)

  // Load Requests
  const loadRequests = async () => {
    try {
      setLoadingRequests(true)
      const q = query(collection(db, 'redemptionRequests'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const list: RedemptionRequest[] = []
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as RedemptionRequest)
      })
      setRequests(list)
    } catch (err) {
      console.error('Error loading redemption requests:', err)
    } finally {
      setLoadingRequests(false)
    }
  }

  // Load Catalogue
  const loadCatalogue = async () => {
    try {
      setLoadingCatalogue(true)
      const q = query(collection(db, 'catalogue'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const list: CatalogueItem[] = []
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as CatalogueItem)
      })
      setCatalogue(list)
    } catch (err) {
      console.error('Error loading catalogue:', err)
    } finally {
      setLoadingCatalogue(false)
    }
  }

  useEffect(() => {
    loadRequests()
    loadCatalogue()
  }, [])

  // Seed sample catalogue if empty
  const handleSeedCatalogue = async () => {
    if (!confirm('Add 6 popular plumbing tools and digital vouchers to the catalogue?')) return
    setSavingCatalogue(true)
    try {
      const now = new Date().toISOString()
      for (const item of DEFAULT_SAMPLE_CATALOGUE) {
        await addDoc(collection(db, 'catalogue'), {
          ...item,
          createdAt: now
        })
      }
      await loadCatalogue()
      alert('Sample catalogue items added successfully!')
    } catch (err: any) {
      alert('Error seeding catalogue: ' + err.message)
    } finally {
      setSavingCatalogue(false)
    }
  }

  // Handle Approve & Process
  const handleApprove = async () => {
    if (!selectedRequest) return
    setActionError(null)

    if (processAction === 'pay_upi' && !upiReference.trim()) {
      setActionError('Please enter the UPI Reference ID / UTR number from your payment app.')
      return
    }
    if (processAction === 'issue_voucher' && !voucherCode.trim()) {
      setActionError('Please enter the voucher coupon code or gift card number.')
      return
    }
    if (processAction === 'dispatch_tool' && !dispatchNote.trim()) {
      setActionError('Please specify dispatch tracking info or delivery counter note.')
      return
    }

    setProcessing(true)
    try {
      const plumberRef = doc(db, 'plumbers', selectedRequest.plumberId)
      const reqRef = doc(db, 'redemptionRequests', selectedRequest.id)
      const now = new Date().toISOString()

      // Run atomic transaction: verify balance, deduct points, record ledger, update status
      await runTransaction(db, async (transaction) => {
        const plumberDoc = await transaction.get(plumberRef)
        if (!plumberDoc.exists()) {
          throw new Error('Plumber profile not found in database.')
        }

        const plumberData = plumberDoc.data() as Plumber
        const currentBalance = plumberData.pointsBalance || 0

        if (currentBalance < selectedRequest.points) {
          throw new Error(
            `Insufficient points! Plumber has ${currentBalance} pts, but request is for ${selectedRequest.points} pts.`
          )
        }

        const newBalance = currentBalance - selectedRequest.points
        const newTotalRedeemed = (plumberData.totalRedeemed || 0) + selectedRequest.points

        // 1. Update plumber document
        transaction.update(plumberRef, {
          pointsBalance: newBalance,
          totalRedeemed: newTotalRedeemed,
          updatedAt: now
        })

        // 2. Determine status and remarks
        let finalStatus: 'paid' | 'dispatched' = 'paid'
        let remarksText = ''
        if (processAction === 'pay_upi') {
          finalStatus = 'paid'
          remarksText = `UPI Transfer to ${selectedRequest.upiId}. UTR: ${upiReference.trim()}`
        } else if (processAction === 'issue_voucher') {
          finalStatus = 'paid'
          remarksText = `Voucher: ${selectedRequest.voucherDetails || 'Digital Gift Card'}. Code: ${voucherCode.trim()}`
        } else {
          finalStatus = 'dispatched'
          remarksText = `Tool: ${selectedRequest.toolDetails || 'Plumbing Tool'}. Status: ${dispatchNote.trim()}`
        }

        // 3. Create ledger transaction
        const txRef = doc(collection(db, 'transactions'))
        transaction.set(txRef, {
          plumberId: selectedRequest.plumberId,
          plumberCode: selectedRequest.plumberCode,
          plumberName: selectedRequest.plumberName,
          points: -selectedRequest.points,
          rupeeValue: selectedRequest.rupeeValue,
          type: 'redemption',
          billAmount: selectedRequest.rupeeValue,
          calculationSummary: remarksText,
          previousBalance: currentBalance,
          newBalance: newBalance,
          adminId: currentUser?.uid || '',
          adminEmail: currentUser?.email || '',
          createdAt: now
        })

        // 4. Update request document
        transaction.update(reqRef, {
          status: finalStatus,
          upiReference: processAction === 'pay_upi' ? upiReference.trim() : null,
          adminRemarks: remarksText,
          processedBy: currentUser?.email || 'admin',
          updatedAt: now
        })

        // 5. Audit log
        const auditRef = doc(collection(db, 'auditLogs'))
        transaction.set(auditRef, {
          action: 'REDEMPTION_APPROVED',
          adminId: currentUser?.uid || '',
          adminEmail: currentUser?.email || '',
          targetId: selectedRequest.id,
          targetType: 'redemptionRequest',
          details: {
            plumberId: selectedRequest.plumberId,
            points: selectedRequest.points,
            rupeeValue: selectedRequest.rupeeValue,
            method: selectedRequest.method,
            remarks: remarksText
          },
          createdAt: now
        })
      })

      // Queue in-app notification & push message
      await queueNotification({
        plumberId: selectedRequest.plumberId,
        event: 'redemption_approved',
        titleEn: 'Reward Points Redeemed!',
        titleHi: 'इनाम अंक सफलतापूर्वक रिडीम हुए!',
        bodyEn: `Your redemption of ${selectedRequest.points} points (₹${selectedRequest.rupeeValue}) has been approved and processed.`,
        bodyHi: `आपका ${selectedRequest.points} अंकों (₹${selectedRequest.rupeeValue}) का रिडेम्पशन स्वीकृत व प्रोसेस कर दिया गया है।`,
        variables: {
          points: selectedRequest.points,
          rupeeValue: selectedRequest.rupeeValue,
          method: selectedRequest.method
        }
      })

      // Reset and refresh
      setSelectedRequest(null)
      setProcessAction(null)
      setUpiReference('')
      setVoucherCode('')
      setDispatchNote('Handed over at Shiv Agency Counter')
      await loadRequests()
    } catch (err: any) {
      setActionError(err.message || 'Failed to process redemption.')
    } finally {
      setProcessing(false)
    }
  }

  // Handle Reject Request
  const handleReject = async () => {
    if (!selectedRequest) return
    if (!rejectReason.trim()) {
      setActionError('Please enter a reason for rejecting this request.')
      return
    }

    setProcessing(true)
    setActionError(null)
    try {
      const reqRef = doc(db, 'redemptionRequests', selectedRequest.id)
      const now = new Date().toISOString()

      await updateDoc(reqRef, {
        status: 'rejected',
        adminRemarks: rejectReason.trim(),
        processedBy: currentUser?.email || 'admin',
        updatedAt: now
      })

      // Write audit log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'REDEMPTION_REJECTED',
        adminId: currentUser?.uid || '',
        adminEmail: currentUser?.email || '',
        targetId: selectedRequest.id,
        targetType: 'redemptionRequest',
        details: {
          plumberId: selectedRequest.plumberId,
          points: selectedRequest.points,
          reason: rejectReason.trim()
        },
        createdAt: now
      })

      // Send rejection notification
      await queueNotification({
        plumberId: selectedRequest.plumberId,
        event: 'redemption_rejected',
        titleEn: 'Redemption Request Rejected',
        titleHi: 'रिडेम्पशन अनुरोध अस्वीकृत',
        bodyEn: `Your redemption request for ${selectedRequest.points} points could not be approved: ${rejectReason.trim()}`,
        bodyHi: `आपका ${selectedRequest.points} अंकों का रिडेम्पशन अनुरोध अस्वीकृत कर दिया गया है: ${rejectReason.trim()}`,
        variables: {
          points: selectedRequest.points,
          reason: rejectReason.trim()
        }
      })

      setSelectedRequest(null)
      setProcessAction(null)
      setRejectReason('')
      await loadRequests()
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject request.')
    } finally {
      setProcessing(false)
    }
  }

  // Save Catalogue Item (Create or Edit)
  const handleSaveCatalogueItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) return
    setSavingCatalogue(true)

    try {
      const now = new Date().toISOString()
      const data = {
        name: catName.trim(),
        description: catDesc.trim(),
        category: catCategory,
        pointsCost: Number(catPoints),
        rupeeValue: Number(catRupees),
        imageUrl: catImageUrl.trim() || null,
        inStock: catInStock
      }

      if (editingItem) {
        await updateDoc(doc(db, 'catalogue', editingItem.id), {
          ...data,
          updatedAt: now
        })
      } else {
        await addDoc(collection(db, 'catalogue'), {
          ...data,
          createdAt: now
        })
      }

      setShowCatalogueModal(false)
      setEditingItem(null)
      await loadCatalogue()
    } catch (err: any) {
      alert('Error saving catalogue item: ' + err.message)
    } finally {
      setSavingCatalogue(false)
    }
  }

  // Toggle Catalogue Item Stock
  const handleToggleStock = async (item: CatalogueItem) => {
    try {
      await updateDoc(doc(db, 'catalogue', item.id), {
        inStock: !item.inStock
      })
      setCatalogue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, inStock: !i.inStock } : i))
      )
    } catch (err: any) {
      alert('Error updating stock status: ' + err.message)
    }
  }

  // Delete Catalogue Item
  const handleDeleteCatalogueItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the catalogue?`)) return
    try {
      await deleteDoc(doc(db, 'catalogue', id))
      setCatalogue((prev) => prev.filter((i) => i.id !== id))
    } catch (err: any) {
      alert('Error deleting item: ' + err.message)
    }
  }

  // Open modal for new catalogue item
  const openNewCatalogueModal = () => {
    setEditingItem(null)
    setCatName('')
    setCatDesc('')
    setCatCategory('tool')
    setCatPoints(1500)
    setCatRupees(1500)
    setCatImageUrl('')
    setCatInStock(true)
    setShowCatalogueModal(true)
  }

  // Open modal for editing catalogue item
  const openEditCatalogueModal = (item: CatalogueItem) => {
    setEditingItem(item)
    setCatName(item.name)
    setCatDesc(item.description)
    setCatCategory(item.category)
    setCatPoints(item.pointsCost)
    setCatRupees(item.rupeeValue)
    setCatImageUrl(item.imageUrl || '')
    setCatInStock(item.inStock)
    setShowCatalogueModal(true)
  }

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (requestFilter === 'pending' && r.status !== 'pending') return false
    if (requestFilter === 'paid' && r.status !== 'paid' && r.status !== 'dispatched') return false
    if (requestFilter === 'rejected' && r.status !== 'rejected') return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = r.plumberName.toLowerCase().includes(q)
      const matchCode = r.plumberCode.toLowerCase().includes(q)
      const matchPhone = r.plumberPhone.includes(q)
      const matchUpi = r.upiId?.toLowerCase().includes(q) || false
      return matchName || matchCode || matchPhone || matchUpi
    }
    return true
  })

  // Filter catalogue
  const filteredCatalogue = catalogue.filter((item) => {
    if (catalogueCategoryFilter !== 'all' && item.category !== catalogueCategoryFilter) return false
    if (catalogueSearch.trim()) {
      const q = catalogueSearch.toLowerCase()
      return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    }
    return true
  })

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const totalPendingPoints = requests
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + (r.points || 0), 0)
  const paidCount = requests.filter((r) => r.status === 'paid' || r.status === 'dispatched').length

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Gift className="text-emerald-600" />
            Redemption & Rewards Centre
          </h1>
          <p className="text-sm text-slate-500">
            Process plumber withdrawal requests (UPI, vouchers, tools) and manage the reward catalogue.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeTab === 'requests'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={16} />
            Requests Queue
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              activeTab === 'catalogue'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench size={16} />
            Reward Catalogue ({catalogue.length})
          </button>
        </div>
      </div>

      {/* TAB 1: REQUESTS QUEUE */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pending Requests</p>
                <p className="text-2xl font-extrabold text-amber-900 mt-1">{pendingCount}</p>
                <p className="text-xs text-amber-600 font-medium mt-0.5">Worth {totalPendingPoints.toLocaleString()} points</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                <Clock size={24} />
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Fulfilled & Paid</p>
                <p className="text-2xl font-extrabold text-emerald-900 mt-1">{paidCount}</p>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">UPI, vouchers & tools delivered</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                <CheckCircle2 size={24} />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Total Lifetime Requests</p>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">{requests.length}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Across all reward methods</p>
              </div>
              <div className="w-12 h-12 bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center font-bold">
                <Gift size={24} />
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
            {/* Filter Pills */}
            <div className="flex gap-2">
              <button
                onClick={() => setRequestFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  requestFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({requests.length})
              </button>
              <button
                onClick={() => setRequestFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                  requestFilter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setRequestFilter('paid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  requestFilter === 'paid'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                }`}
              >
                Paid / Dispatched ({paidCount})
              </button>
              <button
                onClick={() => setRequestFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  requestFilter === 'rejected'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                }`}
              >
                Rejected
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plumber, code, UPI..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Requests List */}
          {loadingRequests ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <RefreshCw className="animate-spin mx-auto mb-2 text-emerald-600" size={24} />
              Loading redemption requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
              <Gift className="mx-auto text-slate-300 mb-2" size={40} />
              <p className="text-slate-600 font-medium">No redemption requests found</p>
              <p className="text-xs text-slate-400 mt-1">
                When plumbers submit requests from their Android app, they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className={`bg-white rounded-xl border p-5 shadow-sm transition hover:shadow-md ${
                    req.status === 'pending'
                      ? 'border-amber-300 ring-1 ring-amber-100'
                      : req.status === 'paid' || req.status === 'dispatched'
                      ? 'border-slate-200'
                      : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    {/* Plumber Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-lg">{req.plumberName}</span>
                        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-mono font-semibold">
                          {req.plumberCode}
                        </span>

                        {/* Status Badge */}
                        {req.status === 'pending' && (
                          <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Clock size={12} /> Pending Approval
                          </span>
                        )}
                        {req.status === 'paid' && (
                          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Paid
                          </span>
                        )}
                        {req.status === 'dispatched' && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Truck size={12} /> Dispatched / Delivered
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <XCircle size={12} /> Rejected
                          </span>
                        )}
                      </div>

                      {/* Phone, WhatsApp, and Request Date */}
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Phone size={12} /> {req.plumberPhone}
                        </span>
                        <a
                          href={`tel:${req.plumberPhone}`}
                          className="text-blue-600 hover:underline"
                        >
                          Call
                        </a>
                        <a
                          href={`https://wa.me/${req.plumberPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:underline flex items-center gap-0.5"
                        >
                          <MessageSquare size={12} /> WhatsApp
                        </a>
                        <span>Requested: {new Date(req.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Method & Amount Details */}
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center gap-6 min-w-[280px]">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Reward Details
                        </div>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                          {req.method === 'upi' && <CreditCard size={16} className="text-emerald-600" />}
                          {req.method === 'voucher' && <Tag size={16} className="text-purple-600" />}
                          {req.method === 'tool' && <Wrench size={16} className="text-amber-600" />}
                          <span className="capitalize">{req.method}</span>
                          {req.method === 'upi' && req.upiId && (
                            <span className="font-mono text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {req.upiId}
                            </span>
                          )}
                        </div>
                        {req.voucherDetails && (
                          <p className="text-xs text-purple-700 font-medium">{req.voucherDetails}</p>
                        )}
                        {req.toolDetails && (
                          <p className="text-xs text-amber-700 font-medium">{req.toolDetails}</p>
                        )}
                      </div>

                      <div className="text-right ml-auto border-l border-slate-200 pl-4">
                        <div className="text-lg font-black text-emerald-600">
                          {req.points.toLocaleString()} pts
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                          ₹{req.rupeeValue.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons for Pending Requests */}
                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2 w-full lg:w-auto">
                        {req.method === 'upi' && (
                          <button
                            onClick={() => {
                              setSelectedRequest(req)
                              setProcessAction('pay_upi')
                              setUpiReference('')
                              setActionError(null)
                            }}
                            className="flex-1 lg:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition"
                          >
                            <CreditCard size={14} /> Pay via UPI
                          </button>
                        )}

                        {req.method === 'voucher' && (
                          <button
                            onClick={() => {
                              setSelectedRequest(req)
                              setProcessAction('issue_voucher')
                              setVoucherCode('')
                              setActionError(null)
                            }}
                            className="flex-1 lg:flex-initial bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition"
                          >
                            <Tag size={14} /> Issue Voucher Code
                          </button>
                        )}

                        {req.method === 'tool' && (
                          <button
                            onClick={() => {
                              setSelectedRequest(req)
                              setProcessAction('dispatch_tool')
                              setDispatchNote('Handed over at Shiv Agency Counter')
                              setActionError(null)
                            }}
                            className="flex-1 lg:flex-initial bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition"
                          >
                            <Truck size={14} /> Dispatch / Hand Over
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedRequest(req)
                            setProcessAction('reject')
                            setRejectReason('')
                            setActionError(null)
                          }}
                          className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-semibold px-3 py-2.5 rounded-lg transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Remarks / Proof / Tracking info if fulfilled */}
                  {req.adminRemarks && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center gap-2">
                      <span className="font-semibold text-slate-800">Admin Remarks:</span>
                      <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {req.adminRemarks}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REWARD CATALOGUE */}
      {activeTab === 'catalogue' && (
        <div className="space-y-6">
          {/* Catalogue Actions Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex gap-2">
              <button
                onClick={() => setCatalogueCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  catalogueCategoryFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Rewards
              </button>
              <button
                onClick={() => setCatalogueCategoryFilter('tool')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                  catalogueCategoryFilter === 'tool'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                <Wrench size={12} /> Plumber Tools
              </button>
              <button
                onClick={() => setCatalogueCategoryFilter('voucher')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                  catalogueCategoryFilter === 'voucher'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                }`}
              >
                <Tag size={12} /> Digital Vouchers
              </button>
            </div>

            <div className="flex items-center gap-2">
              {catalogue.length === 0 && (
                <button
                  onClick={handleSeedCatalogue}
                  disabled={savingCatalogue}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5"
                >
                  <Sparkles size={14} /> Seed Sample Tools & Vouchers
                </button>
              )}
              {isOwner && (
                <button
                  onClick={openNewCatalogueModal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={16} /> Add Reward Item
                </button>
              )}
            </div>
          </div>

          {/* Catalogue Grid */}
          {loadingCatalogue ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <RefreshCw className="animate-spin mx-auto mb-2 text-emerald-600" size={24} />
              Loading reward catalogue...
            </div>
          ) : filteredCatalogue.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
              <Wrench className="mx-auto text-slate-300 mb-2" size={40} />
              <p className="text-slate-600 font-medium">No items in the reward catalogue</p>
              <p className="text-xs text-slate-400 mt-1">
                Click "Seed Sample Tools & Vouchers" above to populate with standard plumbing gear.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCatalogue.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                    item.inStock ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
                  }`}
                >
                  <div>
                    {/* Item Image */}
                    <div className="h-44 bg-slate-100 relative overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          {item.category === 'tool' ? <Wrench size={48} /> : <Tag size={48} />}
                        </div>
                      )}

                      {/* Category Badge */}
                      <span
                        className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm ${
                          item.category === 'tool'
                            ? 'bg-amber-500 text-white'
                            : 'bg-purple-600 text-white'
                        }`}
                      >
                        {item.category === 'tool' ? 'Plumber Tool' : 'Voucher'}
                      </span>

                      {/* Stock Badge */}
                      <span
                        className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm ${
                          item.inStock
                            ? 'bg-emerald-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {item.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-slate-800 text-base line-clamp-1">{item.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                    </div>
                  </div>

                  {/* Footer with points & actions */}
                  <div className="p-4 pt-0">
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div>
                        <div className="text-lg font-black text-emerald-600">
                          {item.pointsCost.toLocaleString()} pts
                        </div>
                        <div className="text-xs font-semibold text-slate-400">
                          Value: ₹{item.rupeeValue.toLocaleString()}
                        </div>
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleStock(item)}
                            title={item.inStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                            className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                              item.inStock
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                            }`}
                          >
                            {item.inStock ? 'Out of Stock' : 'Mark In Stock'}
                          </button>
                          <button
                            onClick={() => openEditCatalogueModal(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCatalogueItem(item.id, item.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: PROCESS REDEMPTION ACTION */}
      {selectedRequest && processAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                {processAction === 'pay_upi' && <CreditCard className="text-emerald-600" />}
                {processAction === 'issue_voucher' && <Tag className="text-purple-600" />}
                {processAction === 'dispatch_tool' && <Truck className="text-amber-600" />}
                {processAction === 'reject' && <AlertCircle className="text-rose-600" />}
                {processAction === 'pay_upi' && 'Process UPI Cash Payment'}
                {processAction === 'issue_voucher' && 'Issue Shopping Voucher'}
                {processAction === 'dispatch_tool' && 'Deliver Plumbing Tool'}
                {processAction === 'reject' && 'Reject Redemption Request'}
              </h3>
              <button
                onClick={() => {
                  setSelectedRequest(null)
                  setProcessAction(null)
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Plumber & Points Summary Banner */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">{selectedRequest.plumberName}</p>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedRequest.plumberCode} • {selectedRequest.plumberPhone}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold text-emerald-600">
                  {selectedRequest.points.toLocaleString()} pts
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  ₹{selectedRequest.rupeeValue.toLocaleString()}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 font-medium">
                {actionError}
              </div>
            )}

            {/* UPI Payment Input */}
            {processAction === 'pay_upi' && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                  <p className="font-bold">Plumber's Registered UPI ID:</p>
                  <p className="font-mono text-sm font-extrabold text-emerald-800 mt-0.5">
                    {selectedRequest.upiId || 'Not provided'}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Send ₹{selectedRequest.rupeeValue} via Google Pay, PhonePe, Paytm, or BHIM to this UPI ID, then paste the UTR number below.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank UTR / Transaction Reference Number *
                  </label>
                  <input
                    type="text"
                    value={upiReference}
                    onChange={(e) => setUpiReference(e.target.value)}
                    placeholder="e.g. 234567890123"
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This reference is visible to the plumber on their app statement.
                  </p>
                </div>
              </div>
            )}

            {/* Voucher Code Input */}
            {processAction === 'issue_voucher' && (
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900">
                  <p className="font-bold">Requested Voucher:</p>
                  <p className="text-sm font-bold text-purple-800 mt-0.5">
                    {selectedRequest.voucherDetails || 'Shopping Voucher'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Voucher Coupon Code / Card Number *
                  </label>
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="e.g. AMZN-REWARD-58291"
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    The plumber will receive this code in-app to use on the brand site.
                  </p>
                </div>
              </div>
            )}

            {/* Tool Dispatch Input */}
            {processAction === 'dispatch_tool' && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <p className="font-bold">Requested Tool:</p>
                  <p className="text-sm font-bold text-amber-800 mt-0.5">
                    {selectedRequest.toolDetails || 'Plumber Tool'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dispatch / Delivery Note *
                  </label>
                  <input
                    type="text"
                    value={dispatchNote}
                    onChange={(e) => setDispatchNote(e.target.value)}
                    placeholder="e.g. Handed over at counter / Courier docket #92819"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Reject Reason Input */}
            {processAction === 'reject' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason for Rejection *
                  </label>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. UPI ID is invalid / Minimum points threshold not met / KYC documents incomplete."
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    The plumber will be notified with this reason. Points will not be deducted.
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null)
                  setProcessAction(null)
                }}
                disabled={processing}
                className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              {processAction === 'reject' ? (
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={processing}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  {processing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={processing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  {processing ? 'Processing...' : 'Approve & Complete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CATALOGUE ITEM */}
      {showCatalogueModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCatalogueItem}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingItem ? 'Edit Reward Item' : 'Add New Reward Item'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCatalogueModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Item Name *</label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Heavy Duty Pipe Wrench 14 inch"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={catCategory}
                  onChange={(e) => setCatCategory(e.target.value as 'tool' | 'voucher')}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="tool">Plumber Tool</option>
                  <option value="voucher">Digital Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stock Status</label>
                <div className="flex items-center h-10 gap-2">
                  <input
                    type="checkbox"
                    id="catInStock"
                    checked={catInStock}
                    onChange={(e) => setCatInStock(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="catInStock" className="text-xs font-medium text-slate-700">
                    Available in Stock
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Points Cost *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={catPoints}
                  onChange={(e) => setCatPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rupee Value (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={catRupees}
                  onChange={(e) => setCatRupees(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Image URL (Optional)</label>
              <input
                type="url"
                value={catImageUrl}
                onChange={(e) => setCatImageUrl(e.target.value)}
                placeholder="https://... (or leave blank for icon)"
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Specifications, size, brand or usage guidelines..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowCatalogueModal(false)}
                className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCatalogue}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold"
              >
                {savingCatalogue ? 'Saving...' : editingItem ? 'Update Reward' : 'Add Reward'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
