'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarDays,
  Star,
  Settings,
  LogOut,
  Heart,
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import type { Profile } from '@/types'
import { ROLE_LABEL } from '@/lib/utils'

const navItems = [
  { href: '/painel', label: 'Painel', icon: LayoutDashboard, color: 'text-indigo-400' },
  { href: '/discipulandos', label: 'Acolhimento', icon: Users, color: 'text-sky-400' },
  { href: '/acolhimento', label: 'Jornada', icon: Heart, color: 'text-rose-400' },
  { href: '/confraternizacao', label: 'Boas Vindas', icon: CalendarDays, color: 'text-amber-400' },
  { href: '/turmas', label: 'Turmas', icon: BookOpen, color: 'text-emerald-400' },
  { href: '/pos-discipulado', label: 'Integração', icon: Star, color: 'text-violet-400' },
  { href: '/admin', label: 'Administração', icon: Settings, color: 'text-slate-400' },
]

interface SidebarProps {
  profile: Profile
  congregationName?: string
  theme?: {
    logoUrl?:      string | null
    accentColor?:  string
    sidebarColor?: string
  }
}

export function Sidebar({ profile, congregationName, theme }: SidebarProps) {
  const pathname = usePathname()

  const accent  = theme?.accentColor  ?? '#4F46E5'
  const sidebarBg = theme?.sidebarColor ?? '#0F172A'

  const canAccessAdmin = ['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO'].includes(profile.role)
  const visibleItems = navItems.filter(
    item => item.href !== '/admin' || canAccessAdmin
  )

  return (
    <aside
      className="flex h-screen w-64 flex-col"
      style={{ '--sb-accent': accent, background: sidebarBg } as React.CSSProperties}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-lg"
          style={{ background: accent }}
        >
          {theme?.logoUrl
            ? <img src={theme.logoUrl} alt="Logo" className="h-full w-full object-cover" />
            : (
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )
          }
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white tracking-wide">Discipulado</p>
          {congregationName && (
            <p className="truncate text-xs text-slate-400">{congregationName}</p>
          )}
        </div>
      </div>

      <div className="mx-4 mb-3 h-px bg-slate-800" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        <ul className="flex flex-col gap-0.5">
          {visibleItems.map(({ href, label, icon: Icon, color }) => {
            const active = pathname === href || (href !== '/painel' && pathname.startsWith(href))
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  )}
                >
                  <Icon className={cn('h-4.5 w-4.5 shrink-0', active ? 'text-white' : color)} size={18} />
                  {label}
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="mx-4 mb-1 h-px bg-slate-800" />
      <div className="px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: accent }}>
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{profile.name}</p>
            <p className="truncate text-xs text-slate-400">{ROLE_LABEL[profile.role]}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair da conta
          </button>
        </form>
      </div>
    </aside>
  )
}
