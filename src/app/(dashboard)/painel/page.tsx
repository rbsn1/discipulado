import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getDashboardStats } from '@/lib/repositories/cases'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Users,
  UserCheck,
  BookOpen,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
  UserX,
  TrendingDown,
  PhoneOff,
  ChevronRight,
  Settings,
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  href?: string
  accent: string
  iconBg: string
  iconColor: string
}

function StatCard({ title, value, icon: Icon, href, accent, iconBg, iconColor }: StatCardProps) {
  const content = (
    <div className={`group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 md:p-5 shadow-sm transition-all hover:shadow-md ${href ? 'cursor-pointer' : ''}`}>
      <div className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 leading-tight">{title}</p>
          <p className="mt-1.5 text-2xl md:text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4 w-4 md:h-5 md:w-5 ${iconColor}`} />
        </div>
      </div>
      {href && (
        <div className="mt-2 md:mt-3 flex items-center gap-1 text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
          Ver detalhes <ChevronRight className="h-3 w-3" />
        </div>
      )}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

interface AlertCardProps {
  title: string
  count: number
  icon: React.ElementType
  href: string
  description: string
  severity: 'warning' | 'danger'
}

function AlertCard({ title, count, icon: Icon, href, description, severity }: AlertCardProps) {
  if (count === 0) return null
  const isDanger = severity === 'danger'
  return (
    <Link href={href}>
      <div className={`group flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-sm ${
        isDanger
          ? 'border-rose-100 bg-rose-50 hover:border-rose-200'
          : 'border-amber-100 bg-amber-50 hover:border-amber-200'
      }`}>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          isDanger ? 'bg-rose-100' : 'bg-amber-100'
        }`}>
          <Icon className={`h-4.5 w-4.5 ${isDanger ? 'text-rose-600' : 'text-amber-600'}`} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {count} {title}
          </p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isDanger ? 'danger' : 'warning'} dot>
            {count}
          </Badge>
          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
        </div>
      </div>
    </Link>
  )
}

export default async function PainelPage() {
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/login')
  }

  if (profile.role === 'ADMIN_PLATAFORMA' && !profile.congregation_id) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Painel da Plataforma</h1>
          <p className="mt-1 text-sm text-gray-500">Administração global do sistema</p>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-indigo-900">Bem-vindo, Administrador da Plataforma.</p>
              <p className="mt-1 text-sm text-indigo-700">
                Acesse <strong>Admin → Usuários</strong> para criar administradores por congregação.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile.congregation_id) {
    redirect('/login')
  }

  const congregationId = profile.congregation_id
  const [stats] = await Promise.all([getDashboardStats(congregationId)])

  const statCards: StatCardProps[] = [
    {
      title: 'Acolhimento',
      value: stats.acolhimento,
      icon: UserCheck,
      href: '/acolhimento',
      accent: 'bg-indigo-500',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Pend. Matrícula',
      value: stats.pendente_matricula,
      icon: Users,
      href: '/acolhimento?status=PENDENTE_MATRICULA',
      accent: 'bg-amber-500',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Em Discipulado',
      value: stats.em_discipulado,
      icon: BookOpen,
      href: '/acolhimento?status=EM_DISCIPULADO',
      accent: 'bg-sky-500',
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
    },
    {
      title: 'Pausados',
      value: stats.pausado,
      icon: PauseCircle,
      href: '/acolhimento?status=PAUSADO',
      accent: 'bg-slate-400',
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-500',
    },
    {
      title: 'Concluídos',
      value: stats.concluido,
      icon: CheckCircle2,
      href: '/pos-discipulado',
      accent: 'bg-emerald-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
  ]

  const hasAlerts =
    stats.sem_responsavel > 0 ||
    stats.sem_matricula > 0 ||
    stats.baixa_frequencia > 0 ||
    stats.sem_contato_recente > 0

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Painel</h1>
        <p className="mt-1 text-sm text-gray-500">Visão geral do discipulado da congregação</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-8 md:mb-10">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Ações recomendadas
        </h2>
        {!hasAlerts ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-emerald-800">Nenhuma ação urgente. Tudo certo!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AlertCard
              title="sem responsável atribuído"
              count={stats.sem_responsavel}
              icon={UserX}
              href="/acolhimento?filter=sem_responsavel"
              description="Cases ativos sem discipulador atribuído."
              severity="warning"
            />
            <AlertCard
              title="pendentes de matrícula"
              count={stats.sem_matricula}
              icon={AlertTriangle}
              href="/acolhimento?status=PENDENTE_MATRICULA"
              description="Discipulandos acolhidos ainda sem turma."
              severity="warning"
            />
            <AlertCard
              title="com baixa frequência (abaixo de 75%)"
              count={stats.baixa_frequencia}
              icon={TrendingDown}
              href="/acolhimento?filter=baixa_frequencia"
              description="Discipulandos em risco de não cumprir o requisito mínimo."
              severity="danger"
            />
            <AlertCard
              title="sem contato nos últimos 30 dias"
              count={stats.sem_contato_recente}
              icon={PhoneOff}
              href="/acolhimento?filter=sem_contato"
              description="Verifique se esses discipulandos precisam de atenção."
              severity="warning"
            />
          </div>
        )}
      </div>
    </div>
  )
}
