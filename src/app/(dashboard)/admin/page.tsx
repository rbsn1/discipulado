import { getCurrentProfile } from '@/lib/repositories/profiles'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, BookOpen, Building2, Church } from 'lucide-react'

export default async function AdminPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!['ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO'].includes(profile.role)) redirect('/painel')

  const items = [
    {
      href: '/admin/congregacoes',
      icon: Building2,
      title: 'Congregações',
      description: 'Gerenciar congregações da plataforma',
      adminOnly: true,
    },
    {
      href: '/admin/usuarios',
      icon: Users,
      title: 'Usuários',
      description: 'Gerenciar usuários e permissões',
      adminOnly: false,
    },
    {
      href: '/admin/modulos',
      icon: BookOpen,
      title: 'Módulos',
      description: 'Configurar catálogo de módulos de discipulado',
      adminOnly: false,
    },
    {
      href: '/admin/cultos',
      icon: Church,
      title: 'Cultos',
      description: 'Configurar catálogo de cultos usado na origem do cadastro',
      adminOnly: false,
    },
  ]

  const visible = items.filter(i => !i.adminOnly || profile.role === 'ADMIN_PLATAFORMA')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Administração</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visible.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="rounded-lg bg-blue-50 p-3">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{title}</p>
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
