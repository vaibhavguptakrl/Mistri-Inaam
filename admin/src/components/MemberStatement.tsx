import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Plumber, Transaction } from '../types'
import { Download, Mail, MessageCircle, Printer, RotateCcw, FileText } from 'lucide-react'

interface MemberStatementProps {
  plumber: Plumber
  onClose?: () => void
}

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const parsed = value.toDate()
    return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null
  }
  return null
}

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
const safeName = (name: string) => name.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'member'
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)

export const MemberStatement: React.FC<MemberStatementProps> = ({ plumber, onClose }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDateValue, setToDateValue] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const snapshot = await getDocs(query(collection(db, 'transactions'), where('plumberId', '==', plumber.id)))
        const rows = snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Transaction))
        rows.sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
        if (active) setTransactions(rows)
      } catch (loadError) {
        console.error('Could not load member statement:', loadError)
        if (active) setError('Could not load this member’s statement. Check your admin access and try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [plumber.id])

  const filtered = useMemo(() => transactions.filter((transaction) => {
    const date = toDate(transaction.createdAt)
    if (!date) return !fromDate && !toDateValue
    if (fromDate) {
      const start = new Date(`${fromDate}T00:00:00`).getTime()
      if (date.getTime() < start) return false
    }
    if (toDateValue) {
      const end = new Date(`${toDateValue}T23:59:59.999`).getTime()
      if (date.getTime() > end) return false
    }
    return true
  }), [transactions, fromDate, toDateValue])

  const chronological = useMemo(() => [...filtered].sort((a, b) => (toDate(a.createdAt)?.getTime() || 0) - (toDate(b.createdAt)?.getTime() || 0)), [filtered])
  const totalPoints = filtered.reduce((sum, item) => sum + Number(item.points || 0), 0)
  const totalRupees = filtered.reduce((sum, item) => sum + Number(item.rupeeValue || 0), 0)
  const periodLabel = fromDate || toDateValue
    ? `${fromDate || 'Beginning'} to ${toDateValue || 'Today'}`
    : 'All available dates'
  const openingBalance = chronological.length ? Number(chronological[0].previousBalance || 0) : 0
  const closingBalance = chronological.length ? Number(chronological[chronological.length - 1].newBalance || 0) : Number(plumber.pointsBalance || 0)

  const csvContent = () => {
    const rows = [
      ['Member', plumber.name],
      ['Member code', plumber.plumberCode],
      ['Mobile', plumber.phone],
      ['Period', periodLabel],
      ['Opening balance', openingBalance],
      ['Closing balance', closingBalance],
      [],
      ['Date', 'Transaction', 'Bill number', 'Bill amount (INR)', 'Points change', 'Balance after', 'Details'],
      ...chronological.map((item) => [
        toDate(item.createdAt)?.toLocaleString('en-IN') || '', item.type.replace(/_/g, ' '), item.billNumber || '',
        item.billAmount ?? '', Number(item.points || 0), item.newBalance ?? '', item.calculationSummary || item.remarks || '',
      ]),
      [],
      ['Period points change', totalPoints],
      ['Transaction count', filtered.length],
    ]
    return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  }

  const downloadCsv = () => {
    const blob = new Blob(['\ufeff', csvContent()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `statement-${safeName(plumber.name)}-${fromDate || 'all'}-${toDateValue || 'today'}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const printStatement = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=750')
    if (!printWindow) {
      window.alert('Allow pop-ups for this admin site to print or save a PDF statement.')
      return
    }
    const bodyRows = chronological.map((item) => `<tr>
      <td>${escapeHtml(toDate(item.createdAt)?.toLocaleDateString('en-IN') || '')}</td>
      <td>${escapeHtml(item.type.replace(/_/g, ' '))}</td>
      <td>${escapeHtml(item.billNumber || '—')}</td>
      <td class="number">${Number(item.points || 0) > 0 ? '+' : ''}${Number(item.points || 0).toLocaleString('en-IN')}</td>
      <td class="number">${escapeHtml(item.newBalance ?? '—')}</td>
      <td>${escapeHtml(item.calculationSummary || item.remarks || '')}</td>
    </tr>`).join('')
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Points statement - ${escapeHtml(plumber.name)}</title>
      <style>body{font:14px Arial,sans-serif;color:#172033;margin:32px}h1{margin:0 0 6px;color:#0b2852}p{margin:4px 0}.meta{margin:22px 0;padding:14px;background:#f2f6fb;border-radius:8px}.summary{display:flex;gap:32px;margin:18px 0}.summary strong{font-size:18px;color:#087443}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #d7dee8;padding:8px;text-align:left;vertical-align:top}th{background:#edf2f8}.number{text-align:right;white-space:nowrap}.foot{margin-top:24px;color:#64748b;font-size:11px}@media print{body{margin:12mm}}</style></head><body>
      <h1>Shiv Agency Rewards</h1><p>Member points statement</p><div class="meta"><b>${escapeHtml(plumber.name)}</b> · ${escapeHtml(plumber.plumberCode)}<br>Mobile: ${escapeHtml(plumber.phone)}<br>Period: ${escapeHtml(periodLabel)}</div>
      <div class="summary"><div>Opening balance<br><strong>${openingBalance.toLocaleString('en-IN')} pts</strong></div><div>Period change<br><strong>${totalPoints > 0 ? '+' : ''}${totalPoints.toLocaleString('en-IN')} pts</strong></div><div>Closing balance<br><strong>${closingBalance.toLocaleString('en-IN')} pts</strong></div></div>
      <table><thead><tr><th>Date</th><th>Transaction</th><th>Bill #</th><th>Points change</th><th>Balance</th><th>Details</th></tr></thead><tbody>${bodyRows || '<tr><td colspan="6">No transactions in this period.</td></tr>'}</tbody></table>
      <p class="foot">Generated ${escapeHtml(new Date().toLocaleString('en-IN'))} · ${filtered.length} transactions</p><script>window.onload=()=>window.print()</script></body></html>`)
    printWindow.document.close()
  }

  const buildShareMessage = () => {
    const lines = chronological.slice(-30).map((item) => {
      const date = toDate(item.createdAt)?.toLocaleDateString('en-IN') || '—'
      const points = Number(item.points || 0)
      return `${date} | ${item.type.replace(/_/g, ' ')} | ${points > 0 ? '+' : ''}${points.toLocaleString('en-IN')} pts | balance ${Number(item.newBalance || 0).toLocaleString('en-IN')}`
    })
    const omitted = Math.max(0, filtered.length - lines.length)
    return [
      'Shiv Agency Rewards — Member Points Statement',
      `Member: ${plumber.name} (${plumber.plumberCode})`,
      `Mobile: ${plumber.phone}`,
      `Period: ${periodLabel}`,
      `Transactions: ${filtered.length} · Opening balance: ${openingBalance.toLocaleString('en-IN')} pts · Closing balance: ${closingBalance.toLocaleString('en-IN')} pts`,
      `Points change in period: ${totalPoints > 0 ? '+' : ''}${totalPoints.toLocaleString('en-IN')} pts`,
      '',
      ...lines,
      ...(omitted ? ['', `${omitted} earlier row(s) are in the downloaded full CSV statement.`] : []),
      '',
      'The full statement CSV has been downloaded for attachment.',
    ].join('\n')
  }

  const shareEmail = () => {
    if (!plumber.email) {
      window.alert('This member does not have an email address on file.')
      return
    }
    downloadCsv()
    const subject = `Points statement - ${plumber.name} (${periodLabel})`
    window.location.href = `mailto:${encodeURIComponent(plumber.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildShareMessage())}`
  }

  const shareWhatsApp = () => {
    const digits = String(plumber.whatsappNumber || plumber.phone).replace(/\D/g, '')
    const number = digits.startsWith('91') ? digits : `91${digits.slice(-10)}`
    downloadCsv()
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(buildShareMessage())}`, '_blank', 'noopener,noreferrer')
  }

  const resetPeriod = () => { setFromDate(''); setToDateValue('') }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900"><FileText className="h-4 w-4 text-emerald-600" />Member points statement</h3>
          <p className="mt-1 text-xs text-slate-500">{plumber.name} · {plumber.plumberCode} · {filtered.length} transaction(s)</p>
        </div>
        {onClose && <button onClick={onClose} className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Close</button>}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
        <label className="text-xs font-semibold text-slate-600">From<input type="date" value={fromDate} max={toDateValue || undefined} onChange={(event) => setFromDate(event.target.value)} className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-800" /></label>
        <label className="text-xs font-semibold text-slate-600">To<input type="date" value={toDateValue} min={fromDate || undefined} onChange={(event) => setToDateValue(event.target.value)} className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-800" /></label>
        <button onClick={resetPeriod} disabled={!fromDate && !toDateValue} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" />Reset period</button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={printStatement} disabled={loading} className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Printer className="h-3.5 w-3.5" />Print / Save PDF</button>
          <button onClick={downloadCsv} disabled={loading} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><Download className="h-3.5 w-3.5" />Download CSV</button>
          <button onClick={shareEmail} disabled={loading} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Mail className="h-3.5 w-3.5" />Email</button>
          <button onClick={shareWhatsApp} disabled={loading} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-emerald-50 p-3"><div className="text-[11px] font-semibold uppercase text-emerald-800">Points change</div><div className="mt-1 text-lg font-black text-emerald-700">{totalPoints > 0 ? '+' : ''}{totalPoints.toLocaleString('en-IN')}</div></div>
        <div className="rounded-lg bg-blue-50 p-3"><div className="text-[11px] font-semibold uppercase text-blue-800">Closing balance</div><div className="mt-1 text-lg font-black text-blue-700">{closingBalance.toLocaleString('en-IN')}</div></div>
        <div className="rounded-lg bg-amber-50 p-3"><div className="text-[11px] font-semibold uppercase text-amber-800">Transaction count</div><div className="mt-1 text-lg font-black text-amber-700">{filtered.length}</div></div>
        <div className="rounded-lg bg-slate-50 p-3"><div className="text-[11px] font-semibold uppercase text-slate-600">Statement period</div><div className="mt-1 text-sm font-bold text-slate-800">{periodLabel}</div></div>
      </div>

      {loading ? <div className="p-5 text-center text-sm text-slate-400">Loading statement…</div> : error ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : filtered.length === 0 ? <div className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">No points transactions in this period.</div> : (
        <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-600"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Transaction</th><th className="px-3 py-2">Bill</th><th className="px-3 py-2 text-right">Points change</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{filtered.map((item) => <tr key={item.id} className="bg-white"><td className="px-3 py-2 text-slate-500">{toDate(item.createdAt)?.toLocaleDateString('en-IN') || '—'}</td><td className="px-3 py-2 font-semibold capitalize text-slate-800">{item.type.replace(/_/g, ' ')}</td><td className="px-3 py-2 text-slate-500">{item.billNumber || '—'}</td><td className={`px-3 py-2 text-right font-bold ${Number(item.points || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{Number(item.points || 0) > 0 ? '+' : ''}{Number(item.points || 0).toLocaleString('en-IN')}</td><td className="px-3 py-2 text-right font-semibold text-slate-700">{Number(item.newBalance || 0).toLocaleString('en-IN')}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-400">Email and WhatsApp open a message with the statement summary and download the full CSV so you can attach it.</p>
    </section>
  )
}
