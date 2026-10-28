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
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import type { PointRule, Category, Brand, RuleCalculationType, GeneralSettings } from '../types'
import { defaultGeneralSettings } from '../lib/seed'
import { evaluateLine } from '../lib/pointCalculator'
import {
  Calculator,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Layers,
  Tag,
  Play,
  ArrowUpDown,
  Search,
  AlertTriangle,
  Lock
} from 'lucide-react'

export const PointsRules: React.FC = () => {
  const { isOwner, currentUser, adminProfile } = useAuth()
  const [rules, setRules] = useState<PointRule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [settings, setSettings] = useState<GeneralSettings>(defaultGeneralSettings)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'rules' | 'categories' | 'brands' | 'tester'>('rules')

  // Rule Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formBrand, setFormBrand] = useState('')
  const [formCalcType, setFormCalcType] = useState<RuleCalculationType>('PERCENT_OF_AMOUNT')
  const [formRate, setFormRate] = useState<number>(2.0)
  const [formMinAmount, setFormMinAmount] = useState<number>(0)
  const [formMaxCap, setFormMaxCap] = useState<number>(0)
  const [formValidFrom, setFormValidFrom] = useState('')
  const [formValidTo, setFormValidTo] = useState('')
  const [formSortOrder, setFormSortOrder] = useState<number>(1)
  const [formIsActive, setFormIsActive] = useState(true)

  // Quick Category/Brand creation
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newBrandName, setNewBrandName] = useState('')

  // Rule Tester State
  const [testCategory, setTestCategory] = useState('')
  const [testBrand, setTestBrand] = useState('')
  const [testQuantityOrAmount, setTestQuantityOrAmount] = useState<number>(1000)

  const loadData = async () => {
    try {
      setLoading(true)
      // Load rules
      const rulesSnap = await getDocs(collection(db, 'pointRules'))
      const loadedRules: PointRule[] = []
      rulesSnap.forEach(d => loadedRules.push({ ...d.data(), id: d.id } as PointRule))
      loadedRules.sort((a, b) => a.sortOrder - b.sortOrder)
      setRules(loadedRules)

      // Load categories
      const catsSnap = await getDocs(collection(db, 'categories'))
      const loadedCats: Category[] = []
      catsSnap.forEach(d => loadedCats.push({ ...d.data(), id: d.id } as Category))
      setCategories(loadedCats)

      // Load brands
      const brandsSnap = await getDocs(collection(db, 'brands'))
      const loadedBrands: Brand[] = []
      brandsSnap.forEach(d => loadedBrands.push({ ...d.data(), id: d.id } as Brand))
      setBrands(loadedBrands)

      if (loadedCats.length > 0 && !testCategory) {
        setTestCategory(loadedCats[0].name)
      }
    } catch (err) {
      console.error('Error loading rules data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const logAudit = async (action: string, entityId: string, oldValue: any, newValue: any) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        adminId: currentUser?.uid || '',
        adminEmail: currentUser?.email || adminProfile?.email || 'admin',
        action,
        entity: 'pointRule',
        entityId,
        oldValue,
        newValue,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.warn('Audit log write error:', e)
    }
  }

  const openCreateModal = () => {
    setEditingRuleId(null)
    setFormName('')
    setFormCategory(categories[0]?.name || '')
    setFormBrand('')
    setFormCalcType('PERCENT_OF_AMOUNT')
    setFormRate(2.0)
    setFormMinAmount(0)
    setFormMaxCap(0)
    setFormValidFrom('')
    setFormValidTo('')
    setFormSortOrder(rules.length + 1)
    setFormIsActive(true)
    setIsModalOpen(true)
  }

  const openEditModal = (rule: PointRule) => {
    setEditingRuleId(rule.id)
    setFormName(rule.name)
    setFormCategory(rule.category)
    setFormBrand(rule.brand || '')
    setFormCalcType(rule.calculationType)
    setFormRate(rule.rate)
    setFormMinAmount(rule.minPurchaseAmount || 0)
    setFormMaxCap(rule.maxPointsPerLine || 0)
    setFormValidFrom(rule.validFrom || '')
    setFormValidTo(rule.validTo || '')
    setFormSortOrder(rule.sortOrder)
    setFormIsActive(rule.isActive)
    setIsModalOpen(true)
  }

  const duplicateRule = async (rule: PointRule) => {
    if (!isOwner) return
    const newId = `${rule.id}-copy-${Date.now().toString().slice(-4)}`
    const duplicated: PointRule = {
      ...rule,
      id: newId,
      name: `${rule.name} (Copy)`,
      sortOrder: rules.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await setDoc(doc(db, 'pointRules', newId), duplicated)
    await logAudit('DUPLICATE_RULE', newId, null, duplicated)
    await loadData()
  }

  const toggleRuleActive = async (rule: PointRule) => {
    if (!isOwner) return
    const newState = !rule.isActive
    await updateDoc(doc(db, 'pointRules', rule.id), {
      isActive: newState,
      updatedAt: new Date().toISOString()
    })
    await logAudit('TOGGLE_ACTIVE', rule.id, { isActive: rule.isActive }, { isActive: newState })
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: newState } : r))
  }

  const handleDeleteRule = async (rule: PointRule) => {
    if (!isOwner) return
    if (!window.confirm(`Delete rule "${rule.name}"? This action is permanent.`)) return
    await deleteDoc(doc(db, 'pointRules', rule.id))
    await logAudit('DELETE_RULE', rule.id, rule, null)
    setRules(prev => prev.filter(r => r.id !== rule.id))
  }

  const saveRuleForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner) return

    const ruleId = editingRuleId || formName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4)
    const ruleData: PointRule = {
      id: ruleId,
      name: formName.trim(),
      category: formCategory,
      brand: formBrand.trim(),
      calculationType: formCalcType,
      rate: Number(formRate),
      minPurchaseAmount: Number(formMinAmount) || 0,
      maxPointsPerLine: Number(formMaxCap) || 0,
      validFrom: formValidFrom || undefined,
      validTo: formValidTo || undefined,
      sortOrder: Number(formSortOrder) || 1,
      isActive: formIsActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const oldRule = rules.find(r => r.id === ruleId) || null
    await setDoc(doc(db, 'pointRules', ruleId), ruleData, { merge: true })
    await logAudit(editingRuleId ? 'UPDATE_RULE' : 'CREATE_RULE', ruleId, oldRule, ruleData)

    setIsModalOpen(false)
    await loadData()
  }

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner || !newCategoryName.trim()) return
    const catId = newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const newCat = { id: catId, name: newCategoryName.trim(), createdAt: new Date().toISOString() }
    await setDoc(doc(db, 'categories', catId), newCat)
    setNewCategoryName('')
    await loadData()
  }

  const deleteCategory = async (cat: Category) => {
    if (!isOwner) return
    if (!window.confirm(`Delete category "${cat.name}"?`)) return
    await deleteDoc(doc(db, 'categories', cat.id))
    setCategories(prev => prev.filter(c => c.id !== cat.id))
  }

  const addBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner || !newBrandName.trim()) return
    const brandId = newBrandName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const newBrand = { id: brandId, name: newBrandName.trim(), createdAt: new Date().toISOString() }
    await setDoc(doc(db, 'brands', brandId), newBrand)
    setNewBrandName('')
    await loadData()
  }

  const deleteBrand = async (b: Brand) => {
    if (!isOwner) return
    if (!window.confirm(`Delete brand "${b.name}"?`)) return
    await deleteDoc(doc(db, 'brands', b.id))
    setBrands(prev => prev.filter(brand => brand.id !== b.id))
  }

  // Live evaluation for Rule Tester
  const testEvaluated = evaluateLine(
    {
      id: 'test',
      category: testCategory,
      brand: testBrand,
      quantityOrAmount: testQuantityOrAmount
    },
    rules,
    settings
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Points Rules Manager</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Category &amp; Brand-wise earning rules, automatic matching, and live rule tester
          </p>
        </div>
        {isOwner && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Rule</span>
          </button>
        )}
      </div>

      {!isOwner && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Staff account mode: You can view and test rules, but only the Store Owner can create, edit, or delete rules.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'rules'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Rules Table ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tester')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'tester'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Play className="w-4 h-4 text-emerald-600" />
          <span>Rule Tester (Interactive)</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'categories'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('brands')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'brands'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Brands ({brands.length})</span>
        </button>
      </div>

      {/* TAB 1: RULES TABLE */}
      {activeTab === 'rules' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Priority order: Category + Brand match &gt; Category match &gt; Default earn rule ({settings.defaultEarnPercent}%)</span>
            <span>Rules are evaluated in sort order</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Rule Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Calculation Type</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Min / Cap</th>
                  <th className="px-4 py-3">Status</th>
                  {isOwner && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No point rules created yet. Click "Add New Rule" or seed default rules from Dashboard.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        #{rule.sortOrder}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {rule.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {rule.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {rule.brand ? (
                          <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                            {rule.brand}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Any Brand</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {rule.calculationType === 'PER_LITRE' && 'Per Litre (₹/L)'}
                        {rule.calculationType === 'PERCENT_OF_AMOUNT' && '% of Amount'}
                        {rule.calculationType === 'FIXED_PER_UNIT' && 'Per Unit (₹/pc)'}
                        {rule.calculationType === 'FIXED_POINTS' && 'Fixed Points'}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {rule.calculationType === 'PERCENT_OF_AMOUNT' ? `${rule.rate}%` : `₹${rule.rate}`}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {rule.minPurchaseAmount ? `Min: ₹${rule.minPurchaseAmount}` : '-'}
                        {rule.maxPointsPerLine ? ` | Cap: ${rule.maxPointsPerLine} pts` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRuleActive(rule)}
                          disabled={!isOwner}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            rule.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {rule.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(rule)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => duplicateRule(rule)}
                            title="Duplicate Rule"
                            className="text-slate-400 hover:text-slate-700"
                          >
                            <Copy className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule)}
                            title="Delete Rule"
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RULE TESTER */}
      {activeTab === 'tester' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-600" />
              Live Rule Calculator Tester
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select category, brand, and quantity/amount to test which rule gets picked and view the exact mathematical calculation before saving.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Category
                </label>
                <select
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Brand (Optional)
                </label>
                <select
                  value={testBrand}
                  onChange={(e) => setTestBrand(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Any Brand (No specific brand)</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Amount (₹) or Litres / Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={testQuantityOrAmount}
                  onChange={(e) => setTestQuantityOrAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Tester Live Result Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
                <span className="text-slate-400 uppercase font-semibold">Evaluation Result</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${testEvaluated.isFallback ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {testEvaluated.isFallback ? 'Fallback Rule' : 'Specific Match'}
                </span>
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-400">Matched Rule</div>
                <div className="text-lg font-bold text-white mt-0.5">{testEvaluated.matchedRuleName}</div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-slate-800/80 border border-slate-700 font-mono text-sm space-y-2">
                <div className="text-slate-300">
                  Calculation: <span className="text-emerald-400 font-semibold">{testEvaluated.calculationText}</span>
                </div>
                <div className="text-slate-400 text-xs">
                  Rate applied: {testEvaluated.rate} ({testEvaluated.calculationType})
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-700/80 mt-6 flex items-baseline justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase">Points Earned</div>
                <div className="text-3xl font-black text-emerald-400">{testEvaluated.resultPoints} <span className="text-sm font-normal text-slate-300">pts</span></div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase">Rupee Value</div>
                <div className="text-xl font-bold text-slate-200">₹{testEvaluated.resultRupees.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORIES MANAGER */}
      {activeTab === 'categories' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl">
          <h3 className="text-base font-bold text-slate-900 mb-4">Plumbing Material Categories</h3>
          {isOwner && (
            <form onSubmit={addCategory} className="flex gap-2 mb-6">
              <input
                type="text"
                required
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New Category Name (e.g. SWR Drainage)"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm"
              >
                + Add Category
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {categories.map((cat) => (
              <div key={cat.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                <span className="font-medium text-sm text-slate-800">{cat.name}</span>
                {isOwner && (
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BRANDS MANAGER */}
      {activeTab === 'brands' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl">
          <h3 className="text-base font-bold text-slate-900 mb-4">Supported Brands</h3>
          {isOwner && (
            <form onSubmit={addBrand} className="flex gap-2 mb-6">
              <input
                type="text"
                required
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="New Brand Name (e.g. Finolex)"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm"
              >
                + Add Brand
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {brands.map((b) => (
              <div key={b.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                <span className="font-medium text-sm text-slate-800">{b.name}</span>
                {isOwner && (
                  <button
                    onClick={() => deleteBrand(b)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {editingRuleId ? 'Edit Point Rule' : 'Create Point Rule'}
            </h2>

            <form onSubmit={saveRuleForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Water Tanks Per Litre, Ashirvad CPVC Special"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Brand (Blank = Any)
                  </label>
                  <select
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Any Brand</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Calculation Type *
                </label>
                <select
                  value={formCalcType}
                  onChange={(e) => setFormCalcType(e.target.value as RuleCalculationType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="PERCENT_OF_AMOUNT">PERCENT_OF_AMOUNT (% of purchase amount)</option>
                  <option value="PER_LITRE">PER_LITRE (Rupees per litre, for tanks)</option>
                  <option value="FIXED_PER_UNIT">FIXED_PER_UNIT (Rupees per piece/unit)</option>
                  <option value="FIXED_POINTS">FIXED_POINTS (Flat points per line)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Rate ({formCalcType === 'PERCENT_OF_AMOUNT' ? '%' : '₹ or Pts'}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formRate}
                    onChange={(e) => setFormRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Sort Order (Lower = higher priority)
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Min Purchase Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formMinAmount}
                    onChange={(e) => setFormMinAmount(Number(e.target.value))}
                    placeholder="0 = none"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Max Points Cap
                  </label>
                  <input
                    type="number"
                    value={formMaxCap}
                    onChange={(e) => setFormMaxCap(Number(e.target.value))}
                    placeholder="0 = no cap"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="ruleActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="ruleActive" className="text-sm font-medium text-slate-700">
                  Rule is Active &amp; Ready for Use
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
