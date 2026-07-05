import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/repositories/profiles'
import { getDashboardStats } from '@/lib/repositories/cases'
import { Card, CardContent } from '@/components/ui/card'
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
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  href?: string
  color?: string
}

function StatCard({ title, value, icon: Icon, href, color = 'text-blue-600' }: StatCardProps) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`rounded-xl bg-gray-50 p-3 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
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
  const classes = severity === 'danger'
    ? 'border-red-200 bg-red-50'
    : 'border-yellow-200 bg-yellow-50'
  const iconColor = severity === 'danger' ? 'text-red-600' : 'text-yellow-600'
  return (
    <Link href={href}>
      <div className={`flex items-start gap-3 rounded-lg border p-4 hover:shadow-sm transition-shadow ${classes}`}>
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
        <div>
          <p className="font-medium text-gray-900">
            {count} {title}
          </p>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <Badge variant={severity === 'danger' ? 'danger' : 'warning'} className="ml-auto">
          {count}
        </Badge>
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
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Painel da Plataforma</h1>
          <p className="text-sm text-gray-500 mt-1">Administração global do sistema</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-blue-800">
          <p className="font-medium">Bem-vindo, Administrador da Plataforma.</p>
          <p className="mt-2 text-sm">
            Para gerenciar uma congregação específica, acesse o menu{' '}
            <strong>Admin → Usuários</strong> para criar usuários administradores por congregação.
          </p>
        </div>
      </div>
    )
  }

  if (!profile.congregation_id) {
    redirect('/login')
  }

  const congregationId = profile.congregation_id
  const [stats] = await Promise.all([getDashboardStats(congregationId)])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Painel</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral do discipulado da congregação</p>
      </div>

      {/* Indicadores principais */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-8">
        <StatCard
          title="Acolhimento"
          value={stats.acolhimento}
          icon={UserCheck}
          href="/acolhimento"
          color="text-indigo-600"
        />
        <StatCard
          title="Pend. Matrícula"
          value={stats.pendente_matricula}
          icon={Users}
          href="/acolhimento?status=PENDENTE_MATRICULA"
          color="text-yellow-600"
        />
        <StatCard
          title="Em Discipulado"
          value={stats.em_discipulado}
          icon={BookOpen}
          href="/acolhimento?status=EM_DISCIPULADO"
          color="text-blue-600"
        />
        <StatCard
          title="Pausados"
          value={stats.pausado}
          icon={PauseCircle}
          href="/acolhimento?status=PAUSADO"
          color="text-gray-500"
        />
        <StatCard
          title="Concluídos"
          value={stats.concluido}
          icon={CheckCircle2}
          href="/pos-discipulado"
          color="text-green-600"
        />
      </div>

      {/* Alertas / riscos */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Ações recomendadas</h2>
        {stats.sem_responsavel === 0 &&
          stats.sem_matricula === 0 &&
          stats.baixa_frequencia === 0 &&
          stats.sem_contato_recente === 0 ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Nenhuma ação urgente pendente. Tudo certo!
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
              title="com baixa frequência (<75%)"
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
