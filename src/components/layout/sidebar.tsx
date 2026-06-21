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
  ChevronRight,
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import type { Profile } from '@/types'
import { ROLE_LABEL } from '@/lib/utils'

const navItems = [
  { href: '/painel', label: 'Painel', icon: LayoutDashboard },
  { href: '/acolhimento', label: 'Fila de Acolhimento', icon: ChevronRight },
  { href: '/discipulandos', label: 'Discipulandos', icon: Users },
  { href: '/turmas', label: 'Turmas', icon: BookOpen },
  { href: '/confraternizacao', label: 'Confraternização', icon: CalendarDays },
  { href: '/pos-discipulado', label: 'Pós-Discipulado', icon: Star },
  { href: '/admin', label: 'Administração', icon: Settings },
]

interface SidebarProps {
  profile: Profile
  congregationName?: string
}

export function Sidebar({ profile, congregationName }: SidebarProps) {
  const pathname = usePathname()

  const canAccessAdmin = ['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO'].includes(profile.role)
  const visibleItems = navItems.filter(
    item => item.href !== '/admin' || canAccessAdmin
  )

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">Discipulado</p>
          {congregationName && (
            <p className="truncate text-xs text-gray-500">{congregationName}</p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/painel' && pathname.startsWith(href))
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="mb-2">
          <p className="truncate text-sm font-medium text-gray-900">{profile.name}</p>
          <p className="truncate text-xs text-gray-500">{ROLE_LABEL[profile.role]}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
