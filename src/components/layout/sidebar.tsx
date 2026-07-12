'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { deriveTheme } from '@/lib/theme'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarDays,
  Star,
  Settings,
  LogOut,
  Heart,
  BarChart2,
  X,
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import type { Profile } from '@/types'
import { ROLE_LABEL } from '@/lib/utils'

const navItems = [
  { href: '/painel',           label: 'Painel',        icon: LayoutDashboard },
  { href: '/discipulandos',    label: 'Acolhimento',   icon: Users           },
  { href: '/acolhimento',      label: 'Jornada',       icon: Heart           },
  { href: '/confraternizacao', label: 'Boas Vindas',   icon: CalendarDays    },
  { href: '/turmas',           label: 'Turmas',        icon: BookOpen        },
  { href: '/pos-discipulado',  label: 'Integração',    icon: Star            },
  { href: '/relatorios',       label: 'Relatórios',    icon: BarChart2,  adminOnly: true },
  { href: '/admin',            label: 'Administração', icon: Settings,   adminOnly: true },
]

interface SidebarProps {
  profile: Profile
  congregationName?: string
  theme?: {
    logoUrl?:      string | null
    accentColor?:  string
    sidebarColor?: string
  }
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ profile, congregationName, theme, open = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const palette  = deriveTheme(theme)

  const canAccessAdmin = ['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO'].includes(profile.role)
  const visibleItems   = navItems.filter(item => !item.adminOnly || canAccessAdmin)

  return (
    <>
      {/* ── Overlay mobile ──────────────────────────────────────────────── */}
      {open && onClose && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── Painel lateral ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex h-full w-64 flex-col',
          'transition-transform duration-200 ease-in-out',
          'md:relative md:translate-x-0 md:z-auto',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          background: `linear-gradient(180deg, ${palette.sidebarDark} 0%, ${palette.sidebarBg} 100%)`,
        }}
        aria-label="Menu de navegação"
      >
        {/* Brilho de topo */}
        <div
          className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: palette.glowColor }}
        />

        {/* Borda direita luminosa */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-px"
          style={{ background: `linear-gradient(180deg, transparent, ${palette.accentRing}, transparent)` }}
        />

        {/* ── Logo ── */}
        <div className="relative flex items-center gap-3 px-5 py-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10"
            style={{ background: `linear-gradient(135deg, ${palette.accentLight}, ${palette.accent})` }}
          >
            {theme?.logoUrl
              ? <img src={theme.logoUrl} alt="Logo" className="h-full w-full object-contain p-1.5" />
              : (
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white tracking-wide">Discipulado</p>
            {congregationName && (
              <p className="truncate text-xs" style={{ color: palette.mutedText }}>
                {congregationName}
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Separador */}
        <div className="mx-4 mb-3 h-px" style={{ background: palette.divider }} />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-1" aria-label="Navegação principal">
          <ul className="flex flex-col gap-0.5">
            {visibleItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/painel' && pathname.startsWith(href))
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
                    style={
                      active
                        ? {
                            background: palette.accentSubtle,
                            color: '#ffffff',
                          }
                        : {
                            color: palette.navInactive,
                          }
                    }
                    onMouseEnter={e => {
                      if (!active) (e.currentTarget as HTMLElement).style.color = palette.navHover
                    }}
                    onMouseLeave={e => {
                      if (!active) (e.currentTarget as HTMLElement).style.color = palette.navInactive
                    }}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon
                      className="h-4.5 w-4.5 shrink-0"
                      size={18}
                      style={{ color: active ? palette.accentLight : 'inherit' }}
                    />
                    {label}
                    {active && (
                      <span
                        className="ml-auto h-1.5 w-1.5 rounded-full"
                        style={{ background: palette.accent }}
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Separador */}
        <div className="mx-4 mb-1 h-px" style={{ background: palette.divider }} />

        {/* ── Footer ── */}
        <div className="px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-white/10"
              style={{ background: palette.accent }}
            >
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{profile.name}</p>
              <p className="truncate text-xs" style={{ color: palette.mutedText }}>
                {ROLE_LABEL[profile.role]}
              </p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair da conta
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
