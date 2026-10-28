import React, { useState, useEffect } from 'react'
import { collection, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { READY_MADE_WHATSAPP_TEMPLATES, seedWhatsAppTemplates, WhatsAppTemplateDefinition } from '../lib/whatsappTemplates'
import {
  MessageSquare,
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Send,
  Sparkles,
  Info
} from 'lucide-react'

interface MessageQueueItem {
  id: string
  plumberId: string
  event: string
  channel: 'push' | 'whatsapp'
  templateId?: string
  title?: string
  body?: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'held_feature_disabled'
  variables?: Record<string, any>
  attempts: number
  createdAt: string
}

export const MessageLogPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'templates'>('queue')
  const [messages, setMessages] = useState<MessageQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [channelFilter, setChannelFilter] = useState<'all' | 'push' | 'whatsapp'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'held' | 'queued' | 'delivered'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [seedingTemplates, setSeedingTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateDefinition | null>(null)

  const loadMessages = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'messageQueue'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      const list: MessageQueueItem[] = []
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as MessageQueueItem)
      })
      setMessages(list)
    } catch (err) {
      console.error('Error loading message queue:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [])

  const handleSeedTemplates = async () => {
    setSeedingTemplates(true)
    try {
      await seedWhatsAppTemplates()
      alert('Official Meta WhatsApp English & Hindi templates seeded successfully!')
    } catch (err: any) {
      alert('Error seeding templates: ' + err.message)
    } finally {
      setSeedingTemplates(false)
    }
  }

  const filteredMessages = messages.filter(m => {
    if (channelFilter !== 'all' && m.channel !== channelFilter) return false
    if (statusFilter === 'held' && m.status !== 'held_feature_disabled') return false
    if (statusFilter === 'queued' && m.status !== 'queued') return false
    if (statusFilter === 'delivered' && m.status !== 'delivered' && m.status !== 'sent') return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchEvent = m.event.toLowerCase().includes(q)
      const matchTemplate = m.templateId?.toLowerCase().includes(q) || false
      const matchBody = m.body?.toLowerCase().includes(q) || false
      return matchEvent || matchTemplate || matchBody
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="text-emerald-600" />
              Notification & WhatsApp Pipeline Monitor
            </h1>
            <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              WhatsApp Auto: Coming Soon
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Channel-agnostic notification dispatch queue. WhatsApp messages are prepared and safely held until Meta Cloud API is enabled.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition ${
              activeTab === 'queue'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={16} />
            Message Queue ({messages.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition ${
              activeTab === 'templates'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles size={16} />
            WhatsApp Templates ({READY_MADE_WHATSAPP_TEMPLATES.length})
          </button>
        </div>
      </div>

      {/* Feature Flag Notice Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500 text-slate-950 text-xs px-2 py-0.5 rounded font-extrabold uppercase">
              Free Spark Plan Active
            </span>
            <span className="text-xs text-slate-300">Undeployed Stubs Ready in backend</span>
          </div>
          <p className="font-bold text-sm text-white flex items-center gap-1.5">
            <Info size={16} className="text-amber-400 shrink-0" />
            Direct 1-Click WhatsApp Chat (wa.me) is active and 100% free!
          </p>
          <p className="text-xs text-slate-300 max-w-2xl">
            Automated WhatsApp notifications are built with a provider-isolated Meta Cloud API interface in <code className="bg-white/10 px-1 py-0.5 rounded font-mono">functions/</code>. Going live later requires only adding Meta credentials and upgrading to Firebase Blaze.
          </p>
        </div>

        <button
          onClick={handleSeedTemplates}
          disabled={seedingTemplates}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition whitespace-nowrap"
        >
          <Sparkles size={16} />
          {seedingTemplates ? 'Seeding...' : 'Seed Meta Templates to Firestore'}
        </button>
      </div>

      {/* TAB 1: MESSAGE QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setChannelFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  channelFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Channels
              </button>
              <button
                onClick={() => setChannelFilter('whatsapp')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  channelFilter === 'whatsapp'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <MessageSquare size={13} /> WhatsApp
              </button>
              <button
                onClick={() => setChannelFilter('push')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  channelFilter === 'push'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                <Bell size={13} /> Push (FCM)
              </button>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search event, template, text..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Queue Items List */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <RefreshCw className="animate-spin mx-auto mb-2 text-emerald-600" size={24} />
              Loading notification queue...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
              <Send className="mx-auto text-slate-300 mb-2" size={40} />
              <p className="text-slate-600 font-medium">Message queue is empty</p>
              <p className="text-xs text-slate-400 mt-1">
                When points are added or redemptions approved, queued messages will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition space-y-2"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {msg.channel === 'whatsapp' ? (
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <MessageSquare size={12} /> WhatsApp
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Bell size={12} /> Push Notification
                        </span>
                      )}

                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {msg.event}
                      </span>

                      {/* Status Badge */}
                      {msg.status === 'held_feature_disabled' && (
                        <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Clock size={12} /> Held (Feature Flag Disabled)
                        </span>
                      )}
                      {msg.status === 'queued' && (
                        <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Clock size={12} /> Queued for dispatch
                        </span>
                      )}
                      {msg.status === 'delivered' && (
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} /> Delivered
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-400">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Body / Variables Preview */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700">
                    {msg.title && <p className="font-bold text-slate-800 mb-0.5">{msg.title}</p>}
                    <p className="text-slate-600">{msg.body || `Template ID: ${msg.templateId || 'wa_' + msg.event}`}</p>
                    {msg.variables && Object.keys(msg.variables).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 font-mono text-[11px] text-slate-500">
                        Variables: {JSON.stringify(msg.variables)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WHATSAPP TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Official Meta Cloud API Template Definitions</h3>
              <p className="text-xs text-slate-500">
                These templates are ready to copy directly into Meta WhatsApp Business Manager when going live.
              </p>
            </div>
            <button
              onClick={handleSeedTemplates}
              disabled={seedingTemplates}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
            >
              {seedingTemplates ? 'Saving...' : 'Sync Templates'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {READY_MADE_WHATSAPP_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                      {tmpl.category}
                    </span>
                  </div>

                  {/* English Version */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                    <p className="font-bold text-slate-700">English (en):</p>
                    <p className="text-slate-600 leading-relaxed font-sans">{tmpl.languages.en.body}</p>
                    <p className="text-[10px] text-slate-400">Footer: {tmpl.languages.en.footer}</p>
                  </div>

                  {/* Hindi Version */}
                  <div className="mt-2 p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/60 text-xs space-y-1">
                    <p className="font-bold text-emerald-900">हिंदी (hi):</p>
                    <p className="text-slate-700 leading-relaxed font-sans">{tmpl.languages.hi.body}</p>
                    <p className="text-[10px] text-slate-500">Footer: {tmpl.languages.hi.footer}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Status: Ready for Meta Submission</span>
                  <span className="text-emerald-600 font-semibold">2 Languages (EN + HI)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
