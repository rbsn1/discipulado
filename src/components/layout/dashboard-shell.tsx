'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Menu } from 'lucide-react'
import { deriveTheme } from '@/lib/theme'
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
  const palette = deriveTheme(theme)

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
          className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden"
          style={{
            background: `linear-gradient(135deg, ${palette.sidebarDark} 0%, ${palette.sidebarBg} 100%)`,
            borderColor: palette.accentRing,
          }}
          aria-label="Cabeçalho mobile"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Abrir menu"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg overflow-hidden shadow ring-1 ring-white/10"
            style={{ background: `linear-gradient(135deg, ${palette.accentLight}, ${palette.accent})` }}
          >
            {theme?.logoUrl
              ? <img src={theme.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
              : (
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )
            }
          </div>
          <span className="text-sm font-semibold text-white truncate">
            {congregationName ?? 'Discipulado'}
          </span>
        </header>

        {/* ── Conteúdo principal ──────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-[#FAFAF8]">
          {children}
        </main>
      </div>
    </div>
  )
}
