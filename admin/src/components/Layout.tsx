import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Users,
  PlusCircle,
  Calculator,
  Gift,
  Award,
  Settings,
  Menu,
  X,
  ShieldCheck,
  ToggleLeft,
  MessageSquare,
  LogOut,
  UserCheck
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { currentUser, adminProfile, signOut } = useAuth()

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Award },
    { name: 'Plumbers & KYC', path: '/plumbers', icon: Users },
    { name: 'Add Points', path: '/add-points', icon: PlusCircle },
    { name: 'Points Rules', path: '/rules', icon: Calculator },
    { name: 'Redemptions', path: '/redemptions', icon: Gift },
    { name: 'Schemes & Promos', path: '/schemes', icon: ShieldCheck },
    { name: 'Message Queue', path: '/messages', icon: MessageSquare },
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'Feature Controls', path: '/features', icon: ToggleLeft },
  ]

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100">
      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-900">
            SA
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">Shiv Agency</div>
            <div className="text-[10px] text-emerald-400 font-medium">Karauli, Rajasthan</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentUser && (
            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar for Desktop & Mobile drawer */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col justify-between p-4 z-40 transition-all`}
      >
        <div>
          {/* Brand header */}
          <div className="hidden md:flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-slate-900 text-lg shadow-md">
              SA
            </div>
            <div>
              <div className="font-bold text-white text-base tracking-tight leading-none">Shiv Agency</div>
              <div className="text-xs text-emerald-400 font-medium mt-1">Loyalty Rewards Admin</div>
            </div>
          </div>

          {/* User profile pill */}
          {currentUser && (
            <div className="mb-4 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200 truncate">{adminProfile?.displayName || currentUser.email}</div>
                  <div className="text-[10px] text-emerald-400 capitalize">{adminProfile?.role || 'Owner'}</div>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                title="Log Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path)
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer info in sidebar */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-slate-500 px-2 space-y-1">
          <div className="font-medium text-slate-400">Shiv Agency, Karauli</div>
          <div>Role: {adminProfile?.role === 'owner' ? 'Store Owner (Full Access)' : 'Staff (Add Points & View)'}</div>
          <div className="text-[11px] text-emerald-400 pt-1">Phase 2: Auth &amp; Plumber KYC Active</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
