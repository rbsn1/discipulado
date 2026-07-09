'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Menu } from 'lucide-react'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  congregationName?: string
  theme?: {
    logoUrl?:      string | null
    accentColor?:  string
    sidebarColor?: string
  }
  children: React.ReactNode
}

export function DashboardShell({ profile, congregationName, theme, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const accent = theme?.accentColor ?? '#4F46E5'

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar
        profile={profile}
        congregationName={congregationName}
        theme={theme}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Área de conteúdo */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Header mobile ──────────────────────────────────────────── */}
        <header
          className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 md:hidden"
          aria-label="Cabeçalho mobile"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Abrir menu"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo / nome no header mobile */}
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden shadow"
            style={{ background: accent }}
          >
            {theme?.logoUrl
              ? <img src={theme.logoUrl} alt="Logo" className="h-full w-full object-cover" />
              : (
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )
            }
          </div>
          <span className="text-sm font-semibold text-gray-900 truncate">
            {congregationName ?? 'Discipulado'}
          </span>
        </header>

        {/* ── Conteúdo principal ──────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
